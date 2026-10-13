-- =====================================================================
-- Sinte's Hub: database tables, rules and order logic
--
-- Run this whole file once in the Supabase SQL Editor (see docs/SETUP.md).
-- It is safe to read top to bottom: tables first, then the security rules
-- (Row Level Security), then the functions that place and manage orders.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Types
-- ---------------------------------------------------------------------
create type public.product_status as enum ('available', 'sold_out', 'hidden', 'archived');
create type public.fulfilment_method as enum ('pickup', 'delivery');
create type public.order_status as enum (
  'pending',           -- just placed on the website, waiting for the owner
  'confirmed',         -- owner confirmed stock and the final total with the customer
  'processing',        -- being packed / prepared
  'ready_for_pickup',  -- waiting for the customer to collect
  'dispatched',        -- handed to the rider / courier
  'delivered',         -- delivered to the customer (final)
  'collected',         -- collected by the customer (final)
  'cancelled'          -- cancelled; stock is put back automatically (final)
);
create type public.payment_status as enum ('unpaid', 'paid', 'refunded');
create type public.payment_record_status as enum ('pending', 'verified', 'failed', 'refunded');

-- ---------------------------------------------------------------------
-- 2. Helper: keep updated_at current
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_setting('app.restoring', true) is distinct from 'on' then
    new.updated_at := now();
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- 3. Admin users
--    Only people listed here can open the dashboard or change anything.
--    Nobody can add themselves: rows are added by the owner in the SQL
--    Editor (see docs/SETUP.md, step "Make yourself the admin").
-- ---------------------------------------------------------------------
create table public.admin_users (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  email      text not null,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admin_users where user_id = (select auth.uid())
  );
$$;

-- ---------------------------------------------------------------------
-- 4. Catalogue: categories, products, variants, images
-- ---------------------------------------------------------------------
create table public.categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 1 and 80),
  slug        text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description text check (char_length(description) <= 1000),
  image_path  text,
  sort_order  integer not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.products (
  id                uuid primary key default gen_random_uuid(),
  name              text not null check (char_length(name) between 1 and 150),
  slug              text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description       text check (char_length(description) <= 5000),
  category_id       uuid references public.categories (id) on delete set null,
  price             numeric(12, 2) not null check (price >= 0),
  sale_price        numeric(12, 2) check (sale_price >= 0),
  sku               text unique check (char_length(sku) <= 60),
  status            public.product_status not null default 'available',
  is_featured       boolean not null default false,
  is_bestseller     boolean not null default false,
  material          text check (char_length(material) <= 200),
  care_instructions text check (char_length(care_instructions) <= 1000),
  fit_notes         text check (char_length(fit_notes) <= 1000),
  unit_of_sale      text not null default 'piece' check (char_length(unit_of_sale) between 1 and 30),
  min_order_qty     integer not null default 1 check (min_order_qty between 1 and 999),
  tags              text check (char_length(tags) <= 500),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint sale_below_price check (sale_price is null or sale_price < price)
);
create index products_category_idx on public.products (category_id);
create index products_status_idx on public.products (status);

create table public.product_variants (
  id         uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  size       text check (char_length(size) <= 40),
  colour     text check (char_length(colour) <= 40),
  sku        text unique check (char_length(sku) <= 60),
  stock      integer not null default 0 check (stock >= 0),
  price      numeric(12, 2) check (price >= 0),   -- optional: overrides the product price
  sort_order integer not null default 0,
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint variant_unique unique nulls not distinct (product_id, size, colour)
);
create index product_variants_product_idx on public.product_variants (product_id);

create table public.product_images (
  id         uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  path       text not null,          -- path inside the "product-images" storage bucket
  thumb_path text,                   -- smaller copy used on product cards
  alt_text   text check (char_length(alt_text) <= 200),
  sort_order integer not null default 0,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);
create index product_images_product_idx on public.product_images (product_id);
create unique index product_images_one_primary on public.product_images (product_id) where is_primary;

