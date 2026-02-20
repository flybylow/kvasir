#!/usr/bin/env bash
# Erase the Tabulas allergen profile in Kvasir (alice pod): delete ALL triples for that profile.
# Use this to start fresh when the profile has accumulated hundreds of refs and the UI is slow/wrong.
# Requires: Keycloak at localhost:8280, Kvasir at localhost:8080.
# User alice password must be "alice" (or set ALICE_PASSWORD below).

set -e
ALICE_PASSWORD="${ALICE_PASSWORD:-alice}"

echo "Getting token for alice..."
TOKEN_JSON=$(curl -s -X POST http://localhost:8280/realms/quarkus/protocol/openid-connect/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=password&client_id=kvasir-ui&username=alice&password=$ALICE_PASSWORD")
ALICE_TOKEN=$(echo "$TOKEN_JSON" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('access_token',''))" 2>/dev/null)
if [ -z "$ALICE_TOKEN" ]; then
  echo "Failed to get token. Response: $TOKEN_JSON" >&2
  exit 1
fi

# kss:with binds the profile resource; kss:delete: ["*"] removes all its triples.
# Try both curie and full IRI so we match however the server stored the profile.
echo "Erasing profile (delete all triples for profile/alice/allergies)..."
for ID in "tabulas:profile/alice/allergies" "https://tabulas.eu/vocab#profile/alice/allergies"; do
  ERASE_JSON=$(printf '{"@context":{"kss":"https://kvasir.discover.ilabt.imec.be/vocab#","tabulas":"https://tabulas.eu/vocab#"},"kss:with":"{ Resource(id: \\"%s\\") { id } }","kss:delete":["*"],"kss:insert":[]}' "$ID")
  HTTP=$(curl -s -w "%{http_code}" -o /tmp/erase-response.txt -X POST http://localhost:8080/alice/changes \
    -H "Content-Type: application/ld+json" \
    -H "Authorization: Bearer $ALICE_TOKEN" \
    -d "$ERASE_JSON")
  if [ "$HTTP" != "201" ]; then
    echo "  $ID → HTTP $HTTP" >&2
    cat /tmp/erase-response.txt >&2
  else
    echo "  $ID → 201"
  fi
done
echo "Done. Reload the frontend (Refresh) to see an empty list."
