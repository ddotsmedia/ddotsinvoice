#!/usr/bin/env bash
# Run once after first migration to set ddots_app and ddots_admin role passwords.
# Usage: DATABASE_ROLE_PASSWORD=<strong-password> DATABASE_ADMIN_ROLE_PASSWORD=<strong-password> DATABASE_URL=<pg-url> bash scripts/setup-db-roles.sh
# Note: DATABASE_URL must connect as a superuser (e.g. postgres user) to ALTER other roles.
set -euo pipefail

if [[ -z "${DATABASE_ROLE_PASSWORD:-}" ]]; then
  echo "ERROR: DATABASE_ROLE_PASSWORD env var is required (for ddots_app)" >&2
  exit 1
fi

if [[ -z "${DATABASE_ADMIN_ROLE_PASSWORD:-}" ]]; then
  echo "ERROR: DATABASE_ADMIN_ROLE_PASSWORD env var is required (for ddots_admin)" >&2
  exit 1
fi

psql "${DATABASE_URL}" -c "ALTER ROLE ddots_app PASSWORD '${DATABASE_ROLE_PASSWORD}';"
echo "ddots_app password updated."

psql "${DATABASE_URL}" -c "ALTER ROLE ddots_admin PASSWORD '${DATABASE_ADMIN_ROLE_PASSWORD}';"
echo "ddots_admin password updated."

echo ""
echo "Add to your production .env:"
echo "  DATABASE_URL=postgres://ddots_app:${DATABASE_ROLE_PASSWORD}@<host>/<db>"
echo "  DATABASE_ADMIN_URL=postgres://ddots_admin:${DATABASE_ADMIN_ROLE_PASSWORD}@<host>/<db>"