-- A log of every stock change, so the owner can see "recent stock changes".
create table public.stock_movements (
  id         bigint generated always as identity primary key,
  variant_id uuid references public.product_variants (id) on delete set null,
  product_id uuid references public.products (id) on delete set null,
  change     integer not null,
  stock_after integer not null,
  reason     text not null,
  created_by uuid,
  created_at timestamptz not null default now()
);
create index stock_movements_created_idx on public.stock_movements (created_at desc);

-- ---------------------------------------------------------------------
-- 5. Orders, order items, payments
-- ---------------------------------------------------------------------
create table public.orders (
  id                 uuid primary key default gen_random_uuid(),
  reference          text not null unique,
  customer_name      text not null check (char_length(customer_name) between 2 and 100),
  customer_phone     text not null check (customer_phone ~ '^\+?[0-9]{7,15}$'),
  customer_email     text check (char_length(customer_email) <= 200),
  fulfilment_method  public.fulfilment_method not null,
  delivery_state     text check (char_length(delivery_state) <= 60),
  delivery_city      text check (char_length(delivery_city) <= 100),
  delivery_address   text check (char_length(delivery_address) <= 500),
  customer_note      text check (char_length(customer_note) <= 1000),
  subtotal           numeric(12, 2) not null check (subtotal >= 0),
  -- NULL means "to be confirmed". Pickup is always 0.
  delivery_fee       numeric(12, 2) check (delivery_fee >= 0),
  order_status       public.order_status not null default 'pending',
  payment_status     public.payment_status not null default 'unpaid',
  admin_notes        text check (char_length(admin_notes) <= 5000),
  cancellation_reason text check (char_length(cancellation_reason) <= 1000),
  stock_restored     boolean not null default false,
  confirmed_at       timestamptz,
  dispatched_at      timestamptz,
  delivered_at       timestamptz,
  collected_at       timestamptz,
  cancelled_at       timestamptz,
  paid_at            timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint pickup_has_no_fee check (fulfilment_method <> 'pickup' or delivery_fee = 0),
  constraint delivery_needs_address check (
    fulfilment_method <> 'delivery'
    or (delivery_state is not null and delivery_city is not null and delivery_address is not null)
  )
);
create index orders_created_idx on public.orders (created_at desc);
create index orders_status_idx on public.orders (order_status);
create index orders_phone_idx on public.orders (customer_phone, created_at desc);

create table public.order_items (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid not null references public.orders (id) on delete cascade,
  product_id    uuid references public.products (id) on delete set null,
  variant_id    uuid references public.product_variants (id) on delete set null,
  -- Snapshots taken when the order was placed. Later price or name changes
  -- never change these.
  product_name  text not null,
  variant_label text,
  sku           text,
  unit_of_sale  text not null default 'piece',
  unit_price    numeric(12, 2) not null check (unit_price >= 0),
  quantity      integer not null check (quantity > 0),
  line_total    numeric(12, 2) not null check (line_total >= 0),
  created_at    timestamptz not null default now()
);
create index order_items_order_idx on public.order_items (order_id);

create table public.payments (
  id                 uuid primary key default gen_random_uuid(),
  order_id           uuid not null references public.orders (id) on delete cascade,
  provider           text not null default 'manual' check (provider in ('manual', 'paystack')),
  provider_reference text check (char_length(provider_reference) <= 200),
  amount             numeric(12, 2) not null check (amount > 0),
  currency           text not null default 'NGN',
  status             public.payment_record_status not null default 'pending',
  notes              text check (char_length(notes) <= 1000),
  raw                jsonb,
  verified_by        uuid,
  verified_at        timestamptz,
  created_at         timestamptz not null default now(),
  constraint payment_reference_unique unique (provider, provider_reference)
);
create index payments_order_idx on public.payments (order_id);

