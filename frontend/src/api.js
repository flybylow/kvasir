import {
  KVASIR_QUERY_URL,
  KVASIR_CHANGES_URL,
  KEYCLOAK_TOKEN_URL,
  ALLERGENS,
  INTOLERANCES,
} from './constants'

export async function getToken(username, password) {
  const body = new URLSearchParams({
    grant_type: 'password',
    client_id: 'kvasir-ui',
    username,
    password,
  })
  const r = await fetch(KEYCLOAK_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  if (!r.ok) {
    const t = await r.text()
    let msg = t || `Login failed ${r.status}`
    try {
      const err = JSON.parse(t)
      if (err.error === 'unauthorized_client' || (err.error_description || '').includes('direct access grants')) {
        msg = 'Keycloak: enable Direct access grants for client kvasir-ui (realm quarkus). Use alice / alice for the Kvasir demo pod.'
      } else if (err.error === 'invalid_grant' || (err.error_description || '').toLowerCase().includes('invalid user credentials')) {
        msg = 'Invalid username or password. For the Kvasir demo pod use alice / alice. If that fails, run: ./scripts/enable-keycloak-direct-access-grants.sh (creates/resets alice in Keycloak).'
      }
    } catch (_) {}
    throw new Error(msg)
  }
  const data = await r.json()
  return data.access_token
}

// Per Kvasir docs: request body may contain @context; _object(predicate: "prefix:localName") uses that context.
// Limitation: only one _object(predicate: ...) per query returns data; two different predicates => empty. So we run two queries.
const QUERY_CONTEXT = {
  tabulas: 'https://tabulas.eu/vocab#',
  so: 'http://schema.org/',
}

export const PROFILE_ID = 'tabulas:profile/alice/allergies'

async function runQuery(token, query) {
  const r = await fetch(KVASIR_QUERY_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ '@context': QUERY_CONTEXT, query }),
  })
  const text = await r.text()
  if (!r.ok) {
    const msg = text || r.statusText
    throw new Error(`Load failed ${r.status}${msg ? ': ' + msg.trim().slice(0, 500) : ''}`)
  }
  const json = text ? JSON.parse(text) : {}
  return json?.data?.Resource ?? []
}

// Normalize an IRI for comparison (curie or full form -> same key)
function normalizeId(id) {
  if (typeof id !== 'string') return null
  if (id.startsWith('tabulas:')) return id.replace('tabulas:', 'https://tabulas.eu/vocab#')
  return id
}

// Extract @id from _rawRDF (object or string)
function getIdFromRawRDF(node) {
  if (!node?._rawRDF) return null
  const raw = node._rawRDF
  if (raw && typeof raw === 'object' && raw['@id']) return raw['@id']
  if (typeof raw === 'string' && (raw.startsWith('http') || raw.startsWith('tabulas:'))) return raw
  return null
}

