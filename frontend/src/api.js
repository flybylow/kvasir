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
    throw new Error(t || `Login failed ${r.status}`)
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

const PROFILE_ID = 'tabulas:profile/alice/allergies'

async function runQuery(token, query) {
  const r = await fetch(KVASIR_QUERY_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ '@context': QUERY_CONTEXT, query }),
  })
  if (!r.ok) throw new Error(`Load failed ${r.status}`)
  const json = await r.json()
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

  if (profileAllergiesObj.length) {
    profileAllergiesObj.forEach((node) => {
      const refId = getIdFromRawRDF(node)
      if (!refId) return
      const normalized = normalizeId(refId)
      // Only consider canonical IDs (our pattern) - ignore skolemized refs
      if (normalized && (normalized.startsWith(canonicalIdPrefix) || refId.startsWith(canonicalIdPrefixCurie))) {
        profileAllergyIds.push(refId) // Keep original format for query
      }
    })
  }
  if (profileIntolerancesObj.length) {
    profileIntolerancesObj.forEach((node) => {
      const refId = getIdFromRawRDF(node)
      if (!refId) return
      const normalized = normalizeId(refId)
      if (normalized && (normalized.startsWith(canonicalIdPrefix) || refId.startsWith(canonicalIdPrefixCurie))) {
        profileIntoleranceIds.push(refId)
      }
    })
  }

  // 2) Single bulk query for entries (faster than N individual queries)
  const profileAllergyIdSet = new Set(profileAllergyIds.map(normalizeId))
  const profileIntoleranceIdSet = new Set(profileIntoleranceIds.map(normalizeId))
  const [allAllergyEntries, allIntoleranceEntries] = await Promise.all([
    runQuery(token, '{ Resource { id _object(predicate: "tabulas:allergenCode") { _rawRDF } } }'),
    runQuery(token, '{ Resource { id _object(predicate: "tabulas:intoleranceCode") { _rawRDF } } }'),
  ])
  const matchedAllergyIds = new Set()
  const matchedIntoleranceIds = new Set()
  for (const res of allAllergyEntries) {
    const id = Array.isArray(res.id) ? res.id[0] : res.id
    const nid = normalizeId(id)
    if (!profileAllergyIdSet.has(nid)) continue
    matchedAllergyIds.add(nid)
    const code = getValueFromRawRDF(res._object)
    if (code) allergies.add(normalizeAllergenCode(code))
  }
  for (const res of allIntoleranceEntries) {
    const id = Array.isArray(res.id) ? res.id[0] : res.id
    const nid = normalizeId(id)
    if (!profileIntoleranceIdSet.has(nid)) continue
    matchedIntoleranceIds.add(nid)
    const code = getValueFromRawRDF(res._object)
    if (code) intolerances.add(code)
  }
  // Fallback: fetch any canonical ref not found in bulk result (ordering/limits/eventual consistency)
  const safeId = (s) => (s && typeof s === 'string' ? s.replace(/\\/g, '\\\\').replace(/"/g, '\\"') : '')
  for (const refId of profileAllergyIds) {
    if (matchedAllergyIds.has(normalizeId(refId))) continue
    try {
      const [entry] = await runQuery(token, `{ Resource(id: "${safeId(refId)}") { id _object(predicate: "tabulas:allergenCode") { _rawRDF } } }`)
      if (entry) {
        const code = getValueFromRawRDF(toArray(entry._object))
        if (code) allergies.add(normalizeAllergenCode(code))
      }
    } catch (_) { /* ignore */ }
  }
  for (const refId of profileIntoleranceIds) {
    if (matchedIntoleranceIds.has(normalizeId(refId))) continue
    try {
      const [entry] = await runQuery(token, `{ Resource(id: "${safeId(refId)}") { id _object(predicate: "tabulas:intoleranceCode") { _rawRDF } } }`)
      if (entry) {
        const code = getValueFromRawRDF(toArray(entry._object))
        if (code) intolerances.add(code)
      }
    } catch (_) { /* ignore */ }
  }

  const loadedAllergies = Array.from(allergies).sort()
  const loadedIntolerances = Array.from(intolerances).sort()
  console.log('  📥 Loaded codes:', { allergies: loadedAllergies, intolerances: loadedIntolerances })

  return {
    allergies: loadedAllergies,
    intolerances: loadedIntolerances,
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
 * Build kss:insert payload for save.
 * Order: entry resources first (each with @id tabulas:profile/alice/allergies#allergy-{code} or #intolerance-{code}), then the profile resource that references them.
 * Only the current selection is sent; save is insert-only so the server accumulates refs. Load filters to canonical IDs and deduplicates by code.
 */
export function buildChangesPayload(profile) {
  console.log('🟢 BUILD payload for save:')
  console.log('  Profile codes:', { allergies: profile.allergies, intolerances: profile.intolerances })
  const context = {
    kss: 'https://kvasir.discover.ilabt.imec.be/vocab#',
    so: 'http://schema.org/',
    off: 'https://world.openfoodfacts.org/allergen/',
    tabulas: 'https://tabulas.eu/vocab#',
  }
  const allergies = (profile.allergies || []).map((code) => {
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
  const intolerances = (profile.intolerances || []).map((code) => {
    const item = INTOLERANCES.find((i) => i.code === code)
    return {
      '@id': `${PROFILE_ID}#intolerance-${code}`,
      '@type': 'tabulas:IntoleranceEntry',
      'tabulas:intoleranceCode': code,
      'so:name': item?.name ?? code,
      'tabulas:severity': 'intolerance',
    }
  })
  
  // Simple insert-only: profile accumulates refs, but load filters to canonical IDs and deduplicates by code
  const payload = {
    '@context': context,
    'kss:insert': [
      // Entries as top-level resources FIRST (so @id is preserved)
      ...allergies,
      ...intolerances,
      // Profile references entries by @id (JSON-LD will link them)
      {
        '@id': PROFILE_ID,
        '@type': 'tabulas:AllergenProfile',
        'so:name': 'My Allergen Profile',
        'so:dateModified': new Date().toISOString().slice(0, 10),
        'tabulas:allergies': allergies.map(a => ({ '@id': a['@id'] })),
        'tabulas:intolerances': intolerances.map(i => ({ '@id': i['@id'] })),
      },
    ],
  }
  return payload
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
