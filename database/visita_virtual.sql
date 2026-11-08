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

-- Escenas 360° libres (CC BY-SA 4.0, autor: Johnattan Rupire, Wikimedia Commons) para Cusco.
insert into public.tour_scenes (destination_id, title, description, image_url, credit, credit_url, sort_order)
select d.id, v.title, v.description, v.image_url, 'Johnattan Rupire · CC BY-SA 4.0 · Wikimedia Commons', v.credit_url, v.sort_order
from public.destinations d
cross join (values
    (1, 'Plaza de Armas', 'Corazón de la ciudad imperial, rodeada de portales coloniales.', 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Plaza_de_armas_del_Cusco%2C_vista_360.jpg/3840px-Plaza_de_armas_del_Cusco%2C_vista_360.jpg', 'https://commons.wikimedia.org/wiki/File:Plaza_de_armas_del_Cusco,_vista_360.jpg'),
    (2, 'Catedral del Cusco', 'Joya del barroco andino construida sobre un palacio inca.', 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1d/Actual_catedra%C4%BA_del_Cusco%2C_Plaza_de_armas.jpg/3840px-Actual_catedra%C4%BA_del_Cusco%2C_Plaza_de_armas.jpg', 'https://commons.wikimedia.org/wiki/File:Actual_catedra%C4%BA_del_Cusco,_Plaza_de_armas.jpg'),
    (3, 'Iglesia de la Plaza', 'Templos coloniales que enmarcan la plaza principal.', 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9d/Vista_360_plaza_del_Cusco%2C_Iglesia.jpg/3840px-Vista_360_plaza_del_Cusco%2C_Iglesia.jpg', 'https://commons.wikimedia.org/wiki/File:Vista_360_plaza_del_Cusco,_Iglesia.jpg'),
    (4, 'Templo de la Sagrada Familia', 'Capilla colonial junto a la Catedral.', 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c7/Vista_360_del_tempro_de_La_Sagrada_Familia_en_el_Cusco.jpg/3840px-Vista_360_del_tempro_de_La_Sagrada_Familia_en_el_Cusco.jpg', 'https://commons.wikimedia.org/wiki/File:Vista_360_del_tempro_de_La_Sagrada_Familia_en_el_Cusco.jpg'),
    (5, 'Calles de San Blas', 'Subida empedrada entre Tandapata y Kiskapata, junto al mirador.', 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f3/Subida_entre_las_calles_Tandapata_y_Kiskapata%2C_al_lado_del_Mirador_de_San_Blas%2C_Cusco.jpg/3840px-Subida_entre_las_calles_Tandapata_y_Kiskapata%2C_al_lado_del_Mirador_de_San_Blas%2C_Cusco.jpg', 'https://commons.wikimedia.org/wiki/File:Subida_entre_las_calles_Tandapata_y_Kiskapata,_al_lado_del_Mirador_de_San_Blas,_Cusco.jpg'),
    (6, 'Vista de la ciudad', 'Panorámica de los techos de teja del Cusco.', 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Ciudad_del_cusco_vista_360.jpg/3840px-Ciudad_del_cusco_vista_360.jpg', 'https://commons.wikimedia.org/wiki/File:Ciudad_del_cusco_vista_360.jpg'),
    (7, 'Kusilluchayuq (Templo de los Monos)', 'Huaca inca tallada en la roca, a las afueras de la ciudad.', 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/39/Kusilluchayuq%2C_Cusco%2C_360.jpg/3840px-Kusilluchayuq%2C_Cusco%2C_360.jpg', 'https://commons.wikimedia.org/wiki/File:Kusilluchayuq,_Cusco,_360.jpg'),
    (8, 'Huaca de la Luna', 'Santuario inca de piedra rodeado de campiña andina.', 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d9/Huaca_de_la_Luna%2C_Cusco%2C_360.jpg/3840px-Huaca_de_la_Luna%2C_Cusco%2C_360.jpg', 'https://commons.wikimedia.org/wiki/File:Huaca_de_la_Luna,_Cusco,_360.jpg'),
    (9, 'Camino Inca al Antisuyu', 'Tramo original del Qhapaq Ñan que salía del Cusco.', 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/aa/Camino_Inca_al_Antisuyu_360.jpg/3840px-Camino_Inca_al_Antisuyu_360.jpg', 'https://commons.wikimedia.org/wiki/File:Camino_Inca_al_Antisuyu_360.jpg')
) as v(sort_order, title, description, image_url, credit_url)
where d.slug = 'cusco'
  and not exists (select 1 from public.tour_scenes t where t.destination_id = d.id);
