#!/usr/bin/env bash
# Enable "Direct access grants" for client kvasir-ui in Keycloak (realm quarkus).
# Run this once after "docker compose up" so alice/alice password login works.
# Requires: Keycloak at localhost:8280, admin/admin; curl and jq.

set -e
KEYCLOAK_URL="${KEYCLOAK_URL:-http://localhost:8280}"
REALM="${REALM:-quarkus}"
CLIENT_ID="${CLIENT_ID:-kvasir-ui}"
ADMIN_USER="${KEYCLOAK_ADMIN_USER:-admin}"
ADMIN_PASS="${KEYCLOAK_ADMIN_PASSWORD:-admin}"

echo "Getting Keycloak admin token..."
ADMIN_JSON=$(curl -s -X POST "$KEYCLOAK_URL/realms/master/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=password&client_id=admin-cli&username=$ADMIN_USER&password=$ADMIN_PASS")
ADMIN_TOKEN=$(echo "$ADMIN_JSON" | jq -r '.access_token // empty')
if [ -z "$ADMIN_TOKEN" ]; then
  echo "Failed to get admin token. Check Keycloak is up at $KEYCLOAK_URL and admin credentials." >&2
  echo "$ADMIN_JSON" | jq . 2>/dev/null || echo "$ADMIN_JSON" >&2
  exit 1
fi

echo "Finding client $CLIENT_ID in realm $REALM..."
CLIENTS_JSON=$(curl -s -H "Authorization: Bearer $ADMIN_TOKEN" \
  "$KEYCLOAK_URL/admin/realms/$REALM/clients?clientId=$CLIENT_ID")
UUID=$(echo "$CLIENTS_JSON" | jq -r '.[0].id // empty')
if [ -z "$UUID" ]; then
  echo "Client $CLIENT_ID not found in realm $REALM. Create the realm/client first (e.g. start Kvasir once)." >&2
  exit 1
fi

echo "Enabling Direct access grants for client $CLIENT_ID ($UUID)..."
REP=$(curl -s -H "Authorization: Bearer $ADMIN_TOKEN" \
  "$KEYCLOAK_URL/admin/realms/$REALM/clients/$UUID")
UPDATED=$(echo "$REP" | jq '.directAccessGrantsEnabled = true')
HTTP=$(curl -s -o /dev/null -w "%{http_code}" -X PUT \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "$UPDATED" \
  "$KEYCLOAK_URL/admin/realms/$REALM/clients/$UUID")
if [ "$HTTP" != "204" ] && [ "$HTTP" != "200" ]; then
  echo "Failed to update client (HTTP $HTTP)." >&2
  exit 1
fi

# Ensure demo user alice exists with password alice (fixes "Invalid user credentials")
DEMO_USER="${DEMO_USER:-alice}"
DEMO_PASS="${DEMO_PASSWORD:-alice}"
echo "Ensuring user $DEMO_USER exists with password set..."
USERS_JSON=$(curl -s -H "Authorization: Bearer $ADMIN_TOKEN" \
  "$KEYCLOAK_URL/admin/realms/$REALM/users?username=$DEMO_USER&exact=true")
USER_ID=$(echo "$USERS_JSON" | jq -r '.[0].id // empty')
if [ -z "$USER_ID" ]; then
  echo "Creating user $DEMO_USER..."
  HTTP=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"$DEMO_USER\",\"enabled\":true,\"credentials\":[{\"type\":\"password\",\"value\":\"$DEMO_PASS\",\"temporary\":false}]}" \
    "$KEYCLOAK_URL/admin/realms/$REALM/users")
  if [ "$HTTP" != "201" ]; then
    echo "Failed to create user (HTTP $HTTP)." >&2
    exit 1
  fi
  # Get the new user id for password set (create with credentials might not set it in some Keycloak versions)
  USERS_JSON=$(curl -s -H "Authorization: Bearer $ADMIN_TOKEN" \
    "$KEYCLOAK_URL/admin/realms/$REALM/users?username=$DEMO_USER&exact=true")
  USER_ID=$(echo "$USERS_JSON" | jq -r '.[0].id // empty')
fi
if [ -n "$USER_ID" ]; then
  HTTP=$(curl -s -o /dev/null -w "%{http_code}" -X PUT \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"type\":\"password\",\"value\":\"$DEMO_PASS\",\"temporary\":false}" \
    "$KEYCLOAK_URL/admin/realms/$REALM/users/$USER_ID/reset-password")
  if [ "$HTTP" != "204" ]; then
    echo "Warning: could not set password for $DEMO_USER (HTTP $HTTP). Try setting it in Keycloak UI." >&2
  else
    echo "Password for $DEMO_USER set."
  fi
  # Clear required actions and set profile fields so "Account is not fully set up" does not block login (Keycloak 24+)
  USER_REP=$(curl -s -H "Authorization: Bearer $ADMIN_TOKEN" \
    "$KEYCLOAK_URL/admin/realms/$REALM/users/$USER_ID")
  USER_UPDATED=$(echo "$USER_REP" | jq --arg u "$DEMO_USER" '.requiredActions = [] | .email = ($u + "@example.com") | .firstName = "Alice" | .lastName = "User" | .emailVerified = true')
  HTTP=$(curl -s -o /dev/null -w "%{http_code}" -X PUT \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d "$USER_UPDATED" \
    "$KEYCLOAK_URL/admin/realms/$REALM/users/$USER_ID")
  if [ "$HTTP" = "204" ] || [ "$HTTP" = "200" ]; then
    echo "Cleared required actions and set profile for $DEMO_USER (account fully set up)."
  fi
fi

echo "Done. You can log in with alice / alice at the frontend (e.g. http://localhost:5173)."
