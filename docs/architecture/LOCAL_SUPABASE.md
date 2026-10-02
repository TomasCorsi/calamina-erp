# Supabase local de CALAMINA ERP v2

Este repositorio usa un stack Supabase ejecutado exclusivamente en Docker Desktop
con backend WSL2. Durante Fase 1A no existe ningun proyecto remoto vinculado y no
se permite conectar este repositorio a Supabase Cloud, Lovable o produccion.

## Requisitos

- Windows con WSL2 operativo.
- Docker Desktop en modo Linux containers y Docker Engine iniciado.
- Node.js 20 o posterior.
- npm 11.16.0, segun `packageManager`.
- Supabase CLI instalada localmente por npm y fijada en la version del proyecto.

En PowerShell se usan `npm.cmd` y `npx.cmd`, porque una politica de ejecucion local
puede impedir que se carguen los wrappers `.ps1`.

## Comandos locales

```powershell
npm.cmd run supabase:start
npm.cmd run supabase:status
npm.cmd run supabase:stop
npm.cmd run supabase:reset
npm.cmd run supabase:test
```

- `supabase:start` inicia los contenedores locales y aplica las migraciones v2 y
  `supabase/seed.sql`.
- `supabase:status` muestra el estado y credenciales generadas localmente. No se
  debe copiar su salida completa a Git, tickets, chats ni documentacion.
- `supabase:stop` detiene el stack del proyecto.
- `supabase:reset` destruye y reconstruye solamente la base local mediante
  `supabase db reset --local`.
- `supabase:test` ejecuta pgTAP solamente contra la base local.

No ejecutar en esta fase `supabase link`, `supabase db push`, `supabase pull`,
comandos `--linked` ni deploys.

## Puertos

| Servicio | URL o puerto local |
| --- | --- |
| Shadow database | `54320` |
| API | `http://127.0.0.1:54321` |
| PostgreSQL | `127.0.0.1:54322` |
| Studio | `http://127.0.0.1:54323` |
| Mailpit (email local) | `http://127.0.0.1:54324` |
| SMTP local | `54325` |
| POP3 local | `54326` |

La aplicacion debe usar siempre las URLs de loopback indicadas. Docker Desktop
puede mostrar los puertos publicados como `0.0.0.0`; el firewall de Windows no
debe permitir conexiones entrantes desde la LAN a esos puertos.

Auth y Storage estan habilitados localmente. El registro publico, el signup por
email y los usuarios anonimos estan deshabilitados. Realtime, Analytics, el
pooler y los esquemas declarativos estan deshabilitados. No existen buckets de
aplicacion ni Edge Functions v2 todavia.

## Troubleshooting

### Docker no responde

Abrir Docker Desktop y esperar a que `docker version` muestre tanto Client como
Server. Confirmar que el contexto activo sea `desktop-linux`.

### Un puerto esta ocupado

No cambiar puertos automaticamente. Identificar el proceso en PowerShell:

```powershell
Get-NetTCPConnection -State Listen -LocalPort 54321 |
  Select-Object LocalAddress, LocalPort, OwningProcess
Get-Process -Id <PID>
```

Resolver el conflicto antes de iniciar Supabase, manteniendo coordinados
`supabase/config.toml` y la validacion local del frontend.

### El stack no queda saludable

Consultar `docker ps`, `docker logs <contenedor>` y
`npx.cmd supabase status`. No usar credenciales o proyectos remotos como atajo.

### Reset local

`npm.cmd run supabase:reset` elimina los datos de desarrollo locales y vuelve a
aplicar las migraciones y el seed. Nunca usar `--linked` ni un `--db-url` remoto.

## Manejo de credenciales locales

Supabase genera claves y contrasenas exclusivas del stack local. No deben
versionarse, copiarse a `.env.example` ni reutilizarse fuera de localhost. Las
claves `service_role`, JWT y contrasenas nunca deben aparecer en logs guardados
o documentacion.
