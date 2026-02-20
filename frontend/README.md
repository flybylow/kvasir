# Tabulas allergens MVP — frontend

Minimal UI: log in (alice), list of allergens and intolerances with **yes/no** (checkboxes), **Load** and **Save** against Kvasir.

## Prerequisites

- Kvasir running at `http://localhost:8080` (e.g. `cd kvasir-server/compose && docker compose up -d`)
- Keycloak with **Direct access grants** enabled for client `kvasir-ui` (realm `quarkus`), and user **alice** with password **alice**

## Run

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. Log in with **alice** / **alice**, click **Load my profile**, then change checkboxes and **Save**.

## What it does

- **Login:** Gets a Bearer token from Keycloak (password grant), stores in session.
- **Load:** POSTs GraphQL `{ Resource { id _types _predicates } }` to `/alice/query`, finds AllergenEntry/IntoleranceEntry resources and their codes, sets checkboxes.
- **Save:** Builds JSON-LD with `kss:insert` (one AllergenProfile with allergies + intolerances lists) and POSTs to `/alice/changes`.

Proxy in `vite.config.js` forwards `/api-kvasir` → `http://localhost:8080` and `/api-keycloak` → `http://localhost:8280` to avoid CORS.
