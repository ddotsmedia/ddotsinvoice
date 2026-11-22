#!/usr/bin/env bash
# Run once after first migration to set the ddots_app role password from an env var.
# Usage: DATABASE_ROLE_PASSWORD=<strong-password> DATABASE_URL=<pg-url> bash scripts/setup-db-roles.sh
set -euo pipefail

if [[ -z "${DATABASE_ROLE_PASSWORD:-}" ]]; then
  echo "ERROR: DATABASE_ROLE_PASSWORD env var is required" >&2
  exit 1
fi

psql "${DATABASE_URL}" -c "ALTER ROLE ddots_app PASSWORD '${DATABASE_ROLE_PASSWORD}';"
echo "ddots_app password updated."
