#!/usr/bin/env bash
# Clean up Kvasir demo environment.
#
# Usage:
#   ./scripts/cleanup.sh              # full reset: wipe pod + re-enable Keycloak for alice
#   ./scripts/cleanup.sh --profile    # only erase the allergen profile (blank checkboxes)
#
# Full reset: docker compose down -v, up -d, then enable Direct access grants + alice user.
# Profile-only: load current refs, send explicit deletes (no kvasir-server clone needed).

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
COMPOSE_DIR="${KVASIR_COMPOSE_DIR:-$REPO_ROOT/kvasir-server/compose}"

case "${1:-}" in
  --profile)
    echo "=== Erasing allergen profile only ==="
    if ! command -v node >/dev/null 2>&1; then
      echo "Node is required for profile erase. Install Node or use full cleanup (no flag)." >&2
      exit 1
    fi
    cd "$REPO_ROOT"
    node "$SCRIPT_DIR/erase-allergen-profile-explicit.js"
    echo "Refresh the frontend to see an empty list."
    exit 0
    ;;
  --help|-h)
    echo "Usage: $0 [--profile]"
    echo "  (no args)  Full cleanup: wipe pod (compose down -v, up -d), then enable Keycloak for alice."
    echo "  --profile  Only erase the allergen profile so checkboxes are empty."
    exit 0
    ;;
  "")
    ;;
  *)
    echo "Unknown option: $1. Use --help." >&2
    exit 1
    ;;
esac

echo "=== Full cleanup: wipe pod and re-enable Keycloak ==="
if [ ! -d "$COMPOSE_DIR" ]; then
  echo "Compose dir not found: $COMPOSE_DIR" >&2
  echo "Set KVASIR_COMPOSE_DIR or run from repo with kvasir-server/compose." >&2
  exit 1
fi

echo "Stopping and removing containers and volumes..."
(cd "$COMPOSE_DIR" && docker compose down -v)
echo "Starting stack..."
(cd "$COMPOSE_DIR" && docker compose up -d)
echo "Waiting for Keycloak to be up (about 30s)..."
sleep 30
echo "Enabling Direct access grants and ensuring alice user..."
"$SCRIPT_DIR/enable-keycloak-direct-access-grants.sh"
echo ""
echo "Full cleanup done. Pod is empty; alice/alice login is enabled."
echo "Open the frontend (e.g. http://localhost:5173) and log in. Allergen list will be empty."
