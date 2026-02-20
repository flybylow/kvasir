# Kvasir — docs and case material

This repo holds **documentation and runthroughs** for [Kvasir](https://kvasir.pages.ilabt.imec.be/kvasir-server/) (Solid/Linked Data server from IDLab, imec/UGent), used for local onboarding and case work.

- **Kvasir source code** lives at: [gitlab.ilabt.imec.be/kvasir/kvasir-server](https://gitlab.ilabt.imec.be/kvasir/kvasir-server) (clone that separately to run the server).

## Contents

- **[data/](data/)** — Sample JSON-LD for Kvasir: Tabulas allergen profiles (alice). Ready to POST to `POST /alice/changes`. See [data/README.md](data/README.md).
- **[scripts/ingest-allergen-profile.sh](scripts/ingest-allergen-profile.sh)** — One-command ingest: gets alice token and POSTs `data/allergen-profile-alice-example.jsonld` (or another file). Requires Keycloak “Direct access grants” for client `kvasir-ui` and alice password `alice`.
- **[frontend/](frontend/)** — MVP UI: login (alice), allergens + intolerances yes/no, Load/Save. See [frontend/README.md](frontend/README.md).
- **[docs/](docs/)** — Knowledge base and step-by-step guides:
  - [004-kvasir-onboarding-complete.md](docs/004-kvasir-onboarding-complete.md) — Full onboarding (Docker, compose, credentials, GraphQL, Changes API)
  - [005-kvasir-quick-reference.md](docs/005-kvasir-quick-reference.md) — One-pager (URLs, credentials, commands)
  - [002-docker-health-check-loop.md](docs/002-docker-health-check-loop.md) — MinIO health check fix for compose
  - [README](docs/README.md) — Index of all docs and push-to-GitHub instructions

## Quick start (run Kvasir locally)

1. Clone Kvasir: `git clone https://gitlab.ilabt.imec.be/kvasir/kvasir-server.git`
2. Enable **Docker host networking** (Docker Desktop → Settings → Resources → Network).
3. Start: `cd kvasir-server/compose && docker compose up -d`
4. Open UI: http://localhost:8080/_ui/ — log in as **alice** / **alice**

Details and troubleshooting: see [docs/004-kvasir-onboarding-complete.md](docs/004-kvasir-onboarding-complete.md) and [docs/005-kvasir-quick-reference.md](docs/005-kvasir-quick-reference.md).