export async function loadProfile(token) {
  // 1) Get profile's referenced entry IDs
  const [profileAllergiesRaw, profileIntolerancesRaw] = await Promise.all([
    runQuery(token, `{ Resource(id: "${PROFILE_ID}") { id _object(predicate: "tabulas:allergies") { _rawRDF } } }`),
    runQuery(token, `{ Resource(id: "${PROFILE_ID}") { id _object(predicate: "tabulas:intolerances") { _rawRDF } } }`),
  ])

  const allergies = new Set()
  const intolerances = new Set()
  const normalizeAllergenCode = (code) => (code === 'egg' ? 'eggs' : code)

  // Filter profile refs to only canonical IDs (our pattern)
  const canonicalIdPrefix = 'https://tabulas.eu/vocab#profile/alice/allergies#'
  const canonicalIdPrefixCurie = 'tabulas:profile/alice/allergies#'
  const profileAllergyIds = []
  const profileIntoleranceIds = []
  // _object may be array or single object depending on API
  const toArray = (v) => (v == null ? [] : Array.isArray(v) ? v : [v])
  const profileAllergiesObj = toArray(profileAllergiesRaw?.[0]?._object)
  const profileIntolerancesObj = toArray(profileIntolerancesRaw?.[0]?._object)

  // Track ALL refs (canonical and skolemized) - we'll filter by matching entries later
  if (profileAllergiesObj.length) {
    profileAllergiesObj.forEach((node) => {
      const refId = getIdFromRawRDF(node)
      if (refId) profileAllergyIds.push(refId)
    })
  }
  if (profileIntolerancesObj.length) {
    profileIntolerancesObj.forEach((node) => {
      const refId = getIdFromRawRDF(node)
      if (refId) profileIntoleranceIds.push(refId)
    })
  }

  // Get code for each profile ref by querying that resource (bulk query is paginated and misses many entries)
  const safeId = (s) => (s && typeof s === 'string' ? s.replace(/\\/g, '\\\\').replace(/"/g, '\\"') : '')
  const BATCH = 15
  for (let i = 0; i < profileAllergyIds.length; i += BATCH) {
    const batch = profileAllergyIds.slice(i, i + BATCH)
    const results = await Promise.all(
      batch.map((refId) =>
        runQuery(token, `{ Resource(id: "${safeId(refId)}") { id _object(predicate: "tabulas:allergenCode") { _rawRDF } } }`)
      )
    )
    for (const rows of results) {
      const entry = rows?.[0]
      if (!entry) continue
      const code = getValueFromRawRDF(toArray(entry._object))
      if (code) allergies.add(normalizeAllergenCode(code))
    }
  }
  for (let i = 0; i < profileIntoleranceIds.length; i += BATCH) {
    const batch = profileIntoleranceIds.slice(i, i + BATCH)
    const results = await Promise.all(
      batch.map((refId) =>
        runQuery(token, `{ Resource(id: "${safeId(refId)}") { id _object(predicate: "tabulas:intoleranceCode") { _rawRDF } } }`)
      )
    )
    for (const rows of results) {
      const entry = rows?.[0]
      if (!entry) continue
      const code = getValueFromRawRDF(toArray(entry._object))
      if (code) intolerances.add(code)
    }
  }

  return {
    allergies: Array.from(allergies).sort(),
    intolerances: Array.from(intolerances).sort(),
  }
}

function getValueFromRawRDF(field) {
  if (!field || !Array.isArray(field)) return null
  const first = field[0]
  if (!first?._rawRDF) return null
  const raw = first._rawRDF
  if (raw && typeof raw === 'object' && '@value' in raw) return raw['@value']
  if (typeof raw === 'string') return raw
  return null
}

/**
 * Build Changes API payload: replace whole profile every time.
 * kss:with selects the profile, kss:delete: ["*"] wipes it, kss:insert puts back one profile with current selection.
 * No ref tracking, no per-ref deletes — one simple replace.
 */
export function buildChangesPayload(profile) {
  const context = {
    kss: 'https://kvasir.discover.ilabt.imec.be/vocab#',
    so: 'http://schema.org/',
    off: 'https://world.openfoodfacts.org/allergen/',
    tabulas: 'https://tabulas.eu/vocab#',
  }
  const allergyList = profile.allergies || []
  const intoleranceList = profile.intolerances || []

  const allergyEntries = allergyList.map((code) => {
    const item = ALLERGENS.find((a) => a.code === code)
    return {
      '@id': `${PROFILE_ID}#allergy-${code}`,
      '@type': 'tabulas:AllergenEntry',
      'tabulas:allergenCode': code,
      'so:name': item?.name ?? code,
      'tabulas:allergenURI': `off:en:${code}`,
      'tabulas:severity': 'allergy',
    }
  })
  const intoleranceEntries = intoleranceList.map((code) => {
    const item = INTOLERANCES.find((i) => i.code === code)
    return {
      '@id': `${PROFILE_ID}#intolerance-${code}`,
      '@type': 'tabulas:IntoleranceEntry',
      'tabulas:intoleranceCode': code,
      'so:name': item?.name ?? code,
      'tabulas:severity': 'intolerance',
    }
  })

  return {
    '@context': context,
    'kss:with': `{ Resource(id: "${PROFILE_ID}") { id } }`,
    'kss:delete': ['*'],
    'kss:insert': [
      {
        '@id': PROFILE_ID,
        '@type': 'tabulas:AllergenProfile',
        'so:name': 'My Allergen Profile',
        'so:dateModified': new Date().toISOString().slice(0, 10),
        'tabulas:allergies': allergyEntries,
        'tabulas:intolerances': intoleranceEntries,
      },
    ],
  }
}

export async function saveProfile(token, profile) {
  const body = buildChangesPayload(profile)
  const r = await fetch(KVASIR_CHANGES_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/ld+json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  })
  const text = await r.text()
  console.log('Save response status:', r.status)
  console.log('Save response headers:', Object.fromEntries(r.headers.entries()))
  console.log('Save response body:', text)
  if (r.status !== 201) {
    console.error('Save failed:', r.status, text)
    console.error('Request body:', JSON.stringify(body, null, 2))
    throw new Error(`Save failed ${r.status}: ${text || r.statusText}`)
  }
  // Check for Location header which points to the change request resource
  const location = r.headers.get('Location')
  if (location) {
    console.log('Change request location:', location)
    // Wait a moment then check status and records to see what was actually inserted
    setTimeout(async () => {
      try {
        const statusResponse = await fetch(location, {
          headers: {
            'Accept': 'application/ld+json',
            'Authorization': `Bearer ${token}`,
          },
        })
        if (statusResponse.ok) {
          const statusData = await statusResponse.json()
          const entries = statusData['kss:statusEntry'] || statusData['statusEntry'] || []
          const lastEntry = Array.isArray(entries) && entries.length ? entries[entries.length - 1] : null
          const resultCode = statusData['kss:resultCode'] || statusData['resultCode'] ||
            (lastEntry && (lastEntry['kss:statusCode'] ?? lastEntry.statusCode))
          const errorMessage = statusData['kss:errorMessage'] || statusData['errorMessage']
          const nrOfInserts = statusData['kss:nrOfInserts'] || statusData['nrOfInserts']
          if (errorMessage) {
            console.error('❌ Change request error:', errorMessage)
          } else if (resultCode === 'COMMITTED' || nrOfInserts != null) {
            console.log('✓ Saved successfully,', nrOfInserts, 'resources inserted')
            // Note: /records endpoint not called due to server limitation with # in resource IDs
          }
        }
      } catch (err) {
        console.warn('Could not check change request status:', err)
      }
    }, 1000) // Wait 1 second for eventual consistency
  }
  return { ok: true, status: r.status, location }
}
