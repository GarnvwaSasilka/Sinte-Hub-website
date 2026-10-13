-- =====================================================================
-- Sinte's Hub: DEMO data for testing only.
--
-- Use this on a TEST project (or before launch) to try the shop, the
-- dashboard, and the backup + restore steps. It adds sample categories,
-- products and three sample orders. Delete the demo products before you
-- go live (docs/SETUP.md explains how).
-- =====================================================================

insert into public.categories (name, slug, sort_order) values
  ('Women''s Clothing', 'womens-clothing', 1),
  ('Men''s & Unisex',   'mens-unisex',     2),
  ('Gowns',             'gowns',           3),
  ('Tops',              'tops',            4),
  ('Skirts',            'skirts',          5),
  ('Abayas',            'abayas',          6),
  ('Bubu Dresses',      'bubu-dresses',    7),
  ('Jeans',             'jeans',           8),
  ('Jerseys',           'jerseys',         9),
  ('Shoes',             'shoes',          10),
  ('Bags',              'bags',           11),
  ('Ankara Fabrics',    'ankara-fabrics', 12),
  ('Accessories',       'accessories',    13)
on conflict (slug) do nothing;

with c as (select id, slug from public.categories)
insert into public.products
  (name, slug, description, category_id, price, sale_price, sku, status, is_featured, is_bestseller,
   material, care_instructions, fit_notes, unit_of_sale, min_order_qty, tags)
values
  ('Champagne Satin Wrap Gown', 'champagne-satin-wrap-gown',
   'A flowing satin wrap gown with a soft sheen, made for weddings, dinners and special evenings.',
   (select id from c where slug = 'gowns'), 45000, null, 'DEMO-GWN-001', 'available', true, true,
   'Satin', 'Hand wash cold. Do not wring. Iron on low heat.', 'True to size. Wrap tie adjusts the waist.',
   'piece', 1, 'gown dress satin wedding owambe'),
  ('Classic Black Abaya', 'classic-black-abaya',
   'An elegant, modest black abaya with gold thread detailing on the sleeves.',
   (select id from c where slug = 'abayas'), 38000, 32000, 'DEMO-ABY-001', 'available', true, false,
   'Crepe', 'Machine wash gentle. Hang to dry.', 'Relaxed fit.', 'piece', 1, 'abaya modest black'),
  ('Adire Bubu Kaftan', 'adire-bubu-kaftan',
   'A relaxed, breezy bubu in hand-dyed adire. One size fits most.',
   (select id from c where slug = 'bubu-dresses'), 28000, null, 'DEMO-BUB-001', 'available', false, true,
   'Cotton', 'Hand wash separately. Colour may run on first wash.', 'Free size.', 'piece', 1, 'bubu kaftan adire'),
  ('High-Waist Straight Jeans', 'high-waist-straight-jeans',
   'Everyday high-waist jeans in a clean straight leg.',
   (select id from c where slug = 'jeans'), 22000, null, 'DEMO-JNS-001', 'available', false, false,
   'Denim (98% cotton, 2% elastane)', 'Wash inside out, cold.', 'Size up if between sizes.', 'piece', 1, 'jeans denim'),
  ('Super Eagles Home Jersey', 'super-eagles-home-jersey',
   'Fan jersey in green and white. Breathable and light.',
   (select id from c where slug = 'jerseys'), 15000, null, 'DEMO-JSY-001', 'available', false, true,
   'Polyester', 'Machine wash cold.', 'Regular fit.', 'piece', 1, 'jersey football nigeria'),
  ('Gold Buckle Block Heels', 'gold-buckle-block-heels',
   'Comfortable block heels with a polished gold buckle.',
   (select id from c where slug = 'shoes'), 30000, null, 'DEMO-SHO-001', 'available', true, false,
   'Faux leather', 'Wipe clean with a damp cloth.', 'Runs slightly small.', 'pair', 1, 'heels shoes'),
  ('Structured Mini Tote', 'structured-mini-tote',
   'A structured mini tote with a detachable strap. Fits a phone, purse and keys.',
   (select id from c where slug = 'bags'), 26000, null, 'DEMO-BAG-001', 'sold_out', false, false,
   'Faux leather', 'Wipe clean.', null, 'piece', 1, 'bag tote handbag'),
  ('Royal Blue Ankara Print', 'royal-blue-ankara-print',
   'Premium wax Ankara fabric in royal blue and gold. Sold per yard, minimum 6 yards.',
   (select id from c where slug = 'ankara-fabrics'), 3500, null, 'DEMO-ANK-001', 'available', true, false,
   '100% cotton wax print', 'Wash cold before sewing.', null, 'yard', 6, 'ankara fabric wax print'),
  ('Hidden Test Product', 'hidden-test-product',
   'This product is hidden and must never appear in the shop.',
   (select id from c where slug = 'tops'), 1000, null, 'DEMO-HID-001', 'hidden', false, false,
   null, null, null, 'piece', 1, 'hidden')
on conflict (slug) do nothing;

