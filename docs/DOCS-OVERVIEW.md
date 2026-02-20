# Docs Folder — Detailed Overview

**For:** Someone new to the project or to the concepts (Solid, Linked Data, triples, Kvasir).  
**Goal:** One place that explains what we’ve learned, how the docs are organized, and how it all fits together.

---

## 1. What This Folder Is

The **`docs/`** folder is a **knowledge base**: every time we hit a problem and solve it, we add a file here. That way we don’t repeat the same mistakes or get stuck in the same loops.

- **Rule #1:** *Always keep the wood clean.* Document what we learn; keep the project and docs tidy.
- **Structure:** Numbered files (`001-...`, `002-...`) for each problem/solution; this overview ties them together and explains the concepts.

---

## 2. Core Concepts (Start Here If You’re New)

### 2.1 Triples and the Knowledge Graph

**Triple** = one fact in the form:

- **Subject** — *what* we’re talking about (e.g. “Alice’s allergen profile”)
- **Predicate** — *property or relationship* (e.g. “has allergy”)
- **Object** — *value or target* (e.g. “gluten”)

Example in words:

- *“Alice’s profile” — “has allergy” — “gluten”*

In Kvasir these are stored as **RDF triples** (Resource Description Framework). The server stores a **Knowledge Graph**: many triples that form a graph of resources and relationships.

- **Subject** and **object** can be resources (identified by IRIs, e.g. `https://tabulas.eu/vocab#profile/alice/allergies`).
- **Object** can also be a **literal** (e.g. the string `"gluten"`).

When we **insert** JSON-LD via the Changes API, Kvasir turns it into triples. When we **query** with GraphQL, we’re reading back those triples (as `Resource` with fields like `_predicates`, `_object`, `_rawRDF`).

### 2.2 JSON-LD and @context

**JSON-LD** is JSON that encodes Linked Data. Keys and values can be short names that expand to full IRIs using **`@context`**.

Example:

```json
{
  "@context": { "tabulas": "https://tabulas.eu/vocab#" },
  "@id": "tabulas:profile/alice/allergies",
  "@type": "tabulas:AllergenProfile",
  "tabulas:allergenCode": "gluten"
}
```

- **`@context`** maps `tabulas` → `https://tabulas.eu/vocab#`.
- **`tabulas:allergenCode`** becomes the full IRI for the predicate.
- The server stores this as triples; e.g. subject = profile, predicate = allergenCode, object = `"gluten"`.

**Why it matters here:** Kvasir’s GraphQL and Changes API expect **`@context`** in the request body so it can resolve prefixed names (e.g. `tabulas:allergenCode`). Without it, or with full IRIs in the wrong places, queries and writes can fail or return empty. See [007](007-kvasir-graphql-changes-from-official-docs.md).

### 2.3 Solid and Pods

**Solid** (Social Linked Data) is a way to give users their own data store (“pod”) and control who can read/write it. Each user has a **pod** (e.g. `http://localhost:8080/alice`). Data in the pod is stored as Linked Data (triples / graph). Apps read and write via standard APIs (e.g. LDP, or in Kvasir, GraphQL + Changes API).

In this project we use one demo pod (**alice**) and store her **allergen profile** there: one resource (the profile) and related resources (allergy/intolerance entries) represented as triples.

### 2.4 Kvasir in One Sentence

**Kvasir** is a Solid/Linked Data server (Java/Kotlin, Quarkus) that stores data in a **Knowledge Graph** (backed by ClickHouse), exposes it via **GraphQL**, and accepts writes via the **Changes API** (JSON-LD with `kss:insert` / `kss:delete`). It uses Keycloak for auth and MinIO for object storage.

---

## 3. How the Docs Are Organized

