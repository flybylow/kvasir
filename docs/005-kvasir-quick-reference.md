# Kvasir — Quick Reference

One-pager for local monolith run and first tests.

## Start / stop

```bash
cd /path/to/kvasir-server/compose
docker compose up -d
docker compose ps
docker compose down
```

## URLs (local)

| Service    | URL                          |
|-----------|------------------------------|
| Pod alice | http://localhost:8080/alice  |
| UI        | http://localhost:8080/_ui/   |
| GraphQL   | http://localhost:8080/alice/query (or via UI) |
| Keycloak  | http://localhost:8280/       |

## Credentials

| Role    | User   | Password |
|---------|--------|----------|
| Demo pod (alice) | alice | alice   |
| Keycloak admin   | admin | admin   |

## GraphQL (GraphiQL)

- Introspect: `{ __schema { types { name } } }`
- Root field: `Resource` (list)
- Example: `{ Resource { id _types _rawRDF } }`

## Add data (Changes API)

- Endpoint: `POST http://localhost:8080/alice/changes`
- Headers: `Content-Type: application/ld+json`, `Authorization: Bearer <token>`
- Body: JSON-LD with `@context` and `kss:insert` (and optionally `kss:delete`). Get token via UI login (DevTools → storage/token) or Keycloak.

## Troubleshooting

- **Kvasir won’t start:** Ensure Docker **host networking** is enabled (Docker Desktop → Settings → Resources → Network).
- **MinIO unhealthy:** See [002-docker-health-check-loop.md](002-docker-health-check-loop.md) (health check without curl/grep).
- **Empty GraphQL:** Add data via Changes API, then re-query after a few seconds.
