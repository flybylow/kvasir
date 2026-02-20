#!/usr/bin/env bash
# Ingest Tabulas allergen profile into Kvasir (alice pod).
# Requires: Keycloak at localhost:8280, Kvasir at localhost:8080.
# The kvasir-ui client must have "Direct access grants" enabled in Keycloak
# (realm quarkus → Clients → kvasir-ui → Settings → Direct access grants ON).
# User alice password must be "alice" (or set ALICE_PASSWORD below).

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DATA_DIR="$(cd "$SCRIPT_DIR/../data" && pwd)"
ALICE_PASSWORD="${ALICE_PASSWORD:-alice}"
PROFILE_FILE="${1:-$DATA_DIR/allergen-profile-alice-example.jsonld}"

if [ ! -f "$PROFILE_FILE" ]; then
  echo "Usage: $0 [path-to-.jsonld]" >&2
  echo "Default: $DATA_DIR/allergen-profile-alice-example.jsonld" >&2
  exit 1
fi

echo "Getting token for alice..."
TOKEN_JSON=$(curl -s -X POST http://localhost:8280/realms/quarkus/protocol/openid-connect/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=password&client_id=kvasir-ui&username=alice&password=$ALICE_PASSWORD")
ALICE_TOKEN=$(echo "$TOKEN_JSON" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('access_token',''))" 2>/dev/null)
if [ -z "$ALICE_TOKEN" ]; then
  echo "Failed to get token. Response: $TOKEN_JSON" >&2
  exit 1
fi

echo "POSTing $PROFILE_FILE to http://localhost:8080/alice/changes ..."
HTTP=$(curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:8080/alice/changes \
  -H "Content-Type: application/ld+json" \
  -H "Authorization: Bearer $ALICE_TOKEN" \
  -d @"$PROFILE_FILE")
if [ "$HTTP" != "201" ]; then
  echo "Unexpected HTTP $HTTP" >&2
  exit 1
fi
echo "Created (201). Waiting 3s then querying..."
sleep 3
curl -s -X POST http://localhost:8080/alice/query \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ALICE_TOKEN" \
  -d '{"query":"{ Resource { id _types } }"}' | python3 -m json.tool
