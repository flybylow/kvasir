# Allergy Preferences Session — Loops We Got Into

## Context

New session focused on the **allergen preferences front end**: MVP with checkboxes (allergies / intolerances), Load from Kvasir GraphQL, Save via Kvasir Changes API, plus auto-load on login and autosave on checkbox change.

Two main loops happened in that session. Documenting them so we don’t repeat the same patterns.

---

## Loop 1: Save/Load Not Working — Guessing Instead of Checking Docs

### Problem

- User saved allergen profile; after reload, data was gone.
- Agent tried several code fixes in a row without confirming API behaviour from the source of truth.

### What the Agent Did (Loop)

1. **First fix:** Use `_object(predicate: ...)` for Load; use delete+insert for Save.  
   User: “Nope, not working.”
2. **Second round:** Debug with real requests, re-ingest sample data, inspect response shape.
3. **Third round:** Confirm `_predicates` has no values, try `_object(predicate: ...)` with different formats.
4. **Fourth round:** Check GraphQL schema for `_object` (e.g. `ID!`), try correct type/format.
5. **User:** “Check the documentation online for the problem we're having.”
6. **Only then:** Agent checked **official Kvasir docs** (Querying + Changes) and applied:
   - **Querying:** Send `@context` and use **prefixed** predicate in `_object(predicate: "tabulas:allergenCode")` (not full IRI); run **two separate queries** (one per predicate) because one query with two different `_object` calls returned empty.
   - **Changes:** Delete requires subject + predicate (not just `@id`); so use **insert-only** for Save (or proper replace semantics later).

After that, Load and Save started working.

### Root Cause

- Assumptions about Kvasir’s GraphQL and Changes API were wrong.
- Multiple “fixes” were tried without validating against **official documentation** first.

### Solution (For Future)

- **For third-party APIs (e.g. Kvasir): check the official docs first** when something doesn’t work (Querying, Changes, Auth).
- Don’t loop on schema tweaks or payload variations until we’ve confirmed the documented request shape, `@context`, and delete/insert semantics.
- One place we already wrote this down: [007-kvasir-graphql-changes-from-official-docs.md](007-kvasir-graphql-changes-from-official-docs.md).

---

## Loop 2: “Every Time I Click X, It Comes Back as a Check Mark”

### Problem

- User unchecks an item (clicks “X”) → shortly after, the checkbox shows checked again.
- Felt like “everything is wrong” and “with every element” — very confusing.

### What Was Actually Happening

1. User unchecks → **autosave** runs (debounced) and sends the **correct** state (item unchecked).
2. Save returns **201**; then the app did an automatic **refetch** after ~2 seconds.
3. Kvasir is **eventually consistent**; the refetch often hit the server **before** the latest write was visible.
4. Refetch returned **old data** (item still “checked” on server).
5. The app **overwrote local state** with that refetch: `setAllergies(...)` / `setIntolerances(...)` with the stale response.
6. So the checkbox **reverted to checked** even though the user had just unchecked it.

So the loop was: **uncheck → save (correct) → refetch (stale) → overwrite state → checkmark back**.

### Additional Complication: Insert-Only Save

At one point, Save was **insert-only**. The server kept **accumulating** triples (never deleting old entries). So even when the client sent “only these checked”, the graph still had previous entries. Refetch then saw all of them and the UI showed items as checked again.  
Fix for that was **replace semantics**: e.g. `kss:with` + `kss:delete: ["*"]` for the profile + `kss:insert` of the new profile so each save replaces the profile instead of appending.

### Fixes Applied

1. **Remove automatic refetch after save**  
   Stopped calling `loadProfileIntoState(..., { silent: true })` a few seconds after save. That prevented stale refetch data from overwriting the user’s current choices.

2. **Replace semantics for Save**  
   Save now clears the profile’s triples then inserts the current list (so unchecking actually removes the item on the server).

3. **Optional: longer delay or no auto-refetch**  
   If we ever reintroduce a post-save refetch, we must either wait long enough for eventual consistency or **not overwrite** local state when the refetch returns something that looks older than the last save (e.g. compare timestamps or version).

### Solution (For Future)

- **Autosave + refetch:** Avoid overwriting local state with a refetch that might be **stale** (eventual consistency). Either:
  - Don’t refetch after save, or
  - Refetch but don’t overwrite if we already have newer local state / same sequence of user actions.
- **Replace semantics:** When the backend stores a “current set” (e.g. allergen list), Save should **replace** that set (delete then insert), not only insert, or the graph and UI will drift.
- **Optimistic UI:** Keep checkbox state as the user’s source of truth until we’re sure the server reflects it; don’t let a single refetch flip it back.

---

## Summary Table

| Loop | Symptom | Cause | Fix |
|------|--------|--------|-----|
| Save/Load | Data gone after reload; “Nope, not working” | Wrong assumptions about Kvasir API; didn’t check official docs | Check [official Kvasir docs](https://kvasir.pages.ilabt.imec.be/kvasir-server/) and [007](007-kvasir-graphql-changes-from-official-docs.md); use `@context`, prefixed `_object`, two queries; correct delete/insert semantics |
| Checkbox revert | “Click X, it comes back as check mark” | Post-save refetch overwrote state with stale (eventually consistent) data; earlier insert-only Save accumulated triples | Remove post-save refetch; use replace semantics (delete profile triples then insert); don’t overwrite local state with possibly stale refetch |

---

## Rule #1: Always Keep the Wood Clean

- When an API behaves unexpectedly: **check official documentation first**, then align code and payloads.
- When the UI “undoes” user input: look for **refetch or server response overwriting local state**, and for **eventual consistency** or **replace vs insert** semantics.
