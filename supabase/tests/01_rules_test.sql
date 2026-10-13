-- Automated checks for the database rules. Run on a local PostgreSQL after
-- 00_local_supabase_stubs.sql, both migrations and seed.sql:
--   npm run test:db
-- Every check raises an error (and stops) if a rule is broken.

\set ON_ERROR_STOP 1
\pset tuples_only on
\pset format unaligned

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000a0a0', 'owner@example.com'),
  ('00000000-0000-0000-0000-00000000c0c0', 'stranger@example.com');
insert into public.admin_users (user_id, email) values
  ('00000000-0000-0000-0000-00000000a0a0', 'owner@example.com');

create or replace function pg_temp.check(ok boolean, what text) returns void language plpgsql as $$
begin
  if not coalesce(ok, false) then raise exception 'FAILED: %', what; end if;
  raise notice 'ok  - %', what;
end $$;

-- ---------------------------------------------------------------- visitor
begin;
set local role anon;
select pg_temp.check((select count(*) from public.products where slug = 'hidden-test-product') = 0,
  'visitor cannot see hidden products');
select pg_temp.check((select count(*) from public.product_catalog where slug = 'hidden-test-product') = 0,
  'hidden products are not in the catalogue view');
select pg_temp.check((select count(*) from public.products where slug = 'structured-mini-tote') = 1,
  'visitor can see sold-out products');
select pg_temp.check((select count(*) from public.store_settings) = 1, 'visitor can read store settings');
select pg_temp.check((select count(*) from public.search_products(p_query => 'gown')) = 1, 'search finds the gown');
select pg_temp.check((select count(*) from public.search_products(p_size => 'XL')) = 1, 'size filter works');
select pg_temp.check((select count(*) from public.search_products(p_in_stock => true) where slug = 'structured-mini-tote') = 0,
  'in-stock filter hides sold-out items');
commit;

do $$ begin
  set local role anon;
  begin
    perform count(*) from public.orders;
    raise exception 'FAILED: visitor could read orders';
  exception when insufficient_privilege then raise notice 'ok  - visitor cannot read orders at all';
  end;
  begin
    perform count(*) from public.order_items;
    raise exception 'FAILED: visitor could read order items';
  exception when insufficient_privilege then raise notice 'ok  - visitor cannot read order items';
  end;
  begin
    insert into public.orders (reference, customer_name, customer_phone, fulfilment_method, subtotal, delivery_fee)
    values ('FAKE', 'Hacker', '08000000000', 'pickup', 0, 0);
    raise exception 'FAILED: visitor inserted an order directly';
  exception when insufficient_privilege then raise notice 'ok  - visitor cannot insert orders directly';
  end;
  begin
    update public.products set price = 1;
    raise exception 'FAILED: visitor updated products';
  exception when insufficient_privilege then raise notice 'ok  - visitor cannot change products';
  end;
  begin
    update public.product_variants set stock = 999;
    raise exception 'FAILED: visitor updated stock';
  exception when insufficient_privilege then raise notice 'ok  - visitor cannot change stock';
  end;
  begin
    perform public.admin_record_payment(gen_random_uuid(), 100, 'x', 'x');
    raise exception 'FAILED: visitor could call admin_record_payment';
  exception when insufficient_privilege then raise notice 'ok  - visitor cannot record payments';
  end;
end $$;

-- ------------------------------------------- logged in, but NOT the admin
begin;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000c0c0';
select pg_temp.check(not public.is_admin(), 'stranger is not admin');
select pg_temp.check((select count(*) from public.orders) = 0, 'logged-in stranger sees no orders');
select pg_temp.check((select count(*) from public.payments) = 0, 'logged-in stranger sees no payments');
select pg_temp.check((select count(*) from public.products where status = 'hidden') = 0, 'stranger cannot see hidden products');
commit;