-- ---------------------------------------------------------------------
-- 6. Store settings (one row). Everything here is public business info
--    shown on the website, so never put secrets in this table.
-- ---------------------------------------------------------------------
create table public.store_settings (
  id                  integer primary key default 1 check (id = 1),
  store_name          text not null default 'Sinte''s Hub',
  tagline             text default 'Style • Quality • You',
  whatsapp_number     text check (whatsapp_number ~ '^[1-9][0-9]{7,14}$'),
  contact_phone       text,
  contact_email       text,
  address             text,
  pickup_area         text,
  pickup_instructions text,
  instagram_url       text check (instagram_url ~ '^https://'),
  tiktok_url          text check (tiktok_url ~ '^https://'),
  facebook_url        text check (facebook_url ~ '^https://'),
  low_stock_threshold integer not null default 3 check (low_stock_threshold between 0 and 1000),
  announcement        text,
  hero_title          text,
  hero_subtitle       text,
  hero_image_path     text,
  about_text          text,
  delivery_policy     text,
  returns_policy      text,
  privacy_policy      text,
  terms_text          text,
  size_guide_text     text,
  faq                 jsonb not null default '[]'::jsonb check (jsonb_typeof(faq) = 'array'),
  updated_at          timestamptz not null default now()
);
insert into public.store_settings (id, pickup_area) values (1, 'Kaduna and Azare');

-- ---------------------------------------------------------------------
-- 7. updated_at triggers
-- ---------------------------------------------------------------------
create trigger categories_updated before update on public.categories
  for each row execute function public.set_updated_at();
create trigger products_updated before update on public.products
  for each row execute function public.set_updated_at();
create trigger product_variants_updated before update on public.product_variants
  for each row execute function public.set_updated_at();
create trigger orders_updated before update on public.orders
  for each row execute function public.set_updated_at();
create trigger store_settings_updated before update on public.store_settings
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 8. Stock change log
-- ---------------------------------------------------------------------
create or replace function public.log_stock_movement()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_change integer;
begin
  if current_setting('app.restoring', true) = 'on' then
    return new;
  end if;
  if tg_op = 'INSERT' then
    v_change := new.stock;
  else
    v_change := new.stock - old.stock;
  end if;
  if v_change <> 0 then
    insert into public.stock_movements (variant_id, product_id, change, stock_after, reason, created_by)
    values (
      new.id, new.product_id, v_change, new.stock,
      coalesce(nullif(current_setting('app.stock_reason', true), ''), 'Edited in dashboard'),
      auth.uid()
    );
  end if;
  return new;
end;
$$;

create trigger product_variants_stock_log
  after insert or update of stock on public.product_variants
  for each row execute function public.log_stock_movement();

-- ---------------------------------------------------------------------
-- 9. Order rules: allowed status changes, put stock back on cancel,
--    and "paid" only after a verified payment.
-- ---------------------------------------------------------------------
create or replace function public.guard_order_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_allowed public.order_status[];
  v_item record;
