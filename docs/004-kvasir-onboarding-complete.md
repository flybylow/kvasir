# Kvasir Solid Server — Developer Onboarding (Complete Runthrough)

**Status:** Done (first successful run)  
**Date:** 2026-02-19  
**Audience:** New developer, Docker experience optional  
**Goal:** Get Kvasir running locally in monolith mode, then store and query your first Linked Data resource.

---

## 1. What Is Kvasir?

Kvasir is a production-grade Solid/Linked Data server from IDLab (imec/UGent). It replaces experimental stacks like Community Solid Server (CSS) with:

- **Java/Kotlin (Quarkus)** — monolith or Kubernetes microservices
- **ClickHouse** — structured/knowledge-graph data
- **MinIO** — S3-compatible object storage (documents, binaries)
- **Kafka (Redpanda)** — event streaming
- **Keycloak** — OIDC auth; **OpenFGA** — ReBAC authorization
- **GraphQL** — query layer over the RDF Knowledge Graph

Official docs: [Kvasir Documentation](https://kvasir.pages.ilabt.imec.be/kvasir-server/).  
Source: `https://gitlab.ilabt.imec.be/kvasir/kvasir-server` (Apache 2.0).

---

## 2. Prerequisites

- **Docker Desktop** — [docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop/)
- **Enable host networking** — Docker Desktop → Settings → Resources → Network → **Enable host networking** (required for compose)
- **Git** — to clone the repo

Verify:

```bash
docker --version
docker compose version
```

---

## 3. Clone and Start (Monolith Mode)

```bash
git clone https://gitlab.ilabt.imec.be/kvasir/kvasir-server.git
cd kvasir-server/compose
docker compose up -d
```

First run pulls images (slow); later runs are fast.

**If MinIO never becomes healthy** and Kvasir won’t start: the stock MinIO image has no `curl`/`grep`, so the default health check fails. See [002-docker-health-check-loop.md](002-docker-health-check-loop.md) for the fix we applied in `compose.devservices.yml` (shell-based HTTP check without curl/grep).

**Check status:**

```bash
docker compose ps
```

All services (including `kvasir`) should be up; `minio` should be **healthy**.

---

## 4. Key URLs and Credentials

| What | URL |
|------|-----|
| Demo pod (alice) | http://localhost:8080/alice |
| Kvasir UI | http://localhost:8080/_ui/ |
| GraphQL (GraphiQL) | Via UI or http://localhost:8080/alice/query |
| Keycloak login | http://localhost:8280/ |
| Keycloak admin | http://localhost:8280/ (admin / admin) |

**Demo user (for UI and API):**

- **Username:** `alice`  
- **Password:** `alice`  

(Default user for pod `alice` is created at bootstrap; credentials are `podname:podname`.)

---

## 5. First GraphQL Check (Empty Pod)

1. Open **http://localhost:8080/_ui/** and log in as **alice** / **alice**.
2. Open the **GraphQL** / GraphiQL interface (linked from the UI).
3. Introspect schema:

```graphql
{ __schema { types { name } } }
```

4. Inspect root and `Resource`:

```graphql
{ __type(name: "Query") { name fields { name type { name kind } } } }
{ __type(name: "Resource") { name fields { name type { name kind } } } }
```

5. Query resources (initially empty):

```graphql
{ Resource { id } }
```

Result: `"Resource": []` until you add data.

---

## 6. Adding Data (Changes API)

The pod’s Knowledge Graph is updated via the **Changes API**. You must send an **Authorization: Bearer &lt;token&gt;** header (e.g. the token you get after logging in as alice in the UI).

**Option A — Token from browser**  
After logging into the UI as alice, open DevTools → Application/Storage, find the OIDC/Keycloak token (e.g. `access_token` or similar) and copy it.

**Option B — curl with token**  
Replace `YOUR_TOKEN` with the access token:

```bash
curl -X POST http://localhost:8080/alice/changes \
  -H "Content-Type: application/ld+json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
  "@context": {
    "kss": "https://kvasir.discover.ilabt.imec.be/vocab#",
    "so": "http://schema.org/",
    "ex": "http://example.org/"
  },
  "kss:insert": [
    {
      "@id": "ex:alice",
      "@type": "so:Person",
      "so:givenName": "Alice",
      "so:email": "alice@example.org"
    },
    {
      "@id": "ex:bob",
      "@type": "so:Person",
      "so:givenName": "Bob",
      "so:email": "bob@example.org"
    }
  ]
}'
```

Expect **201 Created**. Wait a few seconds (eventual consistency), then in GraphiQL run:

```graphql
{ Resource { id _types _rawRDF } }
```

You should see the new resources.

---

## 7. What We Documented for the Case

- Exact steps from zero to “data in the pod and visible via GraphQL”.
- MinIO health check fix (see [002-docker-health-check-loop.md](002-docker-health-check-loop.md)).
- Official docs requirement: **enable host networking** in Docker Desktop.
- Credentials: **alice** / **alice** for the demo pod; **admin** / **admin** for Keycloak.
- GraphQL: only root field is `Resource`; use introspection to see `Resource` fields (`id`, `_types`, `_rawRDF`, `_relations`, `_predicates`, `_object`).
- Adding data: **POST** `http://localhost:8080/alice/changes` with JSON-LD body using `kss:insert` (and optional `kss:delete`), with Bearer token.

---

## 8. Next Steps (After the Case)

- Test UMA 2.0 / OpenFGA (e.g. second user, selective access).
- Store a real DPP (Schema.org + custom vocab); test content negotiation.
- Use GraphQL for product-style queries (by GTIN, manufacturer, date).
- Integrate with a frontend (e.g. replace existing API calls with Kvasir endpoints).

---

## 9. Key Links

| Resource | URL |
|----------|-----|
| GitLab repo | https://gitlab.ilabt.imec.be/kvasir/kvasir-server |
| Official docs | https://kvasir.pages.ilabt.imec.be/kvasir-server |
| Trustflows | https://trustflows.eu/ |
| LWS (W3C) | https://www.w3.org/2024/09/linked-web-storage-wg-charter.html |