do $$ declare n int; begin
  set local role authenticated;
  set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000c0c0';
  update public.products set price = 1; get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAILED: stranger changed % products', n; end if;
  raise notice 'ok  - logged-in stranger cannot change products';
  update public.orders set order_status = 'cancelled'; get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAILED: stranger changed orders'; end if;
  raise notice 'ok  - logged-in stranger cannot change orders';
  begin
    insert into public.admin_users (user_id, email) values ('00000000-0000-0000-0000-00000000c0c0', 'x');
    raise exception 'FAILED: stranger made themselves admin';
  exception when insufficient_privilege then raise notice 'ok  - nobody can make themselves admin';
  end;
  begin
    insert into storage.objects (bucket_id, name) values ('product-images', 'evil.jpg');
    raise exception 'FAILED: stranger uploaded a photo';
  exception when insufficient_privilege then raise notice 'ok  - stranger cannot upload photos';
  end;
  begin
    perform public.admin_record_payment((select gen_random_uuid()), 100, 'x', 'x');
    raise exception 'FAILED: stranger recorded a payment';
  exception when raise_exception then
    if sqlerrm like 'FAILED%' then raise; end if;
    raise notice 'ok  - stranger cannot record payments';
  end;
end $$;

-- ---------------------------------------------------------------- checkout
do $$
declare
  v_variant uuid;
  v_before int;
  v_after int;
  r jsonb;
begin
  set local role anon;
  select id, stock into v_variant, v_before from public.product_variants where sku = 'DEMO-GWN-001-L';

  begin
    perform public.place_order(jsonb_build_object(
      'customer_name', 'Too Many', 'customer_phone', '08055555555', 'fulfilment_method', 'pickup',
      'items', jsonb_build_array(jsonb_build_object('variant_id', v_variant, 'quantity', v_before + 1))));
    raise exception 'FAILED: ordered more than stock';
  exception when raise_exception then
    if sqlerrm like 'FAILED%' then raise; end if;
    raise notice 'ok  - cannot order more than is in stock (%)', sqlerrm;
  end;

  begin
    perform public.place_order(jsonb_build_object(
      'customer_name', 'Fabric Buyer', 'customer_phone', '08055555555', 'fulfilment_method', 'pickup',
      'items', jsonb_build_array(jsonb_build_object(
        'variant_id', (select id from public.product_variants where sku = 'DEMO-ANK-001'), 'quantity', 2))));
    raise exception 'FAILED: minimum order ignored';
  exception when raise_exception then
    if sqlerrm like 'FAILED%' then raise; end if;
    raise notice 'ok  - fabric minimum order quantity enforced';
  end;

  begin
    perform public.place_order(jsonb_build_object(
      'customer_name', 'Sneaky', 'customer_phone', '08055555555', 'fulfilment_method', 'pickup',
      'items', jsonb_build_array(jsonb_build_object(
        'variant_id', (select id from public.product_variants where sku = 'DEMO-HID-001-M'), 'quantity', 1))));
    raise exception 'FAILED: bought a hidden product';
  exception when raise_exception then
    if sqlerrm like 'FAILED%' then raise; end if;
    raise notice 'ok  - hidden products cannot be bought';
  end;

  begin
    perform public.place_order(jsonb_build_object(
      'customer_name', 'No Address', 'customer_phone', '08055555555', 'fulfilment_method', 'delivery',
      'items', jsonb_build_array(jsonb_build_object('variant_id', v_variant, 'quantity', 1))));
    raise exception 'FAILED: delivery without address';
  exception when raise_exception then
    if sqlerrm like 'FAILED%' then raise; end if;
    raise notice 'ok  - delivery needs an address';
  end;

  r := public.place_order(jsonb_build_object(
    'customer_name', 'Last Item', 'customer_phone', '08055555555', 'fulfilment_method', 'pickup',
    'items', jsonb_build_array(jsonb_build_object('variant_id', v_variant, 'quantity', v_before))));
  select stock into v_after from public.product_variants where id = v_variant;
  if v_after <> 0 then raise exception 'FAILED: stock not reserved'; end if;
  if (r ->> 'reference') !~ '^SH-[0-9]{6}-[A-Z2-9]{6}$' then raise exception 'FAILED: bad reference %', r ->> 'reference'; end if;
  raise notice 'ok  - order placed (%), stock reserved, reference format good', r ->> 'reference';
end $$;

-- ---------------------------------------------------------------- admin
do $$
declare
  v_order record;
  v_stock_before int;
  v_stock_after int;
  v_price_before numeric;
