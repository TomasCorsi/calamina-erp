# LEGACY / REFERENCE — SEC-02 — Registro seguro mediante invitaciones

> Documento histórico del sistema legacy; no es una migración base de ERP v2.

> **ESTADO: EXPAND IMPLEMENTADO LOCALMENTE — NO DESPLEGADO**

Fecha de preparación: 2026-09-30

Rama local: `auditoria-tecnica`

Esta iteración agrega únicamente la infraestructura compatible de EXPAND. No
habilita todavía el flujo de invitaciones en la aplicación y no retira ningún
mecanismo de registro existente.

## Resultado de EXPAND

La migración local
`supabase/migrations/20260930200000_sec02_expand_registration_invitations.sql`
incorpora:

- la tabla privada `public.registration_invitations`;
- las RPC administrativas para crear y revocar invitaciones;
- una rama nueva por invitación en `public.handle_new_user`;
- el flujo legacy por legajo sin cambios de comportamiento.

No se modificaron frontend, rutas, `ProtectedRoute`, tipos generados, módulos
financieros, datos existentes ni migraciones históricas. Tampoco se modificó el
trabajo local pendiente de SEC-01.

## Modelo de invitación

`registration_invitations` conserva:

- `id`;
- `token_hash`;
- `email_normalized`;
- `display_name`;
- `personal_id` opcional sólo para `contador`;
- `role`;
- `created_by` y `created_at`;
- `expires_at`;
- `used_by` y `used_at`;
- `revoked_by` y `revoked_at`.

El token tiene 32 bytes aleatorios, se entrega una sola vez como 64 caracteres
hexadecimales y se almacena únicamente como SHA-256. El texto del token no tiene
columna persistente.

Las invitaciones vencen a las 72 horas. Los índices únicos parciales impiden más
de una invitación pendiente por email normalizado o por registro de personal.
Reemitir una invitación revoca atómicamente cualquier invitación no consumida y
no revocada para el mismo email o personal, aunque ya haya vencido.

`created_by`, `used_by` y `revoked_by` usan `ON DELETE SET NULL`: eliminar una
cuenta no elimina ni bloquea el historial de invitaciones. Los timestamps de
creación, uso y revocación se conservan. Mientras el actor exista, un
`used_by` o `revoked_by` no nulo exige su timestamp; después de eliminarlo, el
actor puede quedar nulo con el timestamp histórico presente. Una invitación no
puede estar consumida y revocada simultáneamente.

`personal_id` conserva `ON DELETE RESTRICT`. A diferencia de los actores de
auditoría, identifica el registro laboral objeto de la invitación; permitir que
desaparezca reduciría la trazabilidad. En consecuencia, un personal con
historial de invitaciones no puede eliminarse sin resolver antes ese historial.

### Restricción de administradores

Este flujo no puede crear administradores.

La prohibición se aplica en tres niveles:

1. constraint de tabla `registration_invitations_no_admin`;
2. validación de `admin_create_registration_invitation`;
3. validación defensiva de `handle_new_user`.

No existe en esta fase un mecanismo alternativo para invitar o crear nuevos
administradores. Esa operación queda fuera del flujo normal y fuera de EXPAND.

Los roles `capataz`, `maquinista`, `ayudante` y `remitero` requieren
`personal_id`. `contador` puede crearse sin personal, aunque si se especifica
uno debe existir, estar activo y no estar vinculado.

### Separación entre clasificación laboral y autorización

`personal.rol` representa la clasificación laboral del personal.
`registration_invitations.role`, que luego se copia a `user_roles.role`,
representa la autorización seleccionada explícitamente por el administrador.
No se exige ni se infiere coincidencia entre ambos valores. La prohibición de
`admin` y el requisito de personal para roles operativos siguen aplicándose.

## RPC administrativas

### `admin_create_registration_invitation`

Firma:

```sql
public.admin_create_registration_invitation(
  p_email text,
  p_display_name text,
  p_role public.app_role,
  p_personal_id uuid DEFAULT NULL
)
RETURNS TABLE (
  invitation_id uuid,
  token text,
  expires_at timestamptz
)
```

La función es `SECURITY DEFINER`, usa `search_path = pg_catalog` y referencias
totalmente calificadas. Requiere `auth.uid()` y comprueba directamente que el
actor tenga `admin` en `public.user_roles`; no confía en datos enviados por el
frontend.

