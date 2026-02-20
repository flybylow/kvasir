# How We Got to the Allergy Preferences Solution

**Context:** Nature Breakthrough / Tabulas — user-owned allergen profile in a Solid pod, edited via a simple form.  
**Goal:** Document the journey from “we want a form that updates the pod” to the working solution: form → Load from GraphQL → Save via Changes API → pod updated with replace semantics.

This doc is the **story** of how we got there. For the MVP scope and API details, see [006-mvp-allergens-only.md](006-mvp-allergens-only.md). For pitfalls and loops, see [008-allergy-preferences-session-loops.md](008-allergy-preferences-session-loops.md).

---

## 1. Where We Started

- **Data:** We had sample JSON-LD for an allergen profile (e.g. `data/allergen-profile-alice-example.jsonld`) that we could POST to the alice pod’s **Changes API** with a Bearer token.
- **Backend:** Kvasir stores data as **triples** in a Knowledge Graph. The profile is one resource (`tabulas:profile/alice/allergies`); each allergy or intolerance is another resource (or a relation) linked from that profile.
- **Aim:** A **form** (allergies + intolerances as checkboxes) that:
  - **Loads** the current profile from the pod when the user is logged in.
  - **Updates the pod** when the user changes a checkbox (autosave), so the pod always reflects “current selection.”

So: **form ↔ pod**: read via GraphQL, write via Changes API.

---

## 2. The Form and the Data Shape

### 2.1 What the User Sees

- **Login** (alice / alice) → then one screen with two sections: **Allergies** and **Intolerances**.
- **Fixed lists:** EU 14 allergens (gluten, crustaceans, eggs, fish, peanuts, soybeans, milk, tree nuts, celery, mustard, sesame, sulphites, lupin, molluscs) and a short list of intolerances (e.g. lactose, histamine, fructose, FODMAPs, caffeine, alcohol).
- **One checkbox per item:** checked = “I have this,” unchecked = “I don’t.”
- **Auto-load:** After login (or page load with existing token), we load the profile once and set the checkboxes. No “Load” button required.
- **Autosave:** On every checkbox change we save the **whole** current selection to the pod (debounced). No separate “Save” button; status shows “Saving…” / “Saved” / “Save failed.”
- **Refresh:** Optional button to re-fetch from the server.

### 2.2 What Lives in the Pod (Triples)

- One **profile** resource: `https://tabulas.eu/vocab#profile/alice/allergies` (type `AllergenProfile`).
- The profile has two relations: **allergies** and **intolerances**, each pointing to a set of **entries** (AllergenEntry or IntoleranceEntry).
- Each entry has a **code** (e.g. `gluten`, `lactose`) stored as a literal. The form’s fixed list is keyed by these codes; “checked” = code is in the stored set.

So the **update of the pod** means: “the set of triples that represent ‘which items are yes’ must match the current checkboxes.” That only works if we **replace** that set on each save, not just add to it.

---

## 3. Load: From Pod to Form

We need to answer: “For the fixed list of allergens and intolerances, which codes are currently in the profile?”

### 3.1 First Attempts (Why They Failed)

- **`_predicates` only:** We tried to infer “yes” from which predicates exist on a resource. Kvasir’s `_predicates` returns **predicate IRIs only**, not values. So we couldn’t read the actual codes (e.g. `gluten`) and the form stayed empty after reload.
- **Full IRI in `_object(predicate: ...)`:** We used the full IRI for the predicate. The official docs require **prefixed** form (e.g. `tabulas:allergenCode`) and a **`@context`** in the request body so the server can resolve it. Without that, the query didn’t return the values we needed.
- **Two predicates in one query:** We asked for both `_object(predicate: "tabulas:allergenCode")` and `_object(predicate: "tabulas:intoleranceCode")` in the same GraphQL query. The API returned **empty** `Resource`. So we had to split into **separate queries** (or equivalent) and merge.

### 3.2 What We Do Now (Current Load)

1. **Send `@context`** in the GraphQL request body (e.g. `tabulas` → `https://tabulas.eu/vocab#`).
2. **Profile relations:** Query the profile resource by id and ask for `_object(predicate: "tabulas:allergies")` and (in a separate query) `_object(predicate: "tabulas:intolerances")` to get the **references** to the allergy/intolerance entries.
3. **Entry codes:** For each referenced entry, query that resource with `_object(predicate: "tabulas:allergenCode")` or `_object(predicate: "tabulas:intoleranceCode")` and read the literal from `_rawRDF["@value"]`. (We batch these to avoid overloading the server.)
4. **Merge into sets:** We build two sets: allergy codes and intolerance codes. The form then checks the box for each code that appears in these sets.

So: **Load = GraphQL with `@context` + prefixed predicates + one `_object` per query where needed + reading `@value` from `_rawRDF`.** Details and gotchas are in [007-kvasir-graphql-changes-from-official-docs.md](007-kvasir-graphql-changes-from-official-docs.md).

---

## 4. Save: From Form to Pod

We need to write: “The profile’s allergies and intolerances are **exactly** this set of codes.” That’s a **replace** of the profile’s data, not an append.

