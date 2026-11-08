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

-- ---------------------------------------------------------------------
-- Tour por escenas (varias fotos 360° por destino) + enlace a tour oficial
-- ---------------------------------------------------------------------
alter table public.destinations add column if not exists external_tour_url text;
alter table public.destinations add column if not exists external_tour_label text;

do $$ begin
    alter table public.destinations add constraint destinations_external_tour_https check (external_tour_url is null or external_tour_url ~ '^https://');
exception when duplicate_object then null;
end $$;

create table if not exists public.tour_scenes (
    id uuid primary key default gen_random_uuid(),
    destination_id uuid not null references public.destinations(id) on delete cascade,
    title text not null check (char_length(title) between 2 and 80),
    description text not null default '' check (char_length(description) <= 300),
    image_url text not null check (image_url ~ '^https://'),
    credit text check (credit is null or char_length(credit) <= 160),
    credit_url text check (credit_url is null or credit_url ~ '^https://'),
    initial_yaw numeric(6,2) not null default 0,
    initial_pitch numeric(6,2) not null default 0,
    sort_order integer not null default 0,
    created_at timestamptz not null default now()
);

create index if not exists tour_scenes_destination_idx on public.tour_scenes (destination_id, sort_order);

alter table public.tour_scenes enable row level security;
drop policy if exists "tour_scenes_public_read" on public.tour_scenes;
create policy "tour_scenes_public_read" on public.tour_scenes
for select to anon, authenticated using (
    exists (select 1 from public.destinations d where d.id = destination_id and (d.is_published or public.is_staff()))
);
drop policy if exists "tour_scenes_admin_manage" on public.tour_scenes;
create policy "tour_scenes_admin_manage" on public.tour_scenes
for all to authenticated using (public.is_admin()) with check (public.is_admin());

revoke all on public.tour_scenes from anon;
grant select on public.tour_scenes to anon, authenticated;
grant insert, update, delete on public.tour_scenes to authenticated;

drop trigger if exists audit_tour_scenes on public.tour_scenes;
create trigger audit_tour_scenes after insert or update or delete on public.tour_scenes
for each row execute procedure public.write_audit_log();

-- Enlace al tour oficial de Machu Picchu (se abre en otra pestaña).
update public.destinations
set external_tour_url = coalesce(external_tour_url, 'https://machupicchu360.com/tour-virtual-360/'),
    external_tour_label = coalesce(external_tour_label, 'Tour 360° de Machu Picchu')
where slug = 'cusco';

-- Las escenas iniciales de los destinos se cargan con database/visita_virtual_v2.sql