Normaliza email y nombre, serializa y bloquea primero las invitaciones
conflictivas, después bloquea el personal cuando existe y comprueba que siga
activo y sin vincular. Luego genera el token con `pgcrypto`, almacena sólo su
hash y registra al administrador creador. El orden invitación → personal
coincide con el trigger para evitar interbloqueos.

### `admin_revoke_registration_invitation`

Firma:

```sql
public.admin_revoke_registration_invitation(
  p_invitation_id uuid
)
RETURNS boolean
```

También verifica el rol admin en servidor y bloquea la fila. Rechaza IDs
inexistentes e invitaciones consumidas. La primera revocación registra actor y
fecha; los reintentos sobre una invitación ya revocada retornan `true` sin
cambiar la auditoría original.

## Permisos

La tabla tiene RLS habilitado y no tiene policies. Se revocaron todos los
privilegios directos de `PUBLIC`, `anon` y `authenticated`.

Las dos RPC revocan `EXECUTE` de `PUBLIC` y `anon`, y lo conceden a
`authenticated`. Ese grant sólo permite entrar a la función: cada RPC vuelve a
verificar el rol admin antes de acceder a datos.

No existe una RPC de listado en EXPAND y ninguna interfaz pública devuelve
`token_hash`.

El propietario de las funciones y el trigger `SECURITY DEFINER` acceden a la
tabla sin crear policies generales para el frontend.

## Rama de invitación en `handle_new_user`

La presencia de la clave `registration_invite_token`, incluso con valor vacío,
selecciona la rama nueva. No se permite degradar un intento de invitación
inválido al flujo legacy.

La rama nueva:

1. valida el formato y calcula SHA-256 del token;
2. busca y bloquea la invitación con `FOR UPDATE`;
3. valida email, vencimiento, uso, revocación, rol y personal requerido;
4. bloquea el registro `personal` y comprueba que siga activo y libre;
5. crea `profiles` con el nombre guardado en la invitación;
6. vincula el personal cuando corresponde;
7. inserta exactamente el `app_role` guardado;
8. marca la invitación como consumida;
9. elimina `registration_invite_token` de `auth.users.raw_user_meta_data`.

Los valores `legajo`, `rol`, `user_id` y `nombre_completo` enviados como
metadata no deciden perfil, vínculo ni autorización en esta rama.

### Atomicidad

`handle_new_user` continúa siendo el trigger `AFTER INSERT` de `auth.users`.
Todas las operaciones anteriores ocurren en la misma transacción PostgreSQL que
crea el usuario. Una excepción revierte usuario, perfil, vínculo, rol, consumo y
limpieza de metadata.

Como es un trigger `AFTER`, modificar `NEW.raw_user_meta_data` no persistiría.
Por eso la limpieza usa un `UPDATE auth.users` al final de la misma transacción.

**REQUIERE PRUEBA REAL EN STAGING:** debe comprobarse que el propietario real
de la función desplegada tenga permiso para ese `UPDATE`, que no existan
triggers externos incompatibles y que GoTrue observe la metadata final
esperada. Cambiar el trigger combinado a `BEFORE INSERT` no es una alternativa
directa segura: en ese momento todavía no existe la fila padre de `auth.users`
que necesitan las FK de `profiles`, `user_roles` y del consumo de la
invitación. Separar la limpieza en otro trigger `BEFORE` también ocultaría el
token antes de que la rama `AFTER` pueda validarlo. Por eso EXPAND mantiene
temporalmente el mecanismo actual sin introducir transferencia especulativa de
estado entre triggers.

El token necesariamente transita por la solicitud de signup y podría aparecer
en logs de infraestructura externos a PostgreSQL. La migración garantiza que no
quede almacenado en la tabla de invitaciones ni en la metadata final del usuario,
pero la política de redacción de logs debe validarse en Lovable Cloud.

## Compatibilidad legacy

Si `registration_invite_token` no está presente, se ejecuta el flujo actual:

- lectura de `raw_user_meta_data.legajo`;
- consulta de `personal.rol`;
- mapping mediante `map_personal_rol_to_app_role`;
- creación de perfil;
- inserción del rol resultante o `maquinista` por defecto.

EXPAND no elimina ni modifica:

- `link_personal_to_user`;
- `map_personal_rol_to_app_role`;
- `personal_legajo_lookup`;
- grants o policies legacy;
- `/registro` o `/registro-empleado`;
- el frontend actual de registro.

