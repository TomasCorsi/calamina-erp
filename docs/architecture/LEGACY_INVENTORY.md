# Inventario sanitizado del sistema legacy

Este documento registra nombres y dependencias técnicas sin reproducir valores
de credenciales, tokens o project refs. Todo el material enumerado es
**LEGACY / REFERENCE** y no integra el baseline de CALAMINA ERP v2.

## Material archivado

| Categoría | Cantidad | Ubicación |
|---|---:|---|
| Migraciones Supabase | 129 | `legacy/supabase-migrations/` |
| Migraciones Drizzle | 8 | `legacy/drizzle/migrations/` |
| Edge Functions | 9 | `legacy/supabase-functions/` |
| Tests SQL | 1 | `legacy/supabase-tests/` |
| Planes Lovable | 29 | `legacy/lovable/plan/` |

Las migraciones incluyen las remediaciones SEC-01 y SEC-02. Se conservan como
conocimiento histórico y no deben aplicarse a una base v2.

## Edge Functions

| Función | Propósito heredado | Variables requeridas | Lovable | Supabase | Futuro recomendado |
|---|---|---|---|---|---|
| `admin-update-user-email` | Cambio administrativo de email | `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | No | Sí | Rediseñar con permission server-side y auditoría |
| `admin-update-user-password` | Cambio administrativo de contraseña | `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | No | Sí | Rediseñar con permission server-side y auditoría |
| `backup-database` | Exportación parcial de tablas | `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | No | Sí | No tratar como backup; reemplazar por backup/restore verificable |
| `chat-reportes` | Chat de reportes con IA | `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `LOVABLE_API_KEY` | Sí | Sí | Adaptador de proveedor IA y consultas allowlisted |
| `match-empleado-documentos` | Clasificación de documentos con IA | `LOVABLE_API_KEY` | Sí | Indirecta | Rediseñar Auth, PII y proveedor IA |
| `parse-computo` | Parseo de cómputos | `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `LOVABLE_API_KEY` | Sí | Sí | Adaptador IA con permisos, límites y auditoría |
| `parse-orden-compra` | Parseo de órdenes | `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `LOVABLE_API_KEY` | Sí | Sí | Adaptador IA con permisos, límites y auditoría |
| `recordar-parte-pendiente` | Recordatorio programado | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | No | Sí | Job autenticado con secreto de alcance mínimo |
| `send-push` | Notificaciones Web Push | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | No | Sí | Autorizar por capability y limitar destinatarios |

No se copiaron valores de secretos. Las funciones están archivadas sin cambios
internos para evitar convertirlas accidentalmente en componentes v2.

## Variables de entorno encontradas

En el `.env` heredado:

- `VITE_SUPABASE_PROJECT_ID`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

La publishable key identificada corresponde al rol público `anon`; no se
detectó una clave `service_role` literal. La configuración no se reutiliza.

Variables referenciadas por código histórico:

- `LOVABLE_DB_MIGRATION_URL`
- `LOVABLE_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT`

## Auth y autorización

El legacy utiliza Supabase Auth, `profiles`, `personal`, `user_roles`, metadata
de signup, triggers y RPC de vinculación. SEC-01 reduce exposición pública de
personal y SEC-02 agrega infraestructura de invitaciones, pero su aplicación
real no puede demostrarse desde este repositorio. Ninguno de esos archivos es
el diseño definitivo de Auth v2.

## Storage

- `certificado-comprobantes`: bucket privado creado por migración.
- `mantenimiento-adjuntos`: bucket público creado por migración.
- `empleado-documentos`: policies versionadas; creación del bucket no hallada.

La privacidad, límites, objetos existentes y policies desplegadas sólo pueden
verificarse posteriormente en el sistema legacy, con autorización expresa.

## Dependencias Lovable archivadas o retiradas

- `.lovable/plan` archivado.
- `lovable-tagger` retirado del build.
- almacenamiento de Auth para preview Lovable retirado.
- README y publicación Lovable retirados del flujo activo.
- URL `.lovable.app` retirada del frontend.
- gateway `ai.gateway.lovable.dev` y `LOVABLE_API_KEY` confinados a funciones
  archivadas.
- `LOVABLE_DB_MIGRATION_URL` confinado a la configuración Drizzle archivada.

## Referencias ejecutables eliminadas

- Project ref y URL del backend anterior en `.env`, `index.html`, caché manual
  de Auth y `supabase/config.toml`.
- VAPID public key heredada hardcodeada en frontend.
- Configuración de preview y publicación Lovable.

Los documentos históricos pueden conservar menciones al legacy cuando estén
marcados explícitamente como referencia.

## Tipos Supabase

`src/integrations/supabase/types.ts` corresponde al esquema legacy. Se conserva
temporalmente para compatibilidad de compilación y debe reemplazarse después de
crear el baseline v2.

## Verificación exclusiva del legacy

- Migraciones, grants, RLS, funciones y triggers realmente desplegados.
- Configuración Auth, SMTP, CAPTCHA, redirects y proveedores OAuth.
- Buckets, objetos y límites efectivos.
- Secrets, rotación y versiones desplegadas de Edge Functions.
- Jobs cron, publicaciones Realtime y extensiones.
- Usuarios, roles, vínculos, logs y datos productivos.
- Backups, PITR, región, SLA y restauraciones probadas.
