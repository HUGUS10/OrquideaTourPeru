-- =====================================================================
-- VISITA VIRTUAL 360° POR DESTINO — Orquídea Tour Perú
-- Ejecutar en Supabase > SQL Editor (después de equipo_y_finanzas.sql).
-- Se puede re-ejecutar sin error.
-- =====================================================================

alter table public.destinations add column if not exists tour_url text;
alter table public.destinations add column if not exists tour_is_360 boolean not null default false;

do $$ begin
    alter table public.destinations add constraint destinations_tour_url_https check (tour_url is null or tour_url ~ '^https://');
exception when duplicate_object then null;
end $$;

-- Almacenamiento para fotos 360° (hasta 15 MB; solo el dueño sube).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('tour-images', 'tour-images', true, 15728640, array['image/jpeg', 'image/webp'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "tour_images_public_read" on storage.objects;
create policy "tour_images_public_read" on storage.objects
for select to anon, authenticated using (bucket_id = 'tour-images');
drop policy if exists "tour_images_admin_insert" on storage.objects;
create policy "tour_images_admin_insert" on storage.objects
for insert to authenticated with check (bucket_id = 'tour-images' and public.is_admin());
drop policy if exists "tour_images_admin_update" on storage.objects;
create policy "tour_images_admin_update" on storage.objects
for update to authenticated using (bucket_id = 'tour-images' and public.is_admin()) with check (bucket_id = 'tour-images' and public.is_admin());
drop policy if exists "tour_images_admin_delete" on storage.objects;
create policy "tour_images_admin_delete" on storage.objects
for delete to authenticated using (bucket_id = 'tour-images' and public.is_admin());
