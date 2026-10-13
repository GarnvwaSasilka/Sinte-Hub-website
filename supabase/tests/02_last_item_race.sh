#!/usr/bin/env bash
# Two customers try to buy the LAST pair of shoes at the same moment.
# Exactly one must succeed. Run after run-local.sh (same PG* settings).
set -uo pipefail
DB=${TEST_DB:-sintes_hub_test}
P="psql -X -q -t -A -d $DB"
$P -c "update public.product_variants set stock = 1 where sku = 'DEMO-SHO-001-40'"
VID=$($P -c "select id from public.product_variants where sku = 'DEMO-SHO-001-40'")
ORDER="{\"customer_name\":\"Racer\",\"customer_phone\":\"0807000000N\",\"fulfilment_method\":\"pickup\",\"items\":[{\"variant_id\":\"$VID\",\"quantity\":1}]}"
buy() {
  $P -c "begin; set local role anon; select public.place_order('${ORDER/N/$1}'::jsonb) ->> 'reference'; select pg_sleep(1); commit;" 2>&1
}
buy 1 > /tmp/race1.txt & buy 2 > /tmp/race2.txt & wait
cat /tmp/race1.txt /tmp/race2.txt
OK=$(grep -c '^SH-' /tmp/race1.txt /tmp/race2.txt | awk -F: '{s+=$2} END {print s}')
STOCK=$($P -c "select stock from public.product_variants where id = '$VID'")
if [ "$OK" = "1" ] && [ "$STOCK" = "0" ]; then
  echo "ok  - only one customer got the last item; stock is 0"
else
  echo "FAILED: $OK orders succeeded, stock is $STOCK"; exit 1
fi
