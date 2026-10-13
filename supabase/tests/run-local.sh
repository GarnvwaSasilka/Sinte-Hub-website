#!/usr/bin/env bash
# Builds a throwaway local database and runs the rule checks.
# Needs a local PostgreSQL 15+ server. Usage:
#   PGHOST=localhost PGPORT=5432 PGUSER=postgres bash supabase/tests/run-local.sh
set -euo pipefail
cd "$(dirname "$0")/../.."
DB=${TEST_DB:-sintes_hub_test}
P="psql -v ON_ERROR_STOP=1 -q"
$P -d postgres -c "drop database if exists $DB" -c "create database $DB"
$P -d "$DB" -f supabase/tests/00_local_supabase_stubs.sql
for f in supabase/migrations/*.sql; do $P -d "$DB" -f "$f"; done
$P -d "$DB" -f supabase/seed.sql > /dev/null
$P -d "$DB" -f supabase/tests/01_rules_test.sql
bash supabase/tests/02_last_item_race.sh
PGHOST_TCP=${PGHOST_TCP:-localhost} bash supabase/tests/03_backup_restore_roundtrip.sh
