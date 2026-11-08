-- =====================================================================
-- EQUIPO (roles de ayudantes), CAJA, GASTOS, RR.HH., ASISTENCIA Y AUDITORÍA
-- Orquídea Tour Perú — ejecutar en Supabase > SQL Editor (después de schema.sql
-- y libro_reclamaciones.sql). Se puede re-ejecutar sin error.
-- =====================================================================

-- 1. Nuevos roles ---------------------------------------------------------
alter type public.app_role add value if not exists 'cajero';
alter type public.app_role add value if not exists 'agente';
alter type public.app_role add value if not exists 'rrhh';
alter type public.app_role add value if not exists 'atencion';

-- Se comparan como texto para poder usarlos en la misma ejecución.
create or replace function public.has_any_role(roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select exists (
        select 1 from public.user_roles
        where user_id = auth.uid() and role::text = any(roles)
    );
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select public.has_any_role(array['admin', 'cajero', 'agente', 'rrhh', 'atencion']);
$$;

grant execute on function public.has_any_role(text[]) to authenticated;
grant execute on function public.is_staff() to authenticated;

-- 2. Tablas nuevas --------------------------------------------------------
create table if not exists public.payments (
    id uuid primary key default gen_random_uuid(),
    booking_id uuid not null references public.bookings(id) on delete restrict,
    amount numeric(12,2) not null check (amount > 0),
    method text not null check (method in ('efectivo', 'yape', 'plin', 'transferencia', 'tarjeta', 'otro')),
    reference text check (reference is null or char_length(reference) <= 120),
    note text check (note is null or char_length(note) <= 500),
    received_by uuid references auth.users(id) on delete set null default auth.uid(),
    created_at timestamptz not null default now()
);

create table if not exists public.expenses (
    id uuid primary key default gen_random_uuid(),
    category text not null check (category in ('planilla', 'proveedores', 'transporte', 'hospedaje', 'entradas', 'publicidad', 'servicios', 'alquiler', 'impuestos', 'otros')),
    description text not null check (char_length(description) between 3 and 300),
    amount numeric(12,2) not null check (amount > 0),
    method text not null default 'efectivo' check (method in ('efectivo', 'yape', 'plin', 'transferencia', 'tarjeta', 'otro')),
    spent_on date not null default ((now() at time zone 'America/Lima')::date),
    registered_by uuid references auth.users(id) on delete set null default auth.uid(),
    created_at timestamptz not null default now()
);

create table if not exists public.employees (
    id uuid primary key default gen_random_uuid(),
    user_id uuid unique references auth.users(id) on delete set null,
    full_name text not null check (char_length(full_name) between 3 and 150),
    document_number text check (document_number is null or char_length(document_number) <= 20),
    position text not null default 'Asistente' check (char_length(position) <= 80),
    area text not null default 'Operaciones' check (char_length(area) <= 80),
    phone text check (phone is null or char_length(phone) <= 20),
    email text check (email is null or char_length(email) <= 150),
    hire_date date not null default current_date,
    salary numeric(10,2) not null default 0 check (salary >= 0),
    status text not null default 'activo' check (status in ('activo', 'vacaciones', 'licencia', 'cesado')),
    notes text check (notes is null or char_length(notes) <= 1000),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.attendance (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    work_date date not null default ((now() at time zone 'America/Lima')::date),
    check_in timestamptz,
    check_out timestamptz,
    note text check (note is null or char_length(note) <= 300),
    unique (user_id, work_date)
);

create table if not exists public.audit_log (
    id bigserial primary key,
    actor uuid,
    actor_email text,
    table_name text not null,
    action text not null,
    record_id text,
    summary jsonb,
    created_at timestamptz not null default now()
);

create index if not exists payments_booking_idx on public.payments (booking_id);
create index if not exists payments_created_idx on public.payments (created_at desc);
create index if not exists expenses_spent_idx on public.expenses (spent_on desc);
create index if not exists attendance_date_idx on public.attendance (work_date desc);
create index if not exists audit_created_idx on public.audit_log (created_at desc);

-- 3. Validación de pagos: no cobrar más del total ni reservas canceladas ---
create or replace function public.validate_payment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    booking_row public.bookings%rowtype;
    already_paid numeric(12,2);
begin
    select * into booking_row from public.bookings where id = new.booking_id for update;
    if not found then raise exception 'La reserva no existe.'; end if;
    if booking_row.status in ('cancelled', 'rejected') then
        raise exception 'No se puede cobrar una reserva cancelada.';
    end if;
    select coalesce(sum(amount), 0) into already_paid from public.payments where booking_id = new.booking_id;
    if already_paid + new.amount > booking_row.total then
        raise exception 'El pago supera el saldo pendiente (S/ %).', booking_row.total - already_paid;
    end if;
    new.received_by := auth.uid();
    return new;
end;
$$;

drop trigger if exists payments_validate on public.payments;
create trigger payments_validate before insert on public.payments
for each row execute procedure public.validate_payment();

-- 4. Auditoría automática -------------------------------------------------
create or replace function public.write_audit_log()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    row_data jsonb := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
    old_data jsonb := case when tg_op = 'UPDATE' then to_jsonb(old) else null end;
    summary_data jsonb;
begin
    summary_data := row_data - 'image_url' - 'image_path' - 'description' - 'services_included' - 'services_excluded' - 'detail' - 'request' - 'response' - 'notes';
    if old_data is not null and old_data ? 'status' then
        summary_data := summary_data || jsonb_build_object('previous_status', old_data ->> 'status');
    end if;
    insert into public.audit_log (actor, actor_email, table_name, action, record_id, summary)
    values (
        auth.uid(),
        (select email from public.profiles where user_id = auth.uid()),
        tg_table_name,
        tg_op,
        coalesce(row_data ->> 'booking_code', row_data ->> 'complaint_code', row_data ->> 'receipt_number', row_data ->> 'name', row_data ->> 'full_name', row_data ->> 'id', row_data ->> 'user_id'),
        summary_data
    );
    return null;
end;
$$;

do $$
declare
    audited text;
begin
    foreach audited in array array['bookings', 'payments', 'expenses', 'packages', 'promotions', 'receipts', 'complaints', 'employees', 'user_roles'] loop
        execute format('drop trigger if exists audit_%1$s on public.%1$I', audited);
        execute format('create trigger audit_%1$s after insert or update or delete on public.%1$I for each row execute procedure public.write_audit_log()', audited);
    end loop;
end $$;

-- 5. Funciones del dueño para gestionar el equipo -------------------------
create or replace function public.admin_list_staff()
returns table (user_id uuid, email text, full_name text, phone text, role text, created_at timestamptz, last_sign_in_at timestamptz, email_confirmed boolean)
language sql
stable
security definer
set search_path = public
as $$
    select r.user_id, p.email, p.full_name, p.phone, r.role::text, r.created_at, u.last_sign_in_at, u.email_confirmed_at is not null
    from public.user_roles r
    join public.profiles p on p.user_id = r.user_id
    join auth.users u on u.id = r.user_id
    where public.is_admin() and r.role::text <> 'client'
    order by r.role::text, p.full_name;
$$;

create or replace function public.admin_set_user_role(target_user uuid, new_role text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
    profile_row public.profiles%rowtype;
begin
    if not public.is_admin() then raise exception 'Solo el dueño puede asignar roles.'; end if;
    if new_role not in ('client', 'admin', 'cajero', 'agente', 'rrhh', 'atencion') then raise exception 'Rol no válido.'; end if;
    if target_user = auth.uid() and new_role <> 'admin' then raise exception 'No puedes quitarte tu propio acceso de dueño.'; end if;
    delete from public.user_roles where user_id = target_user;
    insert into public.user_roles (user_id, role) values (target_user, new_role::public.app_role);
    if new_role <> 'client' then
        select * into profile_row from public.profiles where user_id = target_user;
        insert into public.employees (user_id, full_name, document_number, phone, email, position, area)
        values (
            target_user, coalesce(nullif(profile_row.full_name, ''), profile_row.email, 'Sin nombre'), profile_row.document_number, profile_row.phone, profile_row.email,
            case new_role when 'admin' then 'Administrador' when 'cajero' then 'Cajero' when 'agente' then 'Agente de reservas' when 'rrhh' then 'Recursos Humanos' else 'Atención al cliente' end,
            case new_role when 'cajero' then 'Caja' when 'rrhh' then 'Recursos Humanos' when 'atencion' then 'Atención al cliente' when 'admin' then 'Gerencia' else 'Operaciones' end
        )
        on conflict (user_id) do update set status = case when public.employees.status = 'cesado' then 'activo' else public.employees.status end;
    else
        update public.employees set status = 'cesado', updated_at = now() where user_id = target_user;
    end if;
end;
$$;

create or replace function public.admin_confirm_user_email(target_user uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
    if not public.is_admin() then raise exception 'Solo el dueño puede activar cuentas.'; end if;
    update auth.users set email_confirmed_at = coalesce(email_confirmed_at, now()) where id = target_user;
end;
$$;

create or replace function public.admin_set_user_password(target_user uuid, new_password text)
returns void
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
begin
    if not public.is_admin() then raise exception 'Solo el dueño puede cambiar contraseñas.'; end if;
    if char_length(new_password) < 8 then raise exception 'La contraseña debe tener al menos 8 caracteres.'; end if;
    if not exists (select 1 from public.user_roles where user_id = target_user and role::text <> 'client') then
        raise exception 'Solo se puede cambiar la contraseña de miembros del equipo.';
    end if;
    update auth.users set encrypted_password = extensions.crypt(new_password, extensions.gen_salt('bf')), updated_at = now() where id = target_user;
end;
$$;

-- 6. Asistencia: cada miembro del equipo marca su entrada/salida ----------
create or replace function public.clock_in()
returns public.attendance
language plpgsql
security definer
set search_path = public
as $$
declare
    result public.attendance%rowtype;
begin
    if not public.is_staff() then raise exception 'Solo el personal puede marcar asistencia.'; end if;
    insert into public.attendance (user_id, check_in) values (auth.uid(), now())
    on conflict (user_id, work_date) do update set check_in = coalesce(public.attendance.check_in, excluded.check_in)
    returning * into result;
    return result;
end;
$$;

create or replace function public.clock_out()
returns public.attendance
language plpgsql
security definer
set search_path = public
as $$
declare
    result public.attendance%rowtype;
begin
    if not public.is_staff() then raise exception 'Solo el personal puede marcar asistencia.'; end if;
    update public.attendance set check_out = now()
    where user_id = auth.uid() and work_date = (now() at time zone 'America/Lima')::date and check_in is not null
    returning * into result;
    if not found then raise exception 'Primero marca tu entrada de hoy.'; end if;
    return result;
end;
$$;

revoke all on function public.admin_list_staff() from public;
revoke all on function public.admin_set_user_role(uuid, text) from public;
revoke all on function public.admin_confirm_user_email(uuid) from public;
revoke all on function public.admin_set_user_password(uuid, text) from public;
revoke all on function public.clock_in() from public;
revoke all on function public.clock_out() from public;
grant execute on function public.admin_list_staff() to authenticated;
grant execute on function public.admin_set_user_role(uuid, text) to authenticated;
grant execute on function public.admin_confirm_user_email(uuid) to authenticated;
grant execute on function public.admin_set_user_password(uuid, text) to authenticated;
grant execute on function public.clock_in() to authenticated;
grant execute on function public.clock_out() to authenticated;

-- 7. Permisos (RLS) por rol -----------------------------------------------
alter table public.payments enable row level security;
alter table public.expenses enable row level security;
alter table public.employees enable row level security;
alter table public.attendance enable row level security;
alter table public.audit_log enable row level security;

-- Reservas: el personal las ve; dueño, cajero y agente las gestionan.
drop policy if exists "bookings_select_owner_or_admin" on public.bookings;
create policy "bookings_select_owner_or_admin" on public.bookings
for select to authenticated using (user_id = auth.uid() or public.is_staff());
drop policy if exists "bookings_admin_update" on public.bookings;
create policy "bookings_admin_update" on public.bookings
for update to authenticated using (public.has_any_role(array['admin', 'cajero', 'agente']))
with check (public.has_any_role(array['admin', 'cajero', 'agente']));

-- Perfiles: el personal puede ver datos de clientes.
drop policy if exists "profiles_select_self_or_admin" on public.profiles;
create policy "profiles_select_self_or_admin" on public.profiles
for select to authenticated using (user_id = auth.uid() or public.is_staff());

-- Paquetes ocultos visibles para el personal.
drop policy if exists "packages_public_read_published" on public.packages;
create policy "packages_public_read_published" on public.packages
for select to anon, authenticated using (is_published or public.is_staff());

drop policy if exists "promotions_public_read_active" on public.promotions;
create policy "promotions_public_read_active" on public.promotions
for select to anon, authenticated using (
    (is_active and current_date between starts_on and ends_on
     and exists (select 1 from public.packages p where p.id = package_id and p.is_published))
    or public.is_staff()
);

-- Comprobantes: el cajero también emite.
drop policy if exists "receipts_select_owner_or_admin" on public.receipts;
create policy "receipts_select_owner_or_admin" on public.receipts
for select to authenticated using (user_id = auth.uid() or public.is_staff());
drop policy if exists "receipts_admin_issue" on public.receipts;
create policy "receipts_admin_issue" on public.receipts
for insert to authenticated with check (public.has_any_role(array['admin', 'cajero']) and issued_by = auth.uid());

-- Reclamaciones: dueño y atención al cliente.
drop policy if exists "complaints_admin_select" on public.complaints;
create policy "complaints_admin_select" on public.complaints
for select to authenticated using (public.has_any_role(array['admin', 'atencion']) or user_id = auth.uid());
drop policy if exists "complaints_admin_update" on public.complaints;
create policy "complaints_admin_update" on public.complaints
for update to authenticated using (public.has_any_role(array['admin', 'atencion']))
with check (public.has_any_role(array['admin', 'atencion']));

-- Pagos
drop policy if exists "payments_staff_select" on public.payments;
create policy "payments_staff_select" on public.payments
for select to authenticated using (
    public.has_any_role(array['admin', 'cajero', 'agente'])
    or exists (select 1 from public.bookings b where b.id = booking_id and b.user_id = auth.uid())
);
drop policy if exists "payments_cashier_insert" on public.payments;
create policy "payments_cashier_insert" on public.payments
for insert to authenticated with check (public.has_any_role(array['admin', 'cajero']));
drop policy if exists "payments_admin_delete" on public.payments;
create policy "payments_admin_delete" on public.payments
for delete to authenticated using (public.is_admin());

-- Gastos
drop policy if exists "expenses_select" on public.expenses;
create policy "expenses_select" on public.expenses
for select to authenticated using (public.has_any_role(array['admin', 'cajero']));
drop policy if exists "expenses_insert" on public.expenses;
create policy "expenses_insert" on public.expenses
for insert to authenticated with check (public.has_any_role(array['admin', 'cajero']));
drop policy if exists "expenses_admin_delete" on public.expenses;
create policy "expenses_admin_delete" on public.expenses
for delete to authenticated using (public.is_admin());

-- Personal (RR.HH.)
drop policy if exists "employees_select" on public.employees;
create policy "employees_select" on public.employees
for select to authenticated using (public.has_any_role(array['admin', 'rrhh']) or user_id = auth.uid());
drop policy if exists "employees_manage" on public.employees;
create policy "employees_manage" on public.employees
for all to authenticated using (public.has_any_role(array['admin', 'rrhh']))
with check (public.has_any_role(array['admin', 'rrhh']));

-- Asistencia
drop policy if exists "attendance_select" on public.attendance;
create policy "attendance_select" on public.attendance
for select to authenticated using (user_id = auth.uid() or public.has_any_role(array['admin', 'rrhh']));
drop policy if exists "attendance_hr_update" on public.attendance;
create policy "attendance_hr_update" on public.attendance
for update to authenticated using (public.has_any_role(array['admin', 'rrhh']))
with check (public.has_any_role(array['admin', 'rrhh']));

-- Auditoría: solo el dueño.
drop policy if exists "audit_admin_select" on public.audit_log;
create policy "audit_admin_select" on public.audit_log
for select to authenticated using (public.is_admin());

grant select, insert, delete on public.payments to authenticated;
grant select, insert, delete on public.expenses to authenticated;
grant select, insert, update, delete on public.employees to authenticated;
grant select, update on public.attendance to authenticated;
grant select on public.audit_log to authenticated;
grant usage, select on sequence public.audit_log_id_seq to authenticated;

-- 8. Ficha de empleado para el dueño actual --------------------------------
insert into public.employees (user_id, full_name, email, position, area)
select r.user_id, coalesce(nullif(p.full_name, ''), p.email), p.email, 'Dueño / Gerente', 'Gerencia'
from public.user_roles r join public.profiles p on p.user_id = r.user_id
where r.role::text = 'admin'
on conflict (user_id) do nothing;

-- 9. Destinos administrables -----------------------------------------------
create table if not exists public.destinations (
    id uuid primary key default gen_random_uuid(),
    slug text not null unique check (slug ~ '^[a-z0-9-]{2,40}$'),
    name text not null check (char_length(name) between 2 and 80),
    region text not null default '' check (char_length(region) <= 40),
    description text not null default '' check (char_length(description) <= 300),
    keywords text[] not null default '{}',
    image_path text,
    image_url text,
    sort_order integer not null default 0,
    is_published boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

alter table public.destinations enable row level security;
drop policy if exists "destinations_public_read" on public.destinations;
create policy "destinations_public_read" on public.destinations
for select to anon, authenticated using (is_published or public.is_staff());
drop policy if exists "destinations_admin_manage" on public.destinations;
create policy "destinations_admin_manage" on public.destinations
for all to authenticated using (public.is_admin()) with check (public.is_admin());
grant select on public.destinations to anon, authenticated;
grant insert, update, delete on public.destinations to authenticated;

insert into public.destinations (slug, name, region, description, keywords, image_url, sort_order) values
    ('cusco', 'Cusco & Machu Picchu', 'Sierra Sur', 'Capital histórica del Imperio Inca. Explora ciudadelas ancestrales y la maravilla del mundo.', array['cusco', 'machu', 'picchu', 'valle sagrado'], 'https://images.unsplash.com/photo-1526392060635-9d6019884377?q=75&w=900&auto=format&fit=crop', 1),
    ('arequipa', 'Arequipa & Colca', 'Sur del Perú', 'La Ciudad Blanca rodeada de imponentes volcanes y uno de los cañones más profundos.', array['arequipa', 'colca'], 'https://images.unsplash.com/photo-1589553416260-f586c8f1514f?q=75&w=900&auto=format&fit=crop', 2),
    ('ica', 'Paracas & Huacachina', 'Costa Sur', 'Oasis rodeado de dunas espectaculares y reserva marina abundante en vida silvestre.', array['ica', 'paracas', 'huacachina', 'ballestas'], 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?q=75&w=900&auto=format&fit=crop', 3),
    ('puno', 'Puno & Titicaca', 'Altiplano', 'Navega por el lago navegable más alto del mundo y descubre las islas flotantes de los Uros.', array['puno', 'titicaca', 'uros'], 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?q=75&w=900&auto=format&fit=crop', 4)
on conflict (slug) do nothing;

drop trigger if exists audit_destinations on public.destinations;
create trigger audit_destinations after insert or update or delete on public.destinations
for each row execute procedure public.write_audit_log();