begin
  -- The restore script switches these checks off while it reloads a backup.
  if current_setting('app.restoring', true) = 'on' then
    return new;
  end if;

  -- These columns are written once when the order is placed and never change.
  if new.reference is distinct from old.reference
     or new.subtotal is distinct from old.subtotal
     or new.fulfilment_method is distinct from old.fulfilment_method
     or new.created_at is distinct from old.created_at then
    raise exception 'The order reference, subtotal, pickup/delivery choice and date cannot be changed.';
  end if;

  if new.order_status is distinct from old.order_status then
    v_allowed := case old.order_status
      when 'pending'          then array['confirmed', 'cancelled']
      when 'confirmed'        then array['processing', 'ready_for_pickup', 'dispatched', 'cancelled']
      when 'processing'       then array['ready_for_pickup', 'dispatched', 'cancelled']
      when 'ready_for_pickup' then array['collected', 'cancelled']
      when 'dispatched'       then array['delivered', 'cancelled']
      else array[]::text[]
    end::public.order_status[];

    if not (new.order_status = any (v_allowed)) then
      raise exception 'An order cannot move from "%" to "%".', old.order_status, new.order_status;
    end if;

    if new.order_status in ('ready_for_pickup', 'collected') and new.fulfilment_method <> 'pickup' then
      raise exception 'Only pickup orders can be marked ready for pickup or collected.';
    end if;
    if new.order_status in ('dispatched', 'delivered') and new.fulfilment_method <> 'delivery' then
      raise exception 'Only delivery orders can be marked dispatched or delivered.';
    end if;
    if new.order_status = 'confirmed' and new.delivery_fee is null then
      raise exception 'Enter the delivery fee you agreed with the customer before confirming this order.';
    end if;

    case new.order_status
      when 'confirmed'  then new.confirmed_at := now();
      when 'dispatched' then new.dispatched_at := now();
      when 'delivered'  then new.delivered_at := now();
      when 'collected'  then new.collected_at := now();
      when 'cancelled'  then new.cancelled_at := now();
      else null;
    end case;
  end if;

  -- Once confirmed, the agreed delivery fee is locked in.
  if old.order_status <> 'pending' and new.delivery_fee is distinct from old.delivery_fee then
    raise exception 'The delivery fee is locked once the order is confirmed.';
  end if;

  -- Put stock back exactly once when an order is cancelled.
  if new.order_status = 'cancelled' and old.order_status <> 'cancelled'
     and not old.stock_restored and not new.stock_restored then
    perform set_config('app.stock_reason', 'Order ' || old.reference || ' cancelled', true);
    for v_item in
      select variant_id, quantity from public.order_items
      where order_id = old.id and variant_id is not null
      order by variant_id
    loop
      update public.product_variants set stock = stock + v_item.quantity where id = v_item.variant_id;
    end loop;
    perform set_config('app.stock_reason', '', true);
    new.stock_restored := true;
  end if;

  -- "Paid" needs a verified payment record first (see admin_record_payment).
  if new.payment_status = 'paid' and old.payment_status <> 'paid' then
    if not exists (
      select 1 from public.payments where order_id = new.id and status = 'verified'
    ) then
      raise exception 'Record a verified payment before marking this order as paid.';
    end if;
    new.paid_at := coalesce(new.paid_at, now());
  end if;

  return new;
end;
$$;

create trigger orders_guard before update on public.orders
  for each row execute function public.guard_order_update();

-- Order items are a permanent record: they can be added only by place_order.
create or replace function public.block_order_item_changes()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_setting('app.restoring', true) = 'on' then
    return new;
  end if;
  raise exception 'Order items cannot be changed after the order is placed.';
end;
$$;

create trigger order_items_readonly before update on public.order_items
  for each row execute function public.block_order_item_changes();

-- ---------------------------------------------------------------------
-- 10. Catalogue view used by the shop (respects the rules below)
-- ---------------------------------------------------------------------
create view public.product_catalog
with (security_invoker = on)
as
select
  p.id, p.name, p.slug, p.description, p.category_id,
  c.slug  as category_slug,
  c.name  as category_name,
  p.price, p.sale_price,
  coalesce(p.sale_price, p.price) as effective_price,
  p.sku, p.status, p.is_featured, p.is_bestseller, p.unit_of_sale, p.min_order_qty,
  p.tags, p.created_at,
  coalesce(v.total_stock, 0) as total_stock,
  coalesce(v.sizes, '{}')    as sizes,
  coalesce(v.colours, '{}')  as colours,
  (p.status = 'available' and coalesce(v.total_stock, 0) > 0) as in_stock,
  img.path       as image_path,
  img.thumb_path as thumb_path,
  img.alt_text   as image_alt
from public.products p
left join public.categories c on c.id = p.category_id
left join lateral (
  select
    sum(pv.stock)::integer as total_stock,
    array_remove(array_agg(distinct pv.size), null)   as sizes,
    array_remove(array_agg(distinct pv.colour), null) as colours
  from public.product_variants pv
  where pv.product_id = p.id and pv.is_active
) v on true
left join lateral (
  select pi.path, pi.thumb_path, pi.alt_text
  from public.product_images pi
  where pi.product_id = p.id
  order by pi.is_primary desc, pi.sort_order, pi.created_at
  limit 1
) img on true;

