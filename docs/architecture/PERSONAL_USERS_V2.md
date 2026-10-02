# Personal y Usuarios v2

## Reutilización del legacy

Las funciones seguras v2 se integran directamente en las pantallas legacy.
Personal conserva `MainLayout`, sus tabs, filtros, tabla, acciones y
`FormDialog`; Usuarios vuelve a su ubicación original dentro de Configuración,
con la card, tabla, buscador, badges y diálogos existentes. No existe un shell
visual alternativo en el entrypoint de la aplicación.

No se reutilizó la capa de datos de `usePersonal`, `EmpleadoDialog`,
`LinkUserDialog` ni las escrituras directas originales, porque dependen del
modelo anterior (`nombre`, `apellido`, `dni`, `rol`, `activo`, `user_id`,
salarios y datos bancarios). En v2 todas las mutaciones de Personal,
memberships y roles pasan por RPCs con autorización del servidor.

## Alcance v2

Personal administra exclusivamente código interno, nombre, apellido, email
laboral, puesto y estado activo/inactivo. El teléfono no existe en el baseline
v2 y se difiere hasta contar con una necesidad y reglas de normalización claras.
También quedan fuera DNI, licencias, fechas laborales, sueldos, bancos,
vacaciones, EPP, documentos e importación masiva.

Usuarios lista identidad Auth, profile, membership, roles y personal asociado.
Permite invitar, revocar invitaciones pendientes, suspender/reactivar otra
membership y asignar/quitar roles asignables. Nunca acepta `company_id`, no
permite administrar la propia membership o roles, y protege el rol `admin`.

## Autoridad y auditoría

Se usan únicamente los permisos existentes: `personal.view`,
`personal.manage`, `users.view`, `users.invite` y `users.manage_roles`. El
frontend los usa para visibilidad; las RPCs y RLS son la autoridad efectiva.

Las únicas acciones nuevas auditadas son `personal.created`,
`personal.updated`, `personal.status_changed`, `membership.suspended`,
`membership.reactivated`, `role.assigned` y `role.removed`. Las lecturas no se
auditan.