Por lo tanto, SEC-02 todavía no está remediado para usuarios finales. La
vulnerabilidad legacy permanece abierta hasta completar MIGRATE y CONTRACT.

## Pruebas

`supabase/tests/sec02_registration.sql` es una suite transaccional que termina
con `ROLLBACK`. Cubre:

- privilegios mínimos de tabla y funciones;
- intentos reales de leer la tabla y `token_hash` como `anon` y
  `authenticated`;
- rechazo de un usuario no-admin;
- rechazo de revocación por un usuario no-admin sin alterar la invitación;
- conservación de invitaciones y timestamps al eliminar actores de auditoría;
- creación de una invitación operativa por admin;
- prohibición de invitaciones admin en RPC y tabla;
- ausencia del token en claro;
- vencimiento de 72 horas;
- rechazo de invitaciones vencidas, revocadas, usadas o con email diferente;
- personal obligatorio para roles operativos;
- rechazo de personal inactivo al crear la invitación;
- rechazo y rollback si el personal se desactiva antes de consumirla;
- rechazo de personal ya vinculado;
- token presente pero vacío o inválido sin fallback al flujo legacy;
- aislamiento frente a metadata legacy manipulada;
- asignación de exactamente un rol por invitación;
- independencia deliberada entre `personal.rol` y `user_roles.role`;
- reemisión y apropiación única del personal;
- rollback completo mediante una falla de rol inducida;
- continuidad del flujo legacy sin token.

El repositorio no tiene Supabase CLI ni un harness SQL local, por lo que la
suite no fue ejecutada en esta iteración. Debe ejecutarse exclusivamente en una
base aislada de staging, con una conexión propietaria y después de aplicar sólo
la migración EXPAND. Esa conexión también debe poder ejecutar `SET ROLE` hacia
`anon` y `authenticated` para las comprobaciones de permisos efectivos:

```bash
psql "$STAGING_DATABASE_URL" -v ON_ERROR_STOP=1 \
  -f supabase/tests/sec02_registration.sql
```

El helper de fixtures inserta directamente en `auth.users` para disparar el
trigger real. Si Lovable Cloud personalizó esa tabla, sólo deberá adaptarse ese
helper; las aserciones funcionales no deben relajarse.

La carrera real entre sesiones independientes debe validarse adicionalmente con
dos conexiones concurrentes. El test SQL cubre los índices, bloqueos y la
secuencia de reemisión/consumo, pero una única transacción no reproduce toda la
temporización concurrente.

## Riesgos y verificaciones pendientes en Lovable Cloud

Antes de desplegar se debe comprobar:

- que `pgcrypto` esté disponible en el esquema `extensions` con
  `gen_random_bytes(integer)` y `digest(text,text)`;
- que el propietario efectivo de `handle_new_user` pueda actualizar
  `auth.users` y acceder a las tablas involucradas;
- que la configuración real de confirmación de email mantenga la semántica
  esperada del trigger;
- que los grants y RLS efectivos coincidan con el historial versionado;
- que la limpieza del token no active integraciones incompatibles;
- que los logs de Auth/API no retengan secretos de signup;
- que la suite y las pruebas concurrentes pasen en staging.

La migración aborta si las funciones criptográficas no existen en
`extensions`. No hay fallback pseudoaleatorio.

## Próximas fases — no implementadas

### MIGRATE

- agregar administración de invitaciones en la aplicación;
- adaptar `RegistroEmpleado` al token;
- retirar del frontend el lookup, vínculo y upsert de rol legacy;
- auditar cuentas, vínculos y roles existentes.

### CONTRACT

- hacer obligatorio el registro por invitación;
- retirar el branch legacy del trigger;
- eliminar `link_personal_to_user` y el mapping de autorización legacy;
- cerrar el lookup público y las rutas generales de registro;
- regenerar tipos y completar pruebas E2E.

No se debe avanzar automáticamente a estas fases.

## Bloqueo de despliegue por SEC-01 local

Continúa presente la migración local y no desplegada de SEC-01:

`supabase/migrations/20260930180000_8f2a3d8e-2dfc-4f43-9bfe-7f0b14dcfb2f.sql`

Un `supabase db push` normal intentaría aplicar SEC-01 antes de esta migración
EXPAND. Por ello, cualquier despliegue está bloqueado hasta aislar o sustituir
coordinadamente esa migración. No se debe ejecutar `db push` con el estado local
actual.
