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

**One-time setup (and after any full reset):** Run `./scripts/enable-keycloak-direct-access-grants.sh` (needs curl + jq) or in Keycloak (http://localhost:8280, admin/admin): realm **quarkus** → **Clients** → **kvasir-ui** → **Settings** → enable **Direct access grants** (Resource owner password credentials) and save. Ensure user **alice** has password **alice** (or set `ALICE_PASSWORD` when running the script). Without this, the frontend login (and scripts that use password grant) will get “Client not allowed for direct access grants” and Load/Save may show 500 if the token is missing or invalid.

### Erase the profile (start fresh)

To clear the allergen profile so all checkboxes are empty:

```bash
node scripts/erase-allergen-profile-explicit.js
```

Then refresh the frontend. (This loads current refs and sends explicit deletes; the older `kss:with` + wildcard delete often does not match and leaves refs.)

### Full cleanup (wipe pod and re-enable Keycloak)

To wipe the whole pod and get a clean alice login:

```bash
./scripts/cleanup.sh
```

This runs `docker compose down -v` and `up -d` in `kvasir-server/compose`, then runs `enable-keycloak-direct-access-grants.sh`. Use `./scripts/cleanup.sh --profile` to only erase the allergen profile (no compose).

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

### Load/Save 500 or login errors

- **“Client not allowed for direct access grants”** or login fails: enable **Direct access grants** for client **kvasir-ui** in Keycloak (see One-time setup above).
- **“Load failed 500”** or **“Save failed 500”**: the UI now shows the first 500 characters of the server response. Check that you are logged in (valid token). If the message is empty or unhelpful, check Kvasir logs in `kvasir-server/compose` (e.g. `docker compose logs -f`) and Keycloak logs.
