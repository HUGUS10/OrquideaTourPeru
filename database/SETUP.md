# Configuracion de Supabase

## Proyecto

El frontend usa el proyecto identificado por `rncdodmxldwcbtcrqdph` y la clave publicable guardada en `config/supabase-config.js`. La clave publicable se puede usar en el navegador; nunca pongas una `service_role` o secret key en estos archivos. La seguridad de datos depende de las politicas RLS del esquema.

## Crear tablas y politicas

1. Abre el proyecto en Supabase y entra a **SQL Editor**.
2. Abre `database/schema.sql`, copia todo el contenido y ejecutalo una vez.
3. Confirma que el bucket `package-images`, `profile-avatars`, las tablas y politicas se hayan creado.

El SQL agrega los paquetes iniciales. Las cuentas nuevas se registran con el rol `client` y su perfil se crea automaticamente.

## Crear el primer administrador

1. Registra el correo que sera administrador desde `html/registro.html`.
2. Si esta activa la confirmacion por email, confirma la cuenta e inicia sesion una vez.
3. En **SQL Editor**, reemplaza el correo del ejemplo y ejecuta:

```sql
delete from public.user_roles
where user_id = (select id from auth.users where lower(email) = lower('admin@tu-dominio.com'))
  and role = 'client';

insert into public.user_roles (user_id, role)
select id, 'admin'::public.app_role
from auth.users
where lower(email) = lower('admin@tu-dominio.com')
on conflict do nothing;
```

Cierra sesion y vuelve a iniciar. La pagina consultara el rol en `user_roles` y abrira el panel adecuado.

## Direcciones de Auth para desarrollo

En **Authentication > URL Configuration**, configura la URL del sitio y permite la direccion local que uses, por ejemplo `http://localhost:8000/**`. Sirve esta carpeta por HTTP durante el desarrollo; la confirmacion de correo no funciona de forma fiable con `file://`.

## Comprobantes

Los registros `receipts` y los archivos descargables son comprobantes internos. Para emitir comprobantes tributarios electronicos validos se necesita integrar un proveedor autorizado/SUNAT y sus credenciales en un backend seguro.
