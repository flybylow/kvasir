# Kvasir GraphQL & Changes — from official docs (save/load fix)

**Date:** 2026-02-19  
**Source:** [Querying](https://kvasir.pages.ilabt.imec.be/kvasir-server/querying.html), [Changes](https://kvasir.pages.ilabt.imec.be/kvasir-server/changes.html)

---

## Querying (Load)

- **Request body** may contain **`@context`** so the server can resolve prefixed predicate names.
- To read a literal value for a predicate, use **`_object(predicate: "prefix:localName") { _rawRDF }`** (e.g. `predicate: "schema:givenName"` in the doc example). Use **prefix:localName**, not the full IRI.
- **`_predicates`** only returns a list of predicate IRIs; it does **not** include values.
- **`_rawRDF`** on a Resource often only contains `@id` in the default response; use **`_object(predicate: "...")`** to get the value for a specific predicate.
- **Limitation observed:** If the same query requests **two** different **`_object(predicate: ...)`** (e.g. `allergenCode` and `intoleranceCode`), the API returns **empty `Resource`**. Workaround: run **two separate queries** (one per predicate) and merge results.

**Implementation (frontend):**

- Send **`@context: { tabulas: "https://tabulas.eu/vocab#" }`** in the GraphQL request body.
- Query: **`Resource { id _types _object(predicate: "tabulas:allergenCode") { _rawRDF } }`** and separately **`_object(predicate: "tabulas:intoleranceCode") { _rawRDF }`**.
- Read the literal from **`_object[0]._rawRDF["@value"]`**.

---

## Changes (Save)

- **Insert:** **`kss:insert`** with an array of JSON-LD objects; **`@context`** required. Returns **201 Created**.
- **Delete:** Requires **subject + predicate (and object)**. Example: **`{ "@id": "ex:john", "so:email": "jdoe@example.org" }`**. A delete with **only `@id`** does **not** match the documented shape and should not be used to “delete a resource”.
- When both **`kss:delete`** and **`kss:insert`** are in the same request, **deletes run first**.

**Implementation (frontend):**

- **Save** uses **only `kss:insert`** (no delete). Each save adds the profile; Load uses Sets so the UI still shows the correct yes/no set. For true replace semantics later, use documented delete (list predicates) or **`kss:with`** + **`kss:delete: ["*"]`**.

---

## Official links

| Doc | URL |
|-----|-----|
| Querying | https://kvasir.pages.ilabt.imec.be/kvasir-server/querying.html |
| Changes | https://kvasir.pages.ilabt.imec.be/kvasir-server/changes.html |
| API Reference | https://kvasir.pages.ilabt.imec.be/kvasir-server/api-reference.html |