-- ---------------------------------------------------------------------
-- 11. ROW LEVEL SECURITY
--     Customers (not logged in) can only READ the public catalogue and
--     settings. They can never read, list or change orders; the only way
--     to create one is place_order() below. Everything else needs an
--     admin login.
-- ---------------------------------------------------------------------
alter table public.admin_users      enable row level security;
alter table public.categories       enable row level security;
alter table public.products         enable row level security;
alter table public.product_variants enable row level security;
alter table public.product_images   enable row level security;
alter table public.stock_movements  enable row level security;
alter table public.orders           enable row level security;
alter table public.order_items      enable row level security;
alter table public.payments         enable row level security;
alter table public.store_settings   enable row level security;

-- Start from zero access, then grant only what is needed.
revoke all on all tables in schema public from anon, authenticated;

-- admin_users: a logged-in person may only see whether they themselves are an admin.
grant select on public.admin_users to authenticated;
create policy "see own admin row" on public.admin_users
  for select to authenticated using (user_id = (select auth.uid()));

-- categories
grant select on public.categories to anon, authenticated;
grant insert, update, delete on public.categories to authenticated;
create policy "public reads active categories" on public.categories
  for select to anon, authenticated using (is_active or (select public.is_admin()));
create policy "admin inserts categories" on public.categories
  for insert to authenticated with check ((select public.is_admin()));
create policy "admin updates categories" on public.categories
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admin deletes categories" on public.categories
  for delete to authenticated using ((select public.is_admin()));

-- products
grant select on public.products to anon, authenticated;
grant insert, update, delete on public.products to authenticated;
create policy "public reads visible products" on public.products
  for select to anon, authenticated
  using (status in ('available', 'sold_out') or (select public.is_admin()));
create policy "admin inserts products" on public.products
  for insert to authenticated with check ((select public.is_admin()));
create policy "admin updates products" on public.products
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admin deletes products" on public.products
  for delete to authenticated using ((select public.is_admin()));

-- product_variants
grant select on public.product_variants to anon, authenticated;
grant insert, update, delete on public.product_variants to authenticated;
create policy "public reads variants of visible products" on public.product_variants
  for select to anon, authenticated
  using (
    (select public.is_admin())
    or (is_active and exists (
      select 1 from public.products p
      where p.id = product_id and p.status in ('available', 'sold_out')
    ))
  );
create policy "admin inserts variants" on public.product_variants
  for insert to authenticated with check ((select public.is_admin()));
create policy "admin updates variants" on public.product_variants
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admin deletes variants" on public.product_variants
  for delete to authenticated using ((select public.is_admin()));

-- product_images
grant select on public.product_images to anon, authenticated;
grant insert, update, delete on public.product_images to authenticated;
create policy "public reads images of visible products" on public.product_images
  for select to anon, authenticated
  using (
    (select public.is_admin())
    or exists (
      select 1 from public.products p
      where p.id = product_id and p.status in ('available', 'sold_out')
    )
  );
create policy "admin inserts images" on public.product_images
  for insert to authenticated with check ((select public.is_admin()));
create policy "admin updates images" on public.product_images
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admin deletes images" on public.product_images
  for delete to authenticated using ((select public.is_admin()));

-- catalogue view
grant select on public.product_catalog to anon, authenticated;

-- stock_movements: admin can read; rows are written only by the trigger.
grant select on public.stock_movements to authenticated;
create policy "admin reads stock log" on public.stock_movements
  for select to authenticated using ((select public.is_admin()));

-- orders: admin only. No customer can read any order, including their own.
grant select, update, delete on public.orders to authenticated;
create policy "admin reads orders" on public.orders
  for select to authenticated using ((select public.is_admin()));
create policy "admin updates orders" on public.orders
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admin deletes cancelled orders" on public.orders
  for delete to authenticated using ((select public.is_admin()) and order_status = 'cancelled');

-- order_items: admin read only.
grant select on public.order_items to authenticated;
create policy "admin reads order items" on public.order_items
  for select to authenticated using ((select public.is_admin()));

-- payments: admin read only; written by admin_record_payment().
grant select on public.payments to authenticated;
create policy "admin reads payments" on public.payments
  for select to authenticated using ((select public.is_admin()));

-- store_settings: everyone can read; only admin can change.
grant select on public.store_settings to anon, authenticated;
grant update on public.store_settings to authenticated;
create policy "public reads settings" on public.store_settings
  for select to anon, authenticated using (true);
