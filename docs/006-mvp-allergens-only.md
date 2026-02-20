# MVP: Allergens only — simple lists, yes/no

**Scope:** One screen (or two): “Do you have allergies?” → list of allergens with **yes/no** per item. No dietary prefs, no preferences model. Just lists.

---

## Data we already have

- **Profile:** One resource per user: `tabulas:profile/alice/allergies` (type `tabulas:AllergenProfile`).
- **Content:** Two lists on that profile:
  - **Allergies** — list of `tabulas:AllergenEntry` (e.g. gluten, crustaceans).
  - **Intolerances** — list of `tabulas:IntoleranceEntry` (e.g. lactose).

For MVP we can treat “allergens” as **one list** (allergies + intolerances together) and show one list in the UI with yes/no per item.

---

## Fixed list of allergens (EU 14 + common intolerances)

**Allergies (EU 1169/2011 Annex II):**

1. Cereals containing gluten  
2. Crustaceans  
3. Eggs  
4. Fish  
5. Peanuts  
6. Soybeans  
7. Milk  
8. Tree nuts  
9. Celery  
10. Mustard  
11. Sesame seeds  
12. Sulphur dioxide and sulphites  
13. Lupin  
14. Molluscs  

**Intolerances (optional extra list):**

- Lactose, Histamine, Fructose, FODMAPs, Caffeine, Alcohol (or a short list you define).

**UI:** One list of items. Each item = **Yes / No** (or checkbox). “I have this” vs “I don’t.”

---

## API contract for the front end

**Base:** Kvasir pod for the user (e.g. `http://localhost:8080/alice`). All requests need **Authorization: Bearer &lt;token&gt;** (alice from Keycloak).

### 1. Get current profile (read)

**GraphQL** — `POST /alice/query` with body. From the [official Querying docs](https://kvasir.pages.ilabt.imec.be/kvasir-server/querying.html): include **`@context`** in the request body so predicate IRIs resolve (e.g. `tabulas:allergenCode`). Use **`_object(predicate: "tabulas:allergenCode") { _rawRDF }`** to read literal values (not just `_predicates`, which lists IRIs only). **Limitation:** only one `_object(predicate: ...)` per query returns data; two different predicates in the same query yield an empty `Resource` list. So run two queries (one per predicate) and merge.

**GraphQL** — `POST /alice/query` with body:

```json
{
  "query": "{ Resource(id: \"https://tabulas.eu/vocab#profile/alice/allergies\") { id _predicates _relations } }"
}
```

If you don’t have a stable `Resource(id: ...)` in your schema, use:

```json
{
  "query": "{ Resource { id _types _predicates _relations } }"
}
```

Then in the response, find the resource with `id === "https://tabulas.eu/vocab#profile/alice/allergies"` and read `_predicates` / `_relations` to see which allergens are set (and how). From that, build the list of “yes” items; everything else is “no.”

**Simpler alternative (if the schema allows):** Query by type so the backend returns only `AllergenProfile` and its nested entries, then map to your fixed list and set yes/no.

### 2. Save profile (write)

**Changes API** — `POST /alice/changes` with `Content-Type: application/ld+json` and body = one `kss:insert` with a single `tabulas:AllergenProfile` that contains the **full** list of allergies and intolerances you want to store (replace semantics: “this is my whole list”).

Use the same shape as in `data/allergen-profile-alice-example.jsonld`:

- `@id`: `tabulas:profile/alice/allergies`
- `@type`: `tabulas:AllergenProfile`
- `so:name`, `so:dateModified`
- `tabulas:allergies`: array of `tabulas:AllergenEntry` (only the ones “yes”)
- `tabulas:intolerances`: array of `tabulas:IntoleranceEntry` (only the ones “yes”)

So: **read = one GraphQL query, write = one POST to /changes with the full list.** No per-item PATCH; keep it simple.

---

## Minimal UI flow (MVP)

1. **Entry:** “Do you have allergies?” → **Yes** / **No**.
   - If **No** → show nothing (or “No allergens stored”) and stop.
   - If **Yes** → go to step 2.

2. **List:** Show the fixed list of allergens (EU 14 + intolerances). Each row:
   - Label (e.g. “Gluten”, “Milk”, “Lactose”).
   - **Yes / No** (or one checkbox: “I have this”).

3. **Auto-load:** After page load (when the user is logged in), check for an existing profile and load it: run the read query, map stored items to the fixed list, and set yes/no in the UI. No “Load” click required.

4. **Autosave:** When any checkbox changes, save immediately: build the JSON-LD profile (only “yes” items) and `POST` to `POST /alice/changes` with the user’s Bearer token. No separate “Save” button; show a short “Saving…” / “Saved” or “Save failed” status.

Optional **Refresh** button to re-fetch the profile from the server.

No categories, no extra preferences — one list, yes/no per item, auto-load and autosave.

---

## What to build in the front end

- **One page (or two):**
  - Optional: “Do you have allergies?” Yes/No.
  - Main: **List of allergens with Yes/No (or checkbox) per row**, **Save** button.
- **Read:** Call GraphQL once, get profile, map to fixed list.
- **Write:** On Save, build full `AllergenProfile` JSON-LD and POST to `/alice/changes`.
- **Auth:** Log in as alice (Keycloak), send Bearer token on every request.

That’s the MVP: allergens only, really simple, just lists and yes/no.
