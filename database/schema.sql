create extension if not exists pgcrypto;

do $$ begin
    create type public.app_role as enum ('client', 'admin');
exception when duplicate_object then null;
end $$;

do $$ begin
    create type public.booking_status as enum ('pending', 'confirmed', 'cancelled', 'rejected', 'completed');
exception when duplicate_object then null;
end $$;

do $$ begin
    create type public.receipt_kind as enum ('boleta', 'factura');
exception when duplicate_object then null;
end $$;

create table if not exists public.profiles (
    user_id uuid primary key references auth.users(id) on delete cascade,
    email text not null default '',
    first_name text not null default '',
    last_name text not null default '',
    full_name text generated always as (trim(first_name || ' ' || last_name)) stored,
    document_number text,
    phone text,
    avatar_path text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.user_roles (
    user_id uuid not null references auth.users(id) on delete cascade,
    role public.app_role not null default 'client',
    created_at timestamptz not null default now(),
    primary key (user_id, role)
);

create table if not exists public.packages (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    destination text not null,
    duration text not null,
    description text not null default '',
    price numeric(10,2) not null check (price > 0),
    available_spots integer not null default 0 check (available_spots >= 0),
    image_path text not null,
    image_url text,
    services_included text[] not null default '{}',
    services_excluded text[] not null default '{}',
    is_published boolean not null default false,
    created_by uuid references auth.users(id),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.promotions (
    id uuid primary key default gen_random_uuid(),
    package_id uuid not null references public.packages(id) on delete cascade,
    title text not null,
    discount_percent numeric(5,2) not null check (discount_percent > 0 and discount_percent <= 80),
    starts_on date not null default current_date,
    ends_on date not null,
    is_active boolean not null default true,
    created_by uuid references auth.users(id),
    created_at timestamptz not null default now(),
    check (ends_on >= starts_on)
);

create table if not exists public.bookings (
    id uuid primary key default gen_random_uuid(),
    booking_code text not null unique,
    user_id uuid not null references auth.users(id) on delete restrict,
    customer_name text not null default '',
    customer_email text not null default '',
    package_id uuid references public.packages(id) on delete set null,
    package_name text not null,
    travel_date date not null,
    passenger_count integer not null check (passenger_count > 0),
    unit_price numeric(10,2) not null check (unit_price >= 0),
    total numeric(12,2) not null check (total >= 0),
    status public.booking_status not null default 'pending',
    admin_note text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.receipts (
    id uuid primary key default gen_random_uuid(),
    receipt_number text not null unique,
    kind public.receipt_kind not null,
    booking_id uuid not null unique references public.bookings(id) on delete restrict,
    user_id uuid not null references auth.users(id) on delete restrict,
    buyer_name text not null,
    buyer_document text,
    business_name text,
    ruc text check (ruc is null or ruc ~ '^[0-9]{11}$'),
    subtotal numeric(12,2) not null check (subtotal >= 0),
    tax numeric(12,2) not null check (tax >= 0),
    total numeric(12,2) not null check (total >= 0),
    issued_by uuid references auth.users(id),
    issued_at timestamptz not null default now(),
    check ((kind = 'boleta' and ruc is null) or (kind = 'factura' and ruc is not null and business_name is not null))
);

insert into public.packages (
    id, name, destination, duration, description, price, available_spots,
    image_path, image_url, services_included, services_excluded, is_published
) values
    ('00000000-0000-4000-8000-000000000001', 'Experiencia Machu Picchu', 'Cusco', '4 Días / 3 Noches', 'Tren, entradas y guiado profesional en Machu Picchu.', 680, 12, 'seed/machu-picchu.jpg', 'https://images.unsplash.com/photo-1526392060635-9d6019884377?q=80&w=800&auto=format&fit=crop', array['Transporte turístico', 'Guía profesional', 'Entradas a Machu Picchu'], array['Almuerzos y cenas', 'Gastos personales'], true),
    ('00000000-0000-4000-8000-000000000002', 'Paracas & Huacachina', 'Ica & Paracas', 'Full Day', 'Islas Ballestas y aventura en las dunas de Huacachina.', 320, 8, 'seed/paracas.jpg', 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?q=80&w=800&auto=format&fit=crop', array['Paseo a Islas Ballestas', 'Tubulares en Huacachina', 'Guía turístico'], array['Almuerzo', 'Gastos personales'], true),
    ('00000000-0000-4000-8000-000000000003', 'Ruta del Colca Místico', 'Arequipa', '3 Días / 2 Noches', 'Cruz del Cóndor, baños termales y Chivay.', 450, 4, 'seed/colca.jpg', 'https://images.unsplash.com/photo-1589553416260-f586c8f1514f?q=80&w=800&auto=format&fit=crop', array['Transporte turístico', 'Guía profesional', 'Visita al mirador Cruz del Cóndor'], array['Alimentación no indicada', 'Gastos personales'], true)
on conflict (id) do nothing;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select exists (
        select 1 from public.user_roles
        where user_id = auth.uid() and role = 'admin'
    );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    display_name text := coalesce(new.raw_user_meta_data ->> 'full_name', '');
    name_parts text[];
begin
    name_parts := regexp_split_to_array(trim(display_name), '\s+');
    insert into public.profiles (user_id, email, first_name, last_name, document_number, phone)
    values (
        new.id,
        new.email,
        coalesce(new.raw_user_meta_data ->> 'first_name', name_parts[1], ''),
        coalesce(new.raw_user_meta_data ->> 'last_name', array_to_string(name_parts[2:], ' '), ''),
        nullif(new.raw_user_meta_data ->> 'document_number', ''),
        nullif(new.raw_user_meta_data ->> 'phone', '')
    ) on conflict (user_id) do nothing;
    insert into public.user_roles (user_id, role) values (new.id, 'client') on conflict do nothing;
    return new;
end;
$$;

create or replace function public.sync_auth_email_to_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    update public.profiles set email = new.email where user_id = new.id;
    return new;
end;
$$;

create or replace function public.sync_profile_to_bookings()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    update public.bookings
    set customer_name = new.full_name, customer_email = new.email, updated_at = now()
    where user_id = new.user_id;
    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

drop trigger if exists on_auth_user_email_updated on auth.users;
create trigger on_auth_user_email_updated
after update of email on auth.users
for each row when (old.email is distinct from new.email)
execute procedure public.sync_auth_email_to_profile();

drop trigger if exists on_profile_updated_sync_bookings on public.profiles;
create trigger on_profile_updated_sync_bookings
after update of first_name, last_name, email on public.profiles
for each row execute procedure public.sync_profile_to_bookings();

insert into public.profiles (user_id, email, first_name, last_name)
select
    id,
    email,
    coalesce(raw_user_meta_data ->> 'first_name', split_part(coalesce(raw_user_meta_data ->> 'full_name', ''), ' ', 1), ''),
    coalesce(raw_user_meta_data ->> 'last_name', nullif(trim(substr(coalesce(raw_user_meta_data ->> 'full_name', ''), position(' ' in coalesce(raw_user_meta_data ->> 'full_name', '')) + 1)), ''), '')
from auth.users
on conflict (user_id) do nothing;

insert into public.user_roles (user_id, role)
select id, 'client' from auth.users
on conflict do nothing;

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.packages enable row level security;
alter table public.promotions enable row level security;
alter table public.bookings enable row level security;
alter table public.receipts enable row level security;

create policy "profiles_select_self_or_admin" on public.profiles
for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy "profiles_insert_self" on public.profiles
for insert to authenticated with check (user_id = auth.uid());
create policy "profiles_update_self_or_admin" on public.profiles
for update to authenticated using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

create policy "roles_select_self_or_admin" on public.user_roles
for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy "roles_admin_manage" on public.user_roles
for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "packages_public_read_published" on public.packages
for select to anon, authenticated using (is_published or public.is_admin());
create policy "packages_admin_manage" on public.packages
for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "promotions_public_read_active" on public.promotions
for select to anon, authenticated using (
    is_active and current_date between starts_on and ends_on
    and exists (select 1 from public.packages p where p.id = package_id and p.is_published)
    or public.is_admin()
);
create policy "promotions_admin_manage" on public.promotions
for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "bookings_select_owner_or_admin" on public.bookings
for select to authenticated using (user_id = auth.uid() or public.is_admin());
drop policy if exists "bookings_client_create_pending" on public.bookings;
create policy "bookings_admin_update" on public.bookings
for update to authenticated using (public.is_admin()) with check (public.is_admin());

create or replace function public.create_booking(
    package_id_input uuid,
    travel_date_input date,
    passenger_count_input integer
)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
    package_row public.packages%rowtype;
    profile_row public.profiles%rowtype;
    discount_value numeric(5,2) := 0;
    unit_price_value numeric(10,2);
    booking_row public.bookings%rowtype;
begin
    if auth.uid() is null then raise exception 'Debes iniciar sesión para reservar.'; end if;
    if passenger_count_input < 1 then raise exception 'La cantidad de pasajeros debe ser mayor a cero.'; end if;
    if travel_date_input < current_date then raise exception 'La fecha de viaje debe ser futura.'; end if;
    select * into profile_row from public.profiles where user_id = auth.uid();

    select * into package_row
    from public.packages
    where id = package_id_input and is_published
    for update;
    if not found then raise exception 'El paquete no está disponible.'; end if;
    if package_row.available_spots < passenger_count_input then raise exception 'No hay cupos suficientes.'; end if;

    select coalesce(max(discount_percent), 0) into discount_value
    from public.promotions
    where package_id = package_id_input and is_active
      and current_date between starts_on and ends_on;
    unit_price_value := round(package_row.price * (1 - discount_value / 100), 2);

    insert into public.bookings (
        booking_code, user_id, customer_name, customer_email, package_id, package_name, travel_date,
        passenger_count, unit_price, total, status
    ) values (
        'RES-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10)),
        auth.uid(), profile_row.full_name, profile_row.email, package_row.id, package_row.name, travel_date_input,
        passenger_count_input, unit_price_value, unit_price_value * passenger_count_input, 'pending'
    ) returning * into booking_row;

    update public.packages
    set available_spots = available_spots - passenger_count_input, updated_at = now()
    where id = package_id_input;
    return booking_row;
end;
$$;
revoke all on function public.create_booking(uuid, date, integer) from public;
grant execute on function public.create_booking(uuid, date, integer) to authenticated;

create or replace function public.restore_spots_after_booking_cancel()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    if old.status not in ('cancelled', 'rejected')
       and new.status in ('cancelled', 'rejected')
       and old.package_id is not null then
        update public.packages
        set available_spots = available_spots + old.passenger_count, updated_at = now()
        where id = old.package_id;
    end if;
    return new;
end;
$$;

drop trigger if exists restore_spots_after_booking_cancel on public.bookings;
create trigger restore_spots_after_booking_cancel
after update of status on public.bookings
for each row execute procedure public.restore_spots_after_booking_cancel();

create or replace function public.cancel_booking(booking_id_input uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
    changed_rows integer;
begin
    update public.bookings
    set status = 'cancelled', updated_at = now()
    where id = booking_id_input and user_id = auth.uid() and status = 'pending';
    get diagnostics changed_rows = row_count;
    if changed_rows = 0 then
        raise exception 'La reserva no existe o ya no puede cancelarse.';
    end if;
end;
$$;
revoke all on function public.cancel_booking(uuid) from public;
grant execute on function public.cancel_booking(uuid) to authenticated;

create policy "receipts_select_owner_or_admin" on public.receipts
for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy "receipts_admin_issue" on public.receipts
for insert to authenticated with check (public.is_admin() and issued_by = auth.uid());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
    ('package-images', 'package-images', true, 1572864, array['image/jpeg','image/png','image/webp']),
    ('profile-avatars', 'profile-avatars', true, 2097152, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy "package_images_public_read" on storage.objects
for select to anon, authenticated using (bucket_id = 'package-images');
create policy "package_images_admin_insert" on storage.objects
for insert to authenticated with check (bucket_id = 'package-images' and public.is_admin());
create policy "package_images_admin_update" on storage.objects
for update to authenticated using (bucket_id = 'package-images' and public.is_admin()) with check (bucket_id = 'package-images' and public.is_admin());
create policy "package_images_admin_delete" on storage.objects
for delete to authenticated using (bucket_id = 'package-images' and public.is_admin());

create policy "profile_avatars_public_read" on storage.objects
for select to anon, authenticated using (bucket_id = 'profile-avatars');
create policy "profile_avatars_owner_insert" on storage.objects
for insert to authenticated with check (bucket_id = 'profile-avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "profile_avatars_owner_update" on storage.objects
for update to authenticated using (bucket_id = 'profile-avatars' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()))
with check (bucket_id = 'profile-avatars' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));
create policy "profile_avatars_owner_delete" on storage.objects
for delete to authenticated using (bucket_id = 'profile-avatars' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));

create index if not exists bookings_user_created_idx on public.bookings (user_id, created_at desc);
create index if not exists bookings_status_idx on public.bookings (status);
create index if not exists packages_published_idx on public.packages (is_published);
create index if not exists promotions_package_dates_idx on public.promotions (package_id, starts_on, ends_on);

grant usage on schema public to anon, authenticated;
grant usage on type public.app_role, public.booking_status, public.receipt_kind to anon, authenticated;
grant select on public.packages, public.promotions to anon, authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select, insert, update, delete on public.user_roles to authenticated;
grant insert, update, delete on public.packages, public.promotions to authenticated;
grant select, update on public.bookings to authenticated;
grant select, insert on public.receipts to authenticated;

-- Create the first admin account in Authentication, then assign its UUID:
-- insert into public.user_roles (user_id, role)
-- values ('YOUR-AUTH-USER-UUID', 'admin') on conflict do nothing;