create policy "admin updates settings" on public.store_settings
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));


-- ---------------------------------------------------------------------
-- 12. place_order: the ONLY way a customer can create an order.
--     It re-checks every price and stock level on the server, locks the
--     stock rows so two people cannot buy the last item at the same time,
--     takes the stock off (reserves it), saves the order and returns the
--     order reference.
-- ---------------------------------------------------------------------
create or replace function public.generate_order_reference()
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_bytes bytea;
  v_ref text;
  i int;
begin
  loop
    v_bytes := decode(replace(gen_random_uuid()::text, '-', ''), 'hex');
    v_ref := 'SH-' || to_char(now() at time zone 'Africa/Lagos', 'YYMMDD') || '-';
    for i in 0..5 loop
      -- skip the uuid version/variant bytes (6 and 8), which are not random
      v_ref := v_ref || substr(v_alphabet, (get_byte(v_bytes, case when i >= 3 then i + 7 else i end) % 32) + 1, 1);
    end loop;
    exit when not exists (select 1 from public.orders where reference = v_ref);
  end loop;
  return v_ref;
end;
$$;

create or replace function public.place_order(p_order jsonb)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_name     text := btrim(coalesce(p_order ->> 'customer_name', ''));
  v_phone    text := regexp_replace(coalesce(p_order ->> 'customer_phone', ''), '[\s\-\(\)]', '', 'g');
  v_email    text := nullif(btrim(coalesce(p_order ->> 'customer_email', '')), '');
  v_method   text := coalesce(p_order ->> 'fulfilment_method', '');
  v_state    text := nullif(btrim(coalesce(p_order ->> 'delivery_state', '')), '');
  v_city     text := nullif(btrim(coalesce(p_order ->> 'delivery_city', '')), '');
  v_address  text := nullif(btrim(coalesce(p_order ->> 'delivery_address', '')), '');
  v_note     text := nullif(btrim(coalesce(p_order ->> 'customer_note', '')), '');
  v_items    jsonb := p_order -> 'items';
  v_line     record;
  v_ref      text;
  v_order_id uuid;
  v_subtotal numeric(12, 2) := 0;
  v_price    numeric(12, 2);
  v_label    text;
  v_out      jsonb := '[]'::jsonb;
