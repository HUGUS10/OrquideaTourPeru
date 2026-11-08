-- =====================================================================
-- ENDURECIMIENTO DE SEGURIDAD — Orquídea Tour Perú
-- Ejecutar AL FINAL (después de schema.sql, libro_reclamaciones.sql y
-- equipo_y_finanzas.sql). Se puede re-ejecutar sin error.
-- Principio: cada rol tiene solo los permisos mínimos que necesita.
-- RLS sigue siendo la primera barrera; esto es una segunda capa.
-- =====================================================================

-- 1. Nadie puede vaciar tablas (TRUNCATE ignora RLS) ni crear triggers/referencias.
revoke truncate, references, trigger on all tables in schema public from anon, authenticated;

-- 2. Visitantes anónimos: solo pueden LEER el catálogo público.
revoke all on public.profiles, public.user_roles, public.bookings, public.receipts,
              public.complaints, public.payments, public.expenses, public.employees,
              public.attendance, public.audit_log from anon;
revoke insert, update, delete on public.packages, public.promotions, public.destinations from anon;
grant select on public.packages, public.promotions, public.destinations to anon;

-- 3. Perfiles: el usuario solo puede editar estas columnas (no su correo ni su id).
revoke insert, update, delete on public.profiles from authenticated;
grant select on public.profiles to authenticated;
grant update (first_name, last_name, document_number, phone, avatar_path, updated_at) on public.profiles to authenticated;

-- 4. Reservas: se crean y cancelan solo por funciones seguras (create_booking,
--    cancel_booking). El personal solo puede cambiar el estado y la nota.
revoke insert, update, delete on public.bookings from authenticated;
grant select on public.bookings to authenticated;
grant update (status, admin_note, updated_at) on public.bookings to authenticated;

-- 5. Comprobantes: se emiten, nunca se editan ni borran.
revoke update, delete on public.receipts from authenticated;
grant select, insert on public.receipts to authenticated;

-- 6. Pagos y gastos: se registran o se anulan (dueño), no se editan.
revoke update on public.payments, public.expenses from authenticated;

-- 7. Reclamos: solo se crean por submit_complaint(); no se borran.
revoke insert, delete on public.complaints from authenticated;

-- 8. Asistencia: solo con clock_in()/clock_out(); RR.HH. puede corregir.
revoke insert, delete on public.attendance from authenticated;

-- 9. Auditoría: nadie puede alterarla (la escriben los triggers).
revoke insert, update, delete on public.audit_log from authenticated;
grant select on public.audit_log to authenticated;

-- 10. Funciones administrativas: nunca accesibles para anónimos.
do $$
declare
    fn text;
begin
    foreach fn in array array[
        'public.admin_list_staff()',
        'public.admin_set_user_role(uuid, text)',
        'public.admin_confirm_user_email(uuid)',
        'public.admin_set_user_password(uuid, text)',
        'public.clock_in()',
        'public.clock_out()',
        'public.create_booking(uuid, date, integer)',
        'public.cancel_booking(uuid)'
    ] loop
        execute format('revoke execute on function %s from anon, public', fn);
        execute format('grant execute on function %s to authenticated', fn);
    end loop;
end $$;

-- Funciones internas de triggers: no se exponen por la API.
revoke execute on function public.write_audit_log() from anon, authenticated, public;
revoke execute on function public.validate_payment() from anon, authenticated, public;
revoke execute on function public.handle_new_user() from anon, authenticated, public;
revoke execute on function public.sync_auth_email_to_profile() from anon, authenticated, public;
revoke execute on function public.sync_profile_to_bookings() from anon, authenticated, public;
revoke execute on function public.restore_spots_after_booking_cancel() from anon, authenticated, public;
revoke execute on function public.mark_complaint_response_time() from anon, authenticated, public;

-- 11. Libro de Reclamaciones con límite anti-spam:
--     máx. 3 por correo cada 24 h y 30 en total por hora.
create or replace function public.submit_complaint(payload jsonb)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
    new_code text;
    clean_email text := lower(trim(payload ->> 'email'));
begin
    if (select count(*) from public.complaints where email = clean_email and created_at > now() - interval '24 hours') >= 3 then
        raise exception 'Ya registraste varias reclamaciones hoy. Si es urgente escríbenos por correo.';
    end if;
    if (select count(*) from public.complaints where created_at > now() - interval '1 hour') >= 30 then
        raise exception 'Hay demasiadas solicitudes en este momento. Inténtalo en unos minutos.';
    end if;
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
        clean_email,
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

-- 12. Límite anti-abuso en reservas: máx. 10 reservas pendientes por cliente.
create or replace function public.limit_pending_bookings()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    if (select count(*) from public.bookings where user_id = new.user_id and status = 'pending') >= 10 then
        raise exception 'Tienes demasiadas reservas pendientes. Espera la confirmación de la agencia.';
    end if;
    return new;
end;
$$;
revoke execute on function public.limit_pending_bookings() from anon, authenticated, public;
drop trigger if exists bookings_limit_pending on public.bookings;
create trigger bookings_limit_pending before insert on public.bookings
for each row execute procedure public.limit_pending_bookings();

-- 13. Verificación: todas las tablas públicas deben tener RLS activo.
do $$
declare
    unprotected text;
begin
    select string_agg(tablename, ', ') into unprotected
    from pg_tables where schemaname = 'public' and not rowsecurity;
    if unprotected is not null then
        raise warning 'Tablas SIN RLS: %', unprotected;
    else
        raise notice 'OK: todas las tablas públicas tienen RLS activo.';
    end if;
end $$;
