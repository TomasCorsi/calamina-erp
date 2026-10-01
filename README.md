# CALAMINA ERP v2

Reconstrucción independiente del ERP de Calamina Sur. El sistema productivo
legacy continúa operando por separado y no debe conectarse, modificarse ni
desplegarse desde este repositorio.

## Estado actual

El repositorio se encuentra en **Fase 0A — aislamiento seguro**:

- no existe todavía un proyecto Supabase v2;
- no existe conexión a staging o producción;
- las migraciones, funciones y herramientas del legacy están archivadas en
  `legacy/` y no forman parte del baseline ejecutable;
- `supabase/migrations/` está reservado para un baseline v2 limpio;
- npm es el único package manager;
- Lovable no forma parte de la operación de v2.

## Regla de seguridad

No ejecutar la aplicación hasta completar la futura configuración de Supabase
local. En desarrollo, la validación de entorno sólo admite:

- `http://127.0.0.1:54321`
- `http://localhost:54321`

Cualquier URL Supabase remota es rechazada antes de inicializar el cliente.

## Variables públicas del frontend

Copiar `.env.example` a `.env.local` únicamente cuando exista Supabase local.
Las variables `VITE_*` son visibles en el navegador y nunca deben contener
service-role keys, contraseñas o secretos privados.

## Documentación

- `docs/architecture/ADR-001-v2-baseline.md`
- `docs/architecture/LEGACY_INVENTORY.md`
- `legacy/README.md`

No ejecutar migraciones ni Edge Functions desde `legacy/`.