begin
  -- Basic checks on what the customer typed
  if char_length(v_name) < 2 or char_length(v_name) > 100 then
    raise exception 'Please enter your full name.';
  end if;
  if v_phone !~ '^\+?[0-9]{7,15}$' then
    raise exception 'Please enter a valid phone number.';
  end if;
  if v_email is not null and (char_length(v_email) > 200 or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$') then
    raise exception 'Please enter a valid email address, or leave it empty.';
  end if;
  if v_method not in ('pickup', 'delivery') then
    raise exception 'Please choose pickup or delivery.';
  end if;
  if v_method = 'delivery' and (v_state is null or v_city is null or v_address is null) then
    raise exception 'Please enter your state, city/area and delivery address.';
  end if;
  if char_length(coalesce(v_state, '')) > 60 or char_length(coalesce(v_city, '')) > 100
     or char_length(coalesce(v_address, '')) > 500 or char_length(coalesce(v_note, '')) > 1000 then
    raise exception 'Some of the details you entered are too long.';
  end if;
  if v_method = 'pickup' then
    v_state := null; v_city := null; v_address := null;
  end if;
  if v_items is null or jsonb_typeof(v_items) <> 'array'
     or jsonb_array_length(v_items) = 0 or jsonb_array_length(v_items) > 50 then
    raise exception 'Your cart is empty or too large.';
  end if;

  -- Simple anti-spam limits
  if (select count(*) from public.orders
      where customer_phone = v_phone and created_at > now() - interval '1 hour') >= 5 then
    raise exception 'Too many orders from this phone number. Please wait a little or contact us on WhatsApp.';
  end if;
  if (select count(*) from public.orders where created_at > now() - interval '10 minutes') >= 100 then
    raise exception 'We are receiving a lot of orders right now. Please try again in a few minutes.';
  end if;

  v_ref := public.generate_order_reference();
  perform set_config('app.stock_reason', 'Order ' || v_ref, true);

  -- Every cart line must point at a real product option.
  if exists (
    select 1 from jsonb_array_elements(v_items) x
    where (x ->> 'variant_id') is null
       or (x ->> 'quantity') is null
       or (x ->> 'quantity') !~ '^[0-9]{1,3}$'
       or (x ->> 'variant_id') !~ '^[0-9a-fA-F-]{36}$'
       or not exists (select 1 from public.product_variants pv where pv.id = (x ->> 'variant_id')::uuid)
  ) then
    raise exception 'One of the items in your cart is no longer available. Please remove it and try again.';
  end if;

  -- Merge duplicate lines, then lock the stock rows in a fixed order so that
  -- two checkouts at the same moment queue up instead of overselling.
  for v_line in
    with wanted as (
      select (x ->> 'variant_id')::uuid as variant_id,
             sum((x ->> 'quantity')::integer) as quantity
      from jsonb_array_elements(v_items) x
      group by 1
    )
    select w.variant_id, w.quantity,
           pv.stock, pv.size, pv.colour, pv.sku as variant_sku, pv.price as variant_price, pv.is_active,
           p.id as product_id, p.name, p.status, p.price, p.sale_price, p.sku as product_sku,
           p.unit_of_sale, p.min_order_qty
    from wanted w
    join public.product_variants pv on pv.id = w.variant_id
    join public.products p on p.id = pv.product_id
    order by w.variant_id
    for update of pv
  loop
    if not v_line.is_active or v_line.status <> 'available' then
      raise exception 'Sorry, % is no longer available. Please remove it and try again.', v_line.name;
    end if;
    if v_line.quantity < 1 or v_line.quantity > 999 then
      raise exception 'Please check the quantity for %.', v_line.name;
    end if;
    if v_line.quantity < v_line.min_order_qty then
      raise exception 'The minimum order for % is % (%).', v_line.name, v_line.min_order_qty, v_line.unit_of_sale;
    end if;
    if v_line.stock < v_line.quantity then
      if v_line.stock = 0 then
        raise exception 'Sorry, % is now sold out.', v_line.name;
      end if;
      raise exception 'Sorry, only % of % left in stock.', v_line.stock, v_line.name;
    end if;

    v_price := coalesce(v_line.variant_price, v_line.sale_price, v_line.price);
    v_label := nullif(concat_ws(' / ', v_line.size, v_line.colour), '');

    update public.product_variants set stock = stock - v_line.quantity where id = v_line.variant_id;

    v_subtotal := v_subtotal + v_price * v_line.quantity;
    v_out := v_out || jsonb_build_object(
      'product_id', v_line.product_id, 'variant_id', v_line.variant_id,
      'name', v_line.name, 'variant_label', v_label,
      'sku', coalesce(v_line.variant_sku, v_line.product_sku),
      'quantity', v_line.quantity, 'unit_of_sale', v_line.unit_of_sale,
      'unit_price', v_price, 'line_total', v_price * v_line.quantity
    );
  end loop;

  perform set_config('app.stock_reason', '', true);

  insert into public.orders (
    reference, customer_name, customer_phone, customer_email, fulfilment_method,
    delivery_state, delivery_city, delivery_address, customer_note, subtotal, delivery_fee
  ) values (
    v_ref, v_name, v_phone, v_email, v_method::public.fulfilment_method,
    v_state, v_city, v_address, v_note, v_subtotal,
    case when v_method = 'pickup' then 0 else null end
  )
  returning id into v_order_id;

  insert into public.order_items (
    order_id, product_id, variant_id, product_name, variant_label, sku,
    unit_of_sale, unit_price, quantity, line_total
  )
  select v_order_id, (i ->> 'product_id')::uuid, (i ->> 'variant_id')::uuid, i ->> 'name',
         i ->> 'variant_label', i ->> 'sku', i ->> 'unit_of_sale',
         (i ->> 'unit_price')::numeric, (i ->> 'quantity')::integer, (i ->> 'line_total')::numeric
  from jsonb_array_elements(v_out) i;

  return jsonb_build_object(
    'reference', v_ref,
    'subtotal', v_subtotal,
    'fulfilment_method', v_method,
    'items', (select jsonb_agg(i - 'product_id' - 'variant_id' - 'sku') from jsonb_array_elements(v_out) i)
  );
end;
$$;


-- ---------------------------------------------------------------------
-- 13. Admin-only actions for payments
-- ---------------------------------------------------------------------
create or replace function public.admin_record_payment(
  p_order_id uuid, p_amount numeric, p_reference text, p_notes text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Not allowed.';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'Enter the amount you received.';
  end if;
  insert into public.payments (order_id, provider, provider_reference, amount, status, notes, verified_by, verified_at)
  values (p_order_id, 'manual', nullif(btrim(p_reference), ''), p_amount, 'verified',
          nullif(btrim(p_notes), ''), auth.uid(), now());
  update public.orders set payment_status = 'paid' where id = p_order_id;
  if not found then
    raise exception 'Order not found.';
  end if;
end;
$$;

create or replace function public.admin_record_refund(
  p_order_id uuid, p_amount numeric, p_notes text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Not allowed.';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'Enter the amount you refunded.';
  end if;
  if not exists (select 1 from public.orders where id = p_order_id and payment_status = 'paid') then
    raise exception 'Only paid orders can be refunded.';
  end if;
  insert into public.payments (order_id, provider, amount, status, notes, verified_by, verified_at)
  values (p_order_id, 'manual', p_amount, 'refunded', nullif(btrim(p_notes), ''), auth.uid(), now());
  update public.orders set payment_status = 'refunded' where id = p_order_id;
end;
$$;


-- ---------------------------------------------------------------------
-- 14. Shop search (runs with the visitor's own permissions)
-- ---------------------------------------------------------------------
create or replace function public.search_products(
  p_query text default null,
  p_category text default null,
  p_min_price numeric default null,
  p_max_price numeric default null,
  p_size text default null,
  p_colour text default null,
  p_in_stock boolean default false,
  p_sort text default 'newest',
  p_limit integer default 24,
  p_offset integer default 0
)
returns setof public.product_catalog
language sql
stable
security invoker
set search_path = ''
as $$
  select *
  from public.product_catalog pc
  where pc.status in ('available', 'sold_out')
    and (p_query is null or p_query = '' or
         pc.name ilike '%' || p_query || '%' or
         pc.tags ilike '%' || p_query || '%' or
         pc.sku  ilike '%' || p_query || '%' or
         pc.category_name ilike '%' || p_query || '%')
    and (p_category is null or p_category = '' or pc.category_slug = p_category)
    and (p_min_price is null or pc.effective_price >= p_min_price)
    and (p_max_price is null or pc.effective_price <= p_max_price)
    and (p_size is null or p_size = '' or p_size = any (pc.sizes))
    and (p_colour is null or p_colour = '' or p_colour = any (pc.colours))
    and (not p_in_stock or pc.in_stock)
  order by
    case when p_sort = 'featured' then pc.is_featured end desc nulls last,
    case when p_sort = 'price_asc' then pc.effective_price end asc,
    case when p_sort = 'price_desc' then pc.effective_price end desc,
    pc.in_stock desc,
    pc.created_at desc
  limit least(greatest(coalesce(p_limit, 24), 1), 100)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

-- ---------------------------------------------------------------------
-- 15. Function permissions: nobody may run any function unless it is
--     listed here. (The admin functions also check is_admin() inside.)
-- ---------------------------------------------------------------------
revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.place_order(jsonb) to anon, authenticated;
grant execute on function public.search_products(text, text, numeric, numeric, text, text, boolean, text, integer, integer)
  to anon, authenticated;
grant execute on function public.admin_record_payment(uuid, numeric, text, text) to authenticated;
grant execute on function public.admin_record_refund(uuid, numeric, text) to authenticated;

-- Functions created later by anyone should not be callable by visitors by default.
alter default privileges in schema public revoke execute on functions from public, anon;