### 4.1 First Attempts (Why They Failed)

- **Insert only:** We sent only `kss:insert` with the current list (only “yes” items). The server **added** new triples but never **removed** old ones. So the graph kept accumulating: unchecking “gluten” didn’t delete the old “gluten” triple. After refetch, the form showed gluten as checked again. So insert-only was wrong for “current set.”
- **Delete with only `@id`:** We tried `kss:delete` with just the profile’s `@id`. The Kvasir Changes API expects delete to specify **subject + predicate (and optionally object)**. A delete with only `@id` doesn’t match the documented shape and didn’t clear the profile’s triples.
- **Post-save refetch:** After a successful save we triggered a refetch a few seconds later. Kvasir is **eventually consistent**; the refetch often got **stale** data (still showing the previous state). We then **overwrote** the form state with that stale data, so checkboxes reverted (“click X, it comes back as a check mark”). So we had to **remove** the automatic refetch after save and rely on the user’s current state (and optional manual Refresh).

### 4.2 What We Do Now (Current Save)

1. **Replace semantics:** In one Changes API request we:
   - **Select** the profile with **`kss:with`** (a GraphQL query that binds the profile by id, e.g. `Resource(id: "tabulas:profile/alice/allergies") { id }`).
   - **Delete** all triples for that profile with **`kss:delete: ["*"]`** (deletes run before inserts).
   - **Insert** a single **`kss:insert`** payload: one `AllergenProfile` with `tabulas:allergies` and `tabulas:intolerances` arrays containing **only** the entries for the currently checked items (each entry has `@id`, `@type`, code, name, etc., matching the shape in `data/allergen-profile-alice-example.jsonld`).

2. **No refetch after save:** We do **not** call Load again automatically after save. That avoids overwriting the form with stale data. The user can click **Refresh** when they want to re-read from the server.

3. **Request body:** We send `Content-Type: application/ld+json` and a JSON object with `@context`, `kss:with`, `kss:delete`, and `kss:insert`. Success = **201 Created**.

So: **Save = one POST to `/alice/changes` with replace semantics (kss:with + kss:delete ["*"] + kss:insert).** That’s how the **update of the pod** is done: the form’s current selection becomes the pod’s current set of triples for that profile.

---

## 5. End-to-End Flow (Summary)

| Step | Where | What happens |
|------|--------|----------------|
| 1. Login | Frontend → Keycloak | User enters alice / alice; we get a Bearer token (password grant) and store it (e.g. in sessionStorage). |
| 2. Auto-load | Frontend → Kvasir GraphQL | We run Load (profile + entry codes with `@context` and prefixed `_object`); we set form state (allergies / intolerances sets) so checkboxes match the pod. |
| 3. User toggles checkbox | Form | We update local state and trigger autosave (debounced). |
| 4. Autosave | Frontend → Kvasir Changes API | We build the replace payload (kss:with + kss:delete ["*"] + kss:insert with current “yes” items only) and POST to `/alice/changes`. On 201, we show “Saved”; on error, we show “Save failed” and keep local state. |
| 5. Refresh (optional) | Frontend → Kvasir GraphQL | User clicks Refresh; we run Load again and overwrite form state with server data. |

The **pod** is updated only at step 4. The form is the source of truth until the user refreshes or reloads the page (then step 2 runs again).

---

## 6. What We Learned (Takeaways)

- **Form ↔ pod** means: **read** via GraphQL (with `@context` and the right predicate/query pattern) and **write** via Changes API with **replace** semantics so the pod reflects “current set” and doesn’t accumulate old triples.
- **Load:** Use official Querying docs; send `@context`; use `_object(predicate: "prefix:localName")` and one predicate per query when reading literals; read values from `_rawRDF["@value"]`.
- **Save:** Use official Changes docs; for “replace whole profile,” use `kss:with` + `kss:delete: ["*"]` + `kss:insert` in one request; don’t rely on insert-only for a “current set.”
- **UI:** Don’t overwrite form state with a post-save refetch when the server is eventually consistent; avoid automatic refetch after save, or only refetch when you can guarantee freshness or not overwrite newer local state.

This is how we got to the solution for the allergy preferences: the form, the update of the pod, and the behaviour we have today.

---

## 7. Related Docs

| Doc | Content |
|-----|--------|
| [006-mvp-allergens-only.md](006-mvp-allergens-only.md) | MVP scope, fixed lists, API contract (read/write), UI flow. |
| [007-kvasir-graphql-changes-from-official-docs.md](007-kvasir-graphql-changes-from-official-docs.md) | What the official Kvasir docs say for Querying and Changes; implementation notes. |
| [008-allergy-preferences-session-loops.md](008-allergy-preferences-session-loops.md) | Two loops we hit (Save/Load until we checked docs; checkbox revert) and fixes. |
| [data/README.md](../data/README.md) | Sample JSON-LD files and how to ingest or erase the profile. |
| [DOCS-OVERVIEW.md](DOCS-OVERVIEW.md) | Concepts (triples, Knowledge Graph, replace semantics) and map of all docs. |
