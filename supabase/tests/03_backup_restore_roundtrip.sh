#!/usr/bin/env bash
# Backup → restore into an empty database → check every table is identical.
# Run after run-local.sh (same PG* settings). Uses the scripts exactly as the
# owner would.
set -euo pipefail
cd "$(dirname "$0")/../.."
SRC=${TEST_DB:-sintes_hub_test}
DST=${SRC}_restore
HOSTPORT="${PGHOST_TCP:-localhost}:${PGPORT:-5432}"
TMP=$(mktemp -d)
P="psql -X -q -v ON_ERROR_STOP=1"

# add a few photo rows and settings so every table has data
$P -d "$SRC" -c "insert into product_images (product_id, path, thumb_path, alt_text, is_primary)
  select id, 'products/'||id||'/a.webp', 'products/'||id||'/a_thumb.webp', name, true from products
  where not exists (select 1 from product_images) limit 3;
  update store_settings set contact_email = 'shop@example.com', faq = '[{\"q\":\"Test?\",\"a\":\"Yes\"}]' where id = 1;"

DATABASE_URL="postgresql://${PGUSER:-postgres}@$HOSTPORT/$SRC" node scripts/export-database.mjs --no-photos --out="$TMP" > /dev/null
BK=$(ls "$TMP"/*.zip)

$P -d postgres -c "drop database if exists $DST" -c "create database $DST"
$P -d "$DST" -f supabase/tests/00_local_supabase_stubs.sql
for f in supabase/migrations/*.sql; do $P -d "$DST" -f "$f"; done
DATABASE_URL="postgresql://${PGUSER:-postgres}@$HOSTPORT/$DST" node scripts/restore-database.mjs "$BK" --replace --yes > "$TMP/restore.log"

fail=0
for t in categories products product_variants product_images store_settings orders order_items payments stock_movements; do
  q="select md5(coalesce(json_agg(x order by x.id)::text, '')) from public.$t x"
  a=$($P -t -A -d "$SRC" -c "$q"); b=$($P -t -A -d "$DST" -c "$q")
  if [ "$a" = "$b" ]; then echo "ok  - $t identical after restore"; else echo "FAILED: $t differs"; fail=1; fi
done

# The restored shop must still work: place an order against restored stock.
$P -t -A -d "$DST" -c "set role anon; select public.place_order(jsonb_build_object(
  'customer_name','After Restore','customer_phone','08099999999','fulfilment_method','pickup',
  'items', jsonb_build_array(jsonb_build_object('variant_id',
    (select id from public.product_variants where sku = 'DEMO-JSY-001-M'), 'quantity', 1)))) ->> 'reference'" \
  | grep -q '^SH-' && echo "ok  - restored shop accepts new orders" || { echo "FAILED: order after restore"; fail=1; }

rm -rf "$TMP" backups/before-restore-*.zip 2>/dev/null || true
exit $fail
