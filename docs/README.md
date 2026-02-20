# Knowledge Base

This folder contains documentation of problems encountered and their solutions. This serves as a knowledge base to prevent repeating mistakes and getting caught in loops.

**Start here:** **[DOCS-OVERVIEW.md](DOCS-OVERVIEW.md)** — Detailed overview for someone new: concepts (triples, RDF, JSON-LD, Solid, Kvasir), how the docs are organized, what we’ve learned, reading paths, and glossary.

## Purpose

- Document problems and their solutions
- Build institutional knowledge
- Avoid repeating the same mistakes
- Keep the codebase clean and maintainable

## Structure

Each file in this folder documents:
- **Problem**: Description of the issue or challenge
- **Solution**: How it was solved
- **Context**: Relevant background information

## Rule #1: Always Keep the Wood Clean

This is the first and most important rule: maintain clean, well-documented code and solutions. When we learn something new or solve a problem, document it here.

## Documented Issues

- **[DOCS-OVERVIEW.md](DOCS-OVERVIEW.md)**: Detailed docs overview — concepts (triples, Knowledge Graph, JSON-LD, Solid, Kvasir), doc index, reading paths, glossary; for someone new to the project
- **[001-knowledge-base-setup.md](001-knowledge-base-setup.md)**: Initial setup of the knowledge base system
- **[002-docker-health-check-loop.md](002-docker-health-check-loop.md)**: Docker health check infinite loop pattern and solution (MinIO fix for Kvasir compose)
- **[003-loop-prevention-strategies.md](003-loop-prevention-strategies.md)**: General strategies for preventing agent loops
- **[004-kvasir-onboarding-complete.md](004-kvasir-onboarding-complete.md)**: Kvasir Solid Server — full developer onboarding (clone, compose, credentials, GraphQL, Changes API)
- **[005-kvasir-quick-reference.md](005-kvasir-quick-reference.md)**: Kvasir one-pager (URLs, credentials, first commands)
- **[006-mvp-allergens-only.md](006-mvp-allergens-only.md)**: MVP scope — allergens only; simple lists, yes/no per item; API contract (read/write) and minimal UI flow for the front end
- **[007-kvasir-graphql-changes-from-official-docs.md](007-kvasir-graphql-changes-from-official-docs.md)**: GraphQL Load and Changes API Save — what the official Kvasir docs say; @context, _object(predicate), two-query workaround, delete shape, and implementation notes
- **[008-allergy-preferences-session-loops.md](008-allergy-preferences-session-loops.md)**: Allergy preferences session — two loops: (1) Save/Load not working until we checked official docs; (2) “Click X, it comes back as check mark” due to post-save refetch overwriting state with stale data and insert-only Save. Fixes and prevention.
- **[009-allergy-preferences-solution-journey.md](009-allergy-preferences-solution-journey.md)**: How we got to the allergy preferences solution (Nature Breakthrough / Tabulas): form, Load from pod, Save/replace semantics, update of the pod; end-to-end flow and takeaways.

## Pushing this docs folder to GitHub

This folder is intended to be pushed to [github.com/flybylow/kvasir](https://github.com/flybylow/kvasir). See **[PUSH-TO-GITHUB.md](PUSH-TO-GITHUB.md)** for exact steps.
