-- Sinte's Hub: clean start
-- Use ONLY on a new project with no real data, when the setup file stopped halfway.
-- It removes anything the setup file managed to create, so it can run again from the top.
drop view if exists public.product_catalog cascade;
drop table if exists public.payments, public.order_items, public.orders, public.stock_movements,
  public.product_images, public.product_variants, public.products, public.categories,
  public.store_settings, public.admin_users cascade;
drop function if exists public.place_order, public.admin_record_payment, public.admin_record_refund,
  public.search_products, public.is_admin, public.guard_order_update, public.block_order_item_changes,
  public.log_stock_movement, public.generate_order_reference, public.set_updated_at cascade;
drop type if exists public.product_status, public.fulfilment_method, public.order_status,
  public.payment_status, public.payment_record_status cascade;
