# Sample data for Kvasir (Tabulas)

JSON-LD payloads for the **Kvasir Changes API** — Tabulas allergen profiles for the demo pod user **alice**.

## Files

| File | Description |
|------|-------------|
| **allergen-profile-alice-example.jsonld** | Short example: one `tabulas:AllergenProfile` with 2 allergies (gluten, crustaceans) and 1 intolerance (lactose). |
| **allergen-profile.jsonld** | Full example: same profile with all 14 EU 1169/2011 Annex II allergens and 6 intolerances (lactose, histamine, fructose, FODMAPs, caffeine, alcohol). |

Both use:

- **Vocab:** `tabulas` → `https://tabulas.eu/vocab#`, `off` → Open Food Facts allergen URIs, `so` → Schema.org.
- **Profile ID:** `tabulas:profile/alice/allergies` (one resource per payload).

## How to ingest into Kvasir

### Option 1: Automated script (recommended)

From the repo root, with Kvasir and Keycloak running:

```bash
chmod +x scripts/ingest-allergen-profile.sh
./scripts/ingest-allergen-profile.sh
# Or with the full profile:
./scripts/ingest-allergen-profile.sh data/allergen-profile.jsonld
```

**One-time setup:** In Keycloak (http://localhost:8280, admin/admin): realm **quarkus** → **Clients** → **kvasir-ui** → **Settings** → enable **Direct access grants** and save. Ensure user **alice** has password **alice** (or set `ALICE_PASSWORD` when running the script).

### Option 2: Manual (token + curl)

1. Log in as **alice** in the UI (http://localhost:8080/_ui/) and get a Bearer token (e.g. from browser DevTools → Application/Storage).
2. POST the file to the alice pod’s Changes API:

```bash
curl -X POST http://localhost:8080/alice/changes \
  -H "Content-Type: application/ld+json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d @allergen-profile-alice-example.jsonld
```

Or with the full profile:

```bash
curl -X POST http://localhost:8080/alice/changes \
  -H "Content-Type: application/ld+json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d @allergen-profile.jsonld
```

3. After a few seconds, query in GraphiQL (http://localhost:8080/alice/query):

```graphql
{ Resource { id _types _rawRDF } }
```

You should see `https://tabulas.eu/vocab#profile/alice/allergies` and the typed graph (e.g. `tabulas:AllergenProfile`, `tabulas:AllergenEntry`, `tabulas:IntoleranceEntry`).
