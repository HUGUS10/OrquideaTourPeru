-- =====================================================================
-- LIBRO DE RECLAMACIONES VIRTUAL (Orquídea Tour Perú)
-- Ejecutar una vez en Supabase > SQL Editor. Se puede re-ejecutar sin error.
-- =====================================================================

create sequence if not exists public.complaints_seq;

create table if not exists public.complaints (
    id uuid primary key default gen_random_uuid(),
    complaint_code text not null unique,
    kind text not null check (kind in ('reclamo', 'queja')),
    consumer_name text not null check (char_length(consumer_name) between 3 and 150),
    document_type text not null check (document_type in ('DNI', 'CE', 'Pasaporte', 'RUC')),
    document_number text not null check (char_length(document_number) between 6 and 20),
    address text not null check (char_length(address) between 5 and 250),
    phone text check (phone is null or char_length(phone) <= 20),
    email text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(email) <= 150),
    is_minor boolean not null default false,
    guardian_name text check (guardian_name is null or char_length(guardian_name) <= 150),
    good_type text not null check (good_type in ('producto', 'servicio')),
    claimed_amount numeric(12,2) check (claimed_amount is null or claimed_amount >= 0),
    good_description text not null check (char_length(good_description) between 3 and 500),
    detail text not null check (char_length(detail) between 10 and 3000),
    request text not null check (char_length(request) between 5 and 1500),
    status text not null default 'pendiente' check (status in ('pendiente', 'en_proceso', 'respondido')),
    response text check (response is null or char_length(response) <= 3000),
    responded_at timestamptz,
    responded_by uuid references auth.users(id) on delete set null,
    user_id uuid references auth.users(id) on delete set null,
    created_at timestamptz not null default now(),
    check (not is_minor or guardian_name is not null)
);

alter table public.complaints enable row level security;

drop policy if exists "complaints_admin_select" on public.complaints;
create policy "complaints_admin_select" on public.complaints
for select to authenticated using (public.is_admin() or user_id = auth.uid());

drop policy if exists "complaints_admin_update" on public.complaints;
create policy "complaints_admin_update" on public.complaints
for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- Registro público (visitantes sin cuenta también pueden reclamar).
create or replace function public.submit_complaint(payload jsonb)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
    new_code text;
begin
    new_code := 'LR-' || to_char(now() at time zone 'America/Lima', 'YYYY') || '-' || lpad(nextval('public.complaints_seq')::text, 6, '0');
    insert into public.complaints (
        complaint_code, kind, consumer_name, document_type, document_number, address, phone, email,
        is_minor, guardian_name, good_type, claimed_amount, good_description, detail, request, user_id
    ) values (
        new_code,
        payload ->> 'kind',
        trim(payload ->> 'consumer_name'),
        payload ->> 'document_type',
        trim(payload ->> 'document_number'),
        trim(payload ->> 'address'),
        nullif(trim(payload ->> 'phone'), ''),
        lower(trim(payload ->> 'email')),
        coalesce((payload ->> 'is_minor')::boolean, false),
        nullif(trim(payload ->> 'guardian_name'), ''),
        payload ->> 'good_type',
        nullif(payload ->> 'claimed_amount', '')::numeric,
        trim(payload ->> 'good_description'),
        trim(payload ->> 'detail'),
        trim(payload ->> 'request'),
        auth.uid()
    );
    return new_code;
end;
$$;

revoke all on function public.submit_complaint(jsonb) from public;
grant execute on function public.submit_complaint(jsonb) to anon, authenticated;

create or replace function public.mark_complaint_response_time()
returns trigger
language plpgsql
as $$
begin
    if new.response is distinct from old.response and new.response is not null then
        new.responded_at := now();
        new.responded_by := auth.uid();
        new.status := 'respondido';
    end if;
    return new;
end;
$$;

drop trigger if exists complaints_response_time on public.complaints;
create trigger complaints_response_time
before update on public.complaints
for each row execute procedure public.mark_complaint_response_time();

grant select, update on public.complaints to authenticated;
create index if not exists complaints_created_idx on public.complaints (created_at desc);
create index if not exists complaints_status_idx on public.complaints (status);
