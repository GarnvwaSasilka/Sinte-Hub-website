-- =====================================================================
-- Sinte's Hub: photo storage
--
-- Creates the "product-images" bucket. Anyone can VIEW photos (they are
-- shown in the shop), but only the admin can upload, replace or delete.
-- Uploads are limited to JPEG, PNG and WebP images of up to 5 MB. The
-- dashboard also shrinks every photo in the browser before upload.
-- =====================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy "admin uploads product images" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'product-images' and (select public.is_admin()));

create policy "admin updates product images" on storage.objects
  for update to authenticated
  using (bucket_id = 'product-images' and (select public.is_admin()))
  with check (bucket_id = 'product-images' and (select public.is_admin()));

create policy "admin deletes product images" on storage.objects
  for delete to authenticated
  using (bucket_id = 'product-images' and (select public.is_admin()));

-- The admin needs to list files (for example when replacing a photo).
-- Public visitors do not need this: public photo links work without it.
create policy "admin lists product images" on storage.objects
  for select to authenticated
  using (bucket_id = 'product-images' and (select public.is_admin()));