insert into public.product_variants (product_id, size, colour, sku, stock, sort_order)
select p.id, v.size, v.colour, v.sku, v.stock, v.sort_order
from (values
  ('champagne-satin-wrap-gown', 'S',  'Champagne', 'DEMO-GWN-001-S',  3, 1),
  ('champagne-satin-wrap-gown', 'M',  'Champagne', 'DEMO-GWN-001-M',  5, 2),
  ('champagne-satin-wrap-gown', 'L',  'Champagne', 'DEMO-GWN-001-L',  2, 3),
  ('classic-black-abaya',       '52', 'Black',     'DEMO-ABY-001-52', 4, 1),
  ('classic-black-abaya',       '54', 'Black',     'DEMO-ABY-001-54', 6, 2),
  ('classic-black-abaya',       '56', 'Black',     'DEMO-ABY-001-56', 1, 3),
  ('adire-bubu-kaftan',         null, 'Indigo',    'DEMO-BUB-001-IN', 8, 1),
  ('adire-bubu-kaftan',         null, 'Rust',      'DEMO-BUB-001-RU', 0, 2),
  ('high-waist-straight-jeans', '28', 'Blue',      'DEMO-JNS-001-28', 3, 1),
  ('high-waist-straight-jeans', '30', 'Blue',      'DEMO-JNS-001-30', 4, 2),
  ('high-waist-straight-jeans', '32', 'Blue',      'DEMO-JNS-001-32', 2, 3),
  ('super-eagles-home-jersey',  'M',  null,        'DEMO-JSY-001-M',  10, 1),
  ('super-eagles-home-jersey',  'L',  null,        'DEMO-JSY-001-L',  10, 2),
  ('super-eagles-home-jersey',  'XL', null,        'DEMO-JSY-001-XL', 2, 3),
  ('gold-buckle-block-heels',   '38', 'Nude',      'DEMO-SHO-001-38', 2, 1),
  ('gold-buckle-block-heels',   '39', 'Nude',      'DEMO-SHO-001-39', 3, 2),
  ('gold-buckle-block-heels',   '40', 'Black',     'DEMO-SHO-001-40', 1, 3),
  ('structured-mini-tote',      null, 'Tan',       'DEMO-BAG-001-TN', 0, 1),
  ('royal-blue-ankara-print',   null, null,        'DEMO-ANK-001',    60, 1),
  ('hidden-test-product',       'M',  null,        'DEMO-HID-001-M',  5, 1)
) as v(slug, size, colour, sku, stock, sort_order)
join public.products p on p.slug = v.slug
on conflict do nothing;

update public.store_settings set
  whatsapp_number     = coalesce(whatsapp_number, '2348000000000'),
  pickup_area         = coalesce(pickup_area, 'Lekki Phase 1, Lagos (exact address shared after confirmation)'),
  pickup_instructions = coalesce(pickup_instructions, 'We will send the pickup address and opening hours on WhatsApp once your order is confirmed.'),
  hero_title          = coalesce(hero_title, 'Affordable luxury, made for you'),
  hero_subtitle       = coalesce(hero_subtitle, 'Gowns, abayas, bubus, jeans, shoes, bags and premium Ankara fabrics.')
where id = 1;

-- Three sample orders, placed through the same checkout function the
-- website uses, so stock goes down exactly as it would for a real order.
select public.place_order(jsonb_build_object(
  'customer_name', 'Demo Customer One', 'customer_phone', '08011111111',
  'fulfilment_method', 'pickup',
  'items', jsonb_build_array(
    jsonb_build_object('variant_id', (select id from public.product_variants where sku = 'DEMO-GWN-001-M'), 'quantity', 1),
    jsonb_build_object('variant_id', (select id from public.product_variants where sku = 'DEMO-JSY-001-L'), 'quantity', 2)
  )));

select public.place_order(jsonb_build_object(
  'customer_name', 'Demo Customer Two', 'customer_phone', '08022222222',
  'customer_email', 'demo.two@example.com',
  'fulfilment_method', 'delivery', 'delivery_state', 'Lagos', 'delivery_city', 'Yaba',
  'delivery_address', '12 Demo Street', 'customer_note', 'Please call before delivery.',
  'items', jsonb_build_array(
    jsonb_build_object('variant_id', (select id from public.product_variants where sku = 'DEMO-ABY-001-54'), 'quantity', 1),
    jsonb_build_object('variant_id', (select id from public.product_variants where sku = 'DEMO-ANK-001'), 'quantity', 6)
  )));

select public.place_order(jsonb_build_object(
  'customer_name', 'Demo Customer Three', 'customer_phone', '08033333333',
  'fulfilment_method', 'delivery', 'delivery_state', 'Abuja (FCT)', 'delivery_city', 'Wuse 2',
  'delivery_address', '4 Sample Close',
  'items', jsonb_build_array(
    jsonb_build_object('variant_id', (select id from public.product_variants where sku = 'DEMO-SHO-001-39'), 'quantity', 1)
  )));