| Number | Document | What it covers |
|--------|----------|----------------|
| — | **README.md** | Purpose of the knowledge base, Rule #1, index of all docs. |
| — | **DOCS-OVERVIEW.md** (this file) | High-level concepts (triples, JSON-LD, Solid, Kvasir) and a guided tour of the docs. |
| 001 | [001-knowledge-base-setup.md](001-knowledge-base-setup.md) | Why and how we created the `docs/` folder; process for adding new learnings. |
| 002 | [002-docker-health-check-loop.md](002-docker-health-check-loop.md) | MinIO health check loop: service was fine, health check failed; how to avoid endless “fix” loops. |
| 003 | [003-loop-prevention-strategies.md](003-loop-prevention-strategies.md) | General strategies: retry limits, when to escalate, when to check docs. |
| 004 | [004-kvasir-onboarding-complete.md](004-kvasir-onboarding-complete.md) | Full Kvasir onboarding: clone, compose, host networking, credentials, first GraphQL query, first Changes API insert. |
| 005 | [005-kvasir-quick-reference.md](005-kvasir-quick-reference.md) | One-pager: start/stop, URLs, credentials, sample GraphQL and Changes API usage. |
| 006 | [006-mvp-allergens-only.md](006-mvp-allergens-only.md) | MVP scope: allergens only; fixed list, yes/no per item; API contract (read/write) and UI flow (auto-load, autosave). |
| 007 | [007-kvasir-graphql-changes-from-official-docs.md](007-kvasir-graphql-changes-from-official-docs.md) | What the official Kvasir docs say: Querying (`@context`, `_object(predicate)`), Changes (insert/delete shape); two-query workaround and replace semantics. |
| 008 | [008-allergy-preferences-session-loops.md](008-allergy-preferences-session-loops.md) | Two loops in the allergy UI: Save/Load until we checked docs; checkbox reverting due to refetch + eventual consistency and insert-only Save. |
| 009 | [009-allergy-preferences-solution-journey.md](009-allergy-preferences-solution-journey.md) | How we got to the allergy preferences solution: form, Load (GraphQL), Save (Changes API with replace semantics), update of the pod; end-to-end flow and takeaways. |

Other files:

- **PUSH-TO-GITHUB.md** — How to push this `docs/` folder to GitHub.

---

## 4. What We’ve Learned (By Topic)

### 4.1 Knowledge Base and Loops

- **001** — We document every learning in a numbered file so we don’t repeat mistakes.
- **002** — If a *diagnostic* fails (e.g. health check) but the *service* works, fix the diagnostic or simplify it; don’t assume the service is broken and loop forever.
- **003** — Set retry limits (e.g. 2–3 attempts), verify assumptions, and escalate to the user or to official docs when stuck.

### 4.2 Running Kvasir Locally

- **004** — Full path: Docker Desktop + host networking, clone repo, `compose` up; MinIO may need a health-check fix (see 002); first GraphQL query and first Changes API insert with Bearer token.
- **005** — Quick reference for URLs, credentials, and copy-paste commands.

### 4.3 Triples, Graph, and API Behaviour

- Data in Kvasir is stored as **triples** in a Knowledge Graph. JSON-LD in the Changes API is turned into triples; GraphQL reads them back.
- **Replace vs insert:** If we only **insert** new triples and never delete old ones, the graph *accumulates* (e.g. old allergen entries stay). For a “current set” (e.g. “my allergies today”), we need **replace semantics**: delete the relevant triples for that resource, then insert the new set. See **007** (replace with `kss:with` + `kss:delete` + `kss:insert`) and **008** (why insert-only made checkboxes “come back”).
- **007** — Official docs: send **`@context`** in the GraphQL request; use **`_object(predicate: "prefix:localName")`** to read literal values; **one `_object` per predicate per query** (run two queries and merge if you need two predicates); delete in Changes API requires subject + predicate (not just `@id`).

### 4.4 Allergen MVP (Front End and API)

- **006** — One profile resource per user (`tabulas:profile/alice/allergies`); fixed list of EU 14 allergens + intolerances; UI = yes/no per item; read via GraphQL, write via Changes API; auto-load on login, autosave on change.
- **008** — Save/Load only worked after we followed the official docs (`@context`, prefixed `_object`, two queries). Checkbox revert was caused by (1) post-save refetch overwriting local state with stale (eventually consistent) data, and (2) insert-only Save so the graph kept old triples. Fixes: remove automatic refetch after save; use replace semantics so each save replaces the profile’s triples.

