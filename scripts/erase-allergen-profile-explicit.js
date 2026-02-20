#!/usr/bin/env node
/**
 * Erase the allergen profile by loading current refs then sending explicit kss:delete triples.
 * (kss:with + delete ["*"] often returns NO_MATCHES and does nothing.)
 * Requires: Keycloak 8280, Kvasir 8080, alice/alice.
 */

const KEYCLOAK = 'http://localhost:8280'
const KVASIR_QUERY = 'http://localhost:8080/alice/query'
const KVASIR_CHANGES = 'http://localhost:8080/alice/changes'
const PROFILE_ID_FULL = 'https://tabulas.eu/vocab#profile/alice/allergies'
const QUERY_CONTEXT = { tabulas: 'https://tabulas.eu/vocab#', so: 'http://schema.org/' }

async function getToken() {
  const body = new URLSearchParams({
    grant_type: 'password',
    client_id: 'kvasir-ui',
    username: 'alice',
    password: process.env.ALICE_PASSWORD || 'alice',
  })
  const r = await fetch(`${KEYCLOAK}/realms/quarkus/protocol/openid-connect/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  if (!r.ok) throw new Error(`Token failed: ${await r.text()}`)
  const data = await r.json()
  return data.access_token
}

async function runQuery(token, query) {
  const r = await fetch(KVASIR_QUERY, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ '@context': QUERY_CONTEXT, query }),
  })
  if (!r.ok) throw new Error(`Query failed: ${r.status} ${await r.text()}`)
  const json = await r.json()
  return json?.data?.Resource ?? []
}

function getIdFromRawRDF(node) {
  if (!node?._rawRDF) return null
  const raw = node._rawRDF
  if (raw && typeof raw === 'object' && raw['@id']) return raw['@id']
  if (typeof raw === 'string' && (raw.startsWith('http') || raw.startsWith('tabulas:'))) return raw
  return null
}

function normalizeId(id) {
  if (typeof id !== 'string') return null
  if (id.startsWith('tabulas:')) return id.replace('tabulas:', 'https://tabulas.eu/vocab#')
  return id
}

async function main() {
  console.log('Getting token...')
  const token = await getToken()

  console.log('Loading profile refs...')
  const [allergiesRaw, intolerancesRaw] = await Promise.all([
    runQuery(token, `{ Resource(id: "tabulas:profile/alice/allergies") { id _object(predicate: "tabulas:allergies") { _rawRDF } } }`),
    runQuery(token, `{ Resource(id: "tabulas:profile/alice/allergies") { id _object(predicate: "tabulas:intolerances") { _rawRDF } } }`),
  ])
  const toArray = (v) => (v == null ? [] : Array.isArray(v) ? v : [v])
  const allergyRefs = toArray(allergiesRaw?.[0]?._object).map(getIdFromRawRDF).filter(Boolean)
  const intoleranceRefs = toArray(intolerancesRaw?.[0]?._object).map(getIdFromRawRDF).filter(Boolean)

  const deletes = []
  for (const refId of allergyRefs) {
    deletes.push({ '@id': PROFILE_ID_FULL, 'tabulas:allergies': { '@id': normalizeId(refId) || refId } })
  }
  for (const refId of intoleranceRefs) {
    deletes.push({ '@id': PROFILE_ID_FULL, 'tabulas:intolerances': { '@id': normalizeId(refId) || refId } })
  }

  if (deletes.length === 0) {
    console.log('No refs found; profile is already empty.')
    return
  }
  console.log('Deleting', deletes.length, 'triples...')

  const payload = {
    '@context': {
      kss: 'https://kvasir.discover.ilabt.imec.be/vocab#',
      tabulas: 'https://tabulas.eu/vocab#',
    },
    'kss:delete': deletes,
    'kss:insert': [],
  }
  const r = await fetch(KVASIR_CHANGES, {
    method: 'POST',
    headers: { 'Content-Type': 'application/ld+json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  })
  const text = await r.text()
  if (r.status !== 201) {
    console.error('Changes failed:', r.status, text)
    process.exit(1)
  }
  console.log('Done (201). Refresh the frontend to see an empty list.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
