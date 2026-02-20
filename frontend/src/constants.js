// EU 1169/2011 Annex II + common intolerances. Code matches Kvasir payload (allergenCode / intoleranceCode).
export const ALLERGENS = [
  { code: 'gluten', name: 'Cereals containing gluten' },
  { code: 'crustaceans', name: 'Crustaceans' },
  { code: 'eggs', name: 'Eggs' },
  { code: 'fish', name: 'Fish' },
  { code: 'peanuts', name: 'Peanuts' },
  { code: 'soybeans', name: 'Soybeans' },
  { code: 'milk', name: 'Milk' },
  { code: 'tree-nuts', name: 'Tree nuts' },
  { code: 'celery', name: 'Celery' },
  { code: 'mustard', name: 'Mustard' },
  { code: 'sesame', name: 'Sesame seeds' },
  { code: 'sulphites', name: 'Sulphur dioxide and sulphites' },
  { code: 'lupin', name: 'Lupin' },
  { code: 'molluscs', name: 'Molluscs' },
]

export const INTOLERANCES = [
  { code: 'lactose', name: 'Lactose' },
  { code: 'histamine', name: 'Histamine' },
  { code: 'fructose', name: 'Fructose' },
  { code: 'fodmaps', name: 'FODMAPs' },
  { code: 'caffeine', name: 'Caffeine' },
  { code: 'alcohol', name: 'Alcohol' },
]

const KVASIR = import.meta.env.VITE_KVASIR_URL || '/api-kvasir'
const KEYCLOAK = import.meta.env.VITE_KEYCLOAK_URL || '/api-keycloak'

export const KVASIR_QUERY_URL = `${KVASIR}/alice/query`
export const KVASIR_CHANGES_URL = `${KVASIR}/alice/changes`
export const KEYCLOAK_TOKEN_URL = `${KEYCLOAK}/realms/quarkus/protocol/openid-connect/token`
export const PROFILE_ID = 'https://tabulas.eu/vocab#profile/alice/allergies'