### 4.5 Pitfalls to Avoid

- **Don’t loop without checking docs:** For Kvasir, check [official Querying and Changes docs](https://kvasir.pages.ilabt.imec.be/kvasir-server/) before trying many code variants.
- **Don’t overwrite UI with stale refetch:** With eventual consistency, a refetch right after save can return old data; don’t blindly overwrite local state (see 008).
- **Don’t assume a failing health check means a broken service:** Verify the service directly (e.g. `curl` to the port) before spending time on the health check (see 002).

---

## 5. Reading Paths (Suggested)

**Just getting started with the project:**

1. This file (DOCS-OVERVIEW.md) — concepts and map of the docs.
2. [005-kvasir-quick-reference.md](005-kvasir-quick-reference.md) — run Kvasir and try GraphQL + Changes once.
3. [004-kvasir-onboarding-complete.md](004-kvasir-onboarding-complete.md) — if you want the full story and troubleshooting (e.g. MinIO, host networking).

**Building or fixing the allergen front end:**

1. [006-mvp-allergens-only.md](006-mvp-allergens-only.md) — scope and API contract.
2. [009-allergy-preferences-solution-journey.md](009-allergy-preferences-solution-journey.md) — how we got to the solution: form, Load, Save, update of the pod (narrative).
3. [007-kvasir-graphql-changes-from-official-docs.md](007-kvasir-graphql-changes-from-official-docs.md) — how Load (GraphQL) and Save (Changes) really work.
4. [008-allergy-preferences-session-loops.md](008-allergy-preferences-session-loops.md) — what went wrong (Save/Load, checkbox revert) and how we fixed it.

**When something goes wrong or feels “stuck”:**

1. [003-loop-prevention-strategies.md](003-loop-prevention-strategies.md) — retry limits, when to escalate.
2. [002-docker-health-check-loop.md](002-docker-health-check-loop.md) — if Docker/Compose or a health check is the issue.
3. Official Kvasir docs (Querying, Changes) — always confirm API behaviour there before coding more fixes.

---

## 6. Glossary

| Term | Meaning |
|------|--------|
| **Triple** | One fact: subject – predicate – object (e.g. profile – has allergy – gluten). |
| **RDF** | Resource Description Framework; standard way to represent triples/Linked Data. |
| **Knowledge Graph** | Set of triples forming a graph of resources and relationships; Kvasir stores this in ClickHouse. |
| **JSON-LD** | JSON format for Linked Data; uses `@context` to map short names to IRIs. |
| **@context** | Part of JSON-LD that defines prefixes (e.g. `tabulas` → `https://tabulas.eu/vocab#`). Required in Kvasir requests so the server can resolve predicates. |
| **Pod** | User’s personal data store in Solid (e.g. `http://localhost:8080/alice`). |
| **Changes API** | Kvasir endpoint to write data: POST JSON-LD with `kss:insert` and optionally `kss:delete`. |
| **Replace semantics** | When saving a “current set”, delete the old triples for that resource then insert the new set (instead of only inserting, which accumulates). |
| **Eventual consistency** | After a write, the server may need a short time before reads see the update; refetching too soon can return stale data. |

---

## 7. Rule #1 and Keeping the Structure Clean

- **Always keep the wood clean:** Document every important learning; don’t leave knowledge only in chat or code.
- **One concept or problem per doc:** Use the numbered files (001, 002, …) for a single theme or incident; keep each file focused.
- **Link between docs:** Use relative links (e.g. `[007](007-kvasir-graphql-changes-from-official-docs.md)`) so the overview and README act as a map; avoid duplicating long explanations.
- **Update the index:** When adding a new doc, add a line to [README.md](README.md) in the “Documented Issues” section and, if relevant, to this overview’s table and reading paths.

This overview is the main entry point for “what we’ve learned and where it’s written down.” Keep it accurate as the knowledge base grows.
