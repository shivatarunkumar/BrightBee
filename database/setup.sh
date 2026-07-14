#!/usr/bin/env bash
# =============================================================================
# BrightBee — Database Setup Script
# =============================================================================
# Usage:
#   cd database/
#   cp .env.example .env          # fill in your values
#   chmod +x setup.sh
#   ./setup.sh
#
# What this script does:
#   1. Validates that psql is installed and the .env file exists
#   2. Creates the application DB role (if not exists)
#   3. Creates the "brightbee" database (if not exists)
#   4. Runs init.sql to create all tables, indexes, and triggers
#   5. Grants the app role the permissions it needs (least-privilege)
#
# Prerequisites:
#   - PostgreSQL client tools (psql) installed on this machine
#   - PostgreSQL server running and reachable at DB_HOST:DB_PORT
#   - DB_ADMIN_USER must have CREATEDB and CREATEROLE privileges
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/.env"

# ---------------------------------------------------------------------------
# 1. Load .env
# ---------------------------------------------------------------------------
if [[ ! -f "$ENV_FILE" ]]; then
  echo ""
  echo "  ERROR: .env file not found."
  echo "  Copy the template and fill in your values:"
  echo "    cp .env.example .env"
  echo ""
  exit 1
fi

# Load .env — export every variable so child processes inherit them
set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

# Validate required variables are set
for var in DB_HOST DB_PORT DB_NAME DB_ADMIN_USER DB_APP_USER; do
  if [[ -z "${!var:-}" ]]; then
    echo "  ERROR: $var is not set in .env"
    exit 1
  fi
done

# ---------------------------------------------------------------------------
# 2. Check psql is available
# ---------------------------------------------------------------------------
if ! command -v psql &>/dev/null; then
  echo ""
  echo "  ERROR: psql not found. Install PostgreSQL client tools first."
  echo "    macOS:  brew install libpq && brew link --force libpq"
  echo "    Ubuntu: sudo apt install postgresql-client"
  echo ""
  exit 1
fi

# Helper: run SQL as the admin user
run_as_admin() {
  PGPASSWORD="$DB_ADMIN_PASSWORD" psql \
    --host="$DB_HOST" \
    --port="$DB_PORT" \
    --username="$DB_ADMIN_USER" \
    --no-password \
    "$@"
}

echo ""
echo "============================================="
echo "  BrightBee Database Setup"
echo "============================================="
echo "  Host     : $DB_HOST:$DB_PORT"
echo "  Database : $DB_NAME"
echo "  App user : $DB_APP_USER"
echo "============================================="
echo ""

# ---------------------------------------------------------------------------
# 3. Create app role (if it doesn't exist)
# ---------------------------------------------------------------------------
echo "[1/4] Creating app role '$DB_APP_USER' (if not exists)..."
run_as_admin --dbname=postgres <<SQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${DB_APP_USER}') THEN
    CREATE ROLE "${DB_APP_USER}" LOGIN PASSWORD '${DB_APP_PASSWORD}';
    RAISE NOTICE 'Role ${DB_APP_USER} created.';
  ELSE
    -- Update password in case it changed
    ALTER ROLE "${DB_APP_USER}" PASSWORD '${DB_APP_PASSWORD}';
    RAISE NOTICE 'Role ${DB_APP_USER} already exists — password updated.';
  END IF;
END
\$\$;
SQL

# ---------------------------------------------------------------------------
# 4. Create database (if it doesn't exist)
# ---------------------------------------------------------------------------
echo "[2/4] Creating database '$DB_NAME' (if not exists)..."
DB_EXISTS=$(PGPASSWORD="$DB_ADMIN_PASSWORD" psql \
  --host="$DB_HOST" --port="$DB_PORT" \
  --username="$DB_ADMIN_USER" --no-password \
  --dbname=postgres \
  --tuples-only --no-align \
  --command="SELECT 1 FROM pg_database WHERE datname='${DB_NAME}';" | tr -d '[:space:]')

if [[ "$DB_EXISTS" != "1" ]]; then
  PGPASSWORD="$DB_ADMIN_PASSWORD" createdb \
    --host="$DB_HOST" --port="$DB_PORT" \
    --username="$DB_ADMIN_USER" \
    --owner="$DB_ADMIN_USER" \
    "$DB_NAME"
  echo "  Database '$DB_NAME' created."
else
  echo "  Database '$DB_NAME' already exists — skipping creation."
fi

# ---------------------------------------------------------------------------
# 5. Run init.sql to create tables, indexes, triggers
# ---------------------------------------------------------------------------
echo "[3/4] Running init.sql..."
run_as_admin --dbname="$DB_NAME" --file="$SCRIPT_DIR/init.sql"
echo "  Schema applied successfully."

# ---------------------------------------------------------------------------
# 6. Grant least-privilege permissions to the app role
# ---------------------------------------------------------------------------
echo "[4/4] Granting permissions to '$DB_APP_USER'..."
run_as_admin --dbname="$DB_NAME" <<SQL
-- Connect privilege
GRANT CONNECT ON DATABASE "${DB_NAME}" TO "${DB_APP_USER}";

-- Usage on public schema
GRANT USAGE ON SCHEMA public TO "${DB_APP_USER}";

-- Table-level: SELECT, INSERT, UPDATE, DELETE (no DROP, no TRUNCATE)
GRANT SELECT, INSERT, UPDATE, DELETE
  ON ALL TABLES IN SCHEMA public TO "${DB_APP_USER}";

-- Sequence usage (for any serial/sequence-backed columns)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO "${DB_APP_USER}";

-- Ensure future tables/sequences are also accessible
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO "${DB_APP_USER}";

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO "${DB_APP_USER}";
SQL

echo ""
echo "============================================="
echo "  Setup complete!"
echo ""
echo "  Add this to your backend .env:"
echo "  DATABASE_URL=postgresql://${DB_APP_USER}:<password>@${DB_HOST}:${DB_PORT}/${DB_NAME}"
echo "============================================="
echo ""