begin
  set local role authenticated;
  set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000a0a0';

  if not public.is_admin() then raise exception 'FAILED: owner is not admin'; end if;
  if (select count(*) from public.orders) < 4 then raise exception 'FAILED: admin cannot see orders'; end if;
  raise notice 'ok  - admin sees all orders';

  -- Price change does not alter existing orders
  select unit_price into v_price_before from public.order_items where sku = 'DEMO-GWN-001-M' limit 1;
  update public.products set price = 99999 where slug = 'champagne-satin-wrap-gown';
  if (select unit_price from public.order_items where sku = 'DEMO-GWN-001-M' limit 1) <> v_price_before then
    raise exception 'FAILED: price change altered an old order';
  end if;
  raise notice 'ok  - price changes do not alter past orders';

  begin
    update public.order_items set unit_price = 1;
    raise exception 'FAILED: order items edited';
  exception when insufficient_privilege then
    raise notice 'ok  - order items cannot be edited';
  end;

  -- Delivery order cannot be confirmed without a fee
  select * into v_order from public.orders where customer_name = 'Demo Customer Two';
  begin
    update public.orders set order_status = 'confirmed' where id = v_order.id;
    raise exception 'FAILED: confirmed without delivery fee';
  exception when raise_exception then
    if sqlerrm like 'FAILED%' then raise; end if;
    raise notice 'ok  - delivery fee must be agreed before confirming';
  end;
  update public.orders set delivery_fee = 3500, order_status = 'confirmed' where id = v_order.id;

  begin
    update public.orders set delivery_fee = 1 where id = v_order.id;
    raise exception 'FAILED: fee changed after confirmation';
  exception when raise_exception then
    if sqlerrm like 'FAILED%' then raise; end if;
    raise notice 'ok  - delivery fee locked after confirmation';
  end;

  begin
    update public.orders set order_status = 'ready_for_pickup' where id = v_order.id;
    raise exception 'FAILED: delivery order marked ready for pickup';
  exception when raise_exception then
    if sqlerrm like 'FAILED%' then raise; end if;
    raise notice 'ok  - status changes must fit pickup/delivery';
  end;

  begin
    update public.orders set payment_status = 'paid' where id = v_order.id;
    raise exception 'FAILED: marked paid without payment';
  exception when raise_exception then
    if sqlerrm like 'FAILED%' then raise; end if;
    raise notice 'ok  - cannot mark paid without a verified payment';
  end;
  perform public.admin_record_payment(v_order.id, 42000, 'TRF-123', 'Bank transfer seen in app');
  if (select payment_status from public.orders where id = v_order.id) <> 'paid' then
    raise exception 'FAILED: payment not recorded';
  end if;
  raise notice 'ok  - verified payment marks order paid';

  -- Cancelling puts stock back exactly once
  select * into v_order from public.orders where customer_name = 'Demo Customer Three';
  select stock into v_stock_before from public.product_variants where sku = 'DEMO-SHO-001-39';
  update public.orders set order_status = 'cancelled', cancellation_reason = 'Customer changed mind' where id = v_order.id;
  select stock into v_stock_after from public.product_variants where sku = 'DEMO-SHO-001-39';
  if v_stock_after <> v_stock_before + 1 then raise exception 'FAILED: stock not restored'; end if;
  update public.orders set admin_notes = 'touched again' where id = v_order.id;
  if (select stock from public.product_variants where sku = 'DEMO-SHO-001-39') <> v_stock_after then
    raise exception 'FAILED: stock restored twice';
  end if;
  begin
    update public.orders set order_status = 'pending' where id = v_order.id;
    raise exception 'FAILED: cancelled order reopened';
  exception when raise_exception then
    if sqlerrm like 'FAILED%' then raise; end if;
    raise notice 'ok  - cancelling puts stock back once, and is final';
  end;

  if (select count(*) from public.stock_movements) = 0 then raise exception 'FAILED: no stock log'; end if;
  raise notice 'ok  - stock changes are logged';

  insert into storage.objects (bucket_id, name) values ('product-images', 'products/test.webp');
  raise notice 'ok  - admin can upload photos';
end $$;

\echo
\echo All database rule checks passed.
