# LEGACY / REFERENCE — Auditoría Técnica Integral

> Documento histórico del sistema productivo heredado. No describe el baseline
> ejecutable de CALAMINA ERP v2 ni autoriza conexiones al backend legacy.

**Proyecto:** gestión de obras / Calamina Sur  
**Fecha de corte:** 30 de septiembre de 2026  
**Baseline auditado:** commit `e4ca73f` (`Agregó modo Ingreso de combustible`)  
**Modalidad:** revisión estática, no destructiva y exclusivamente sobre el repositorio local

## 1. Resumen ejecutivo

El sistema es una SPA React/Vite conectada directamente a Supabase/Lovable Cloud. Tiene cobertura funcional amplia —obras, remitos, certificados, personal, maquinaria, compras, reportes y un módulo contable inicial—, usa tipos generados para la base, RLS en gran parte del esquema, carga diferida de rutas y React Query. Esas son bases aprovechables: no hay evidencia que justifique reescribir el producto ni abandonar Lovable.

El estado técnico, sin embargo, **no es adecuado para ampliar todavía Contabilidad o Tesorería**. El principal motivo no es el framework sino cuatro fallas de fundamento: autorización vulnerable en el alta/vinculación de empleados, una policy que permite seleccionar toda la tabla `personal`, operaciones empresariales y financieras sin transacciones atómicas, y un modelo contable que permite alterar o eliminar documentos ya confirmados sin reversión ni controles de partida doble en base de datos.

La arquitectura actual concentra lógica de negocio y acceso a datos en componentes y hooks muy grandes. Existen 383 accesos directos aproximados con `.from(...)`, no hay capa de servicios, no hay tests ni CI, TypeScript está configurado en modo no estricto y la trazabilidad sólo registra autor/fecha en una minoría de tablas. Para un sistema ya productivo, esto aumenta de forma material el riesgo de regresión y de inconsistencia silenciosa.

La dependencia principal es Supabase, no necesariamente Lovable como plataforma propietaria. El frontend es portable; base, auth, storage y funciones son parcialmente portables porque dependen de Supabase/PostgreSQL con RLS, Storage, Edge Functions, Realtime, `pg_cron` y `pg_net`. Algunas funciones de IA sí llaman al gateway de Lovable. Deploy, backups administrados, secrets y configuración real de producción no pueden determinarse desde el repositorio.

### Resultado global

| Severidad | Cantidad |
|---|---:|
| CRÍTICO | 3 |
| ALTO | 16 |
| MEDIO | 10 |
| BAJO | 1 |
| **Total** | **30** |

**Decisión recomendada:** congelar la expansión de módulos financieros sensibles hasta completar la Fase 0 y la parte transaccional/auditable de la Fase 1. El resto del sistema puede seguir operando, pero los tres hallazgos críticos deben tratarse como incidentes preventivos: verificar el estado desplegado, limitar exposición y auditar cuentas/datos antes de asumir que no hubo abuso.

## 2. Alcance y limitaciones

Se revisaron archivos raíz, configuración, `src/`, `supabase/`, `drizzle/`, `.lovable/`, migraciones SQL, funciones Edge, PWA/service worker, autenticación, rutas, hooks, componentes, storage, documentación y Git. No se modificó código, configuración, dependencias, datos ni infraestructura; el único cambio es este documento.

No se instalaron dependencias ni se ejecutaron `build`, `lint`, migraciones, seeds, funciones remotas o consultas a producción. `node_modules` no está presente y la auditoría prohibía cambiar dependencias. Por ello, **no existe evidencia de que el commit auditado compile o pase lint**.

Quedan fuera de alcance y requieren verificación externa:

- estado realmente desplegado de migraciones, grants, RLS y Edge Functions;
- configuración de JWT de cada función, CORS, rate limits y allowlists;
- usuarios, roles, datos y accesos históricos de producción;
- secrets configurados y su rotación;
- backups/PITR, retención, restauraciones probadas y SLA de Lovable Cloud;
- ramas protegidas, CI/CD y configuración del repositorio GitHub remoto;
- logs, métricas, alertas, costos y límites del servicio;
- headers efectivos de Supabase/hosting que pueden influir en caché;
- vulnerabilidades actuales de dependencias: no se ejecutó un advisory scan con red.

Cuando este informe describe una policy o función como existente, confirma su presencia en el historial versionado. Confirmar que esa versión está activa en producción **REQUIERE VERIFICACIÓN EN LOVABLE CLOUD**.

## 3. Stack tecnológico

| Capa | Evidencia encontrada |
|---|---|
| Frontend | React `18.3.1`, React DOM, TypeScript `5.8.3`, Vite `5.4.19` |
| UI | Tailwind CSS, shadcn/Radix UI, Lucide, Sonner, Recharts |
| Routing | `react-router-dom` `6.30.1`, rutas con `lazy()` |
| Estado remoto | TanStack React Query `5.83.0`; no se detectó store global dedicado |
| Formularios | React Hook Form y Zod instalados; el uso observado es mayormente validación manual/ad hoc |
| Backend/BaaS | Supabase JS `2.90.1`, PostgreSQL, Auth, Storage, Realtime y Edge Functions Deno |
| Backend serverless | 9 funciones en `supabase/functions/` |
| Persistencia | 127 migraciones Supabase y 8 migraciones Drizzle; `drizzle/schema.ts` vacío |
| PWA/offline | `vite-plugin-pwa`, Workbox, service worker propio, caché y cola en `localStorage` |
| Documentos | XLSX/ExcelJS/JSZip, jsPDF/pdf-lib/pdfjs-dist, node-unrar-js |
| IA externa | Gateway `ai.gateway.lovable.dev` en funciones de parsing, matching y chat |
| Calidad | ESLint 9; TypeScript no estricto; no framework de tests ni CI versionado |
| Package manager | Indeterminado: conviven `package-lock.json`, `bun.lock` y `bun.lockb`; no hay `packageManager` |
| Build/deploy | scripts Vite; README indica publicación desde Lovable; pipeline real no versionado |
| Variables | `.env` versionado con URL, project ID y publishable/anon key; no se halló `.env.example` |

## 4. Arquitectura actual

La aplicación funciona como un **frontend rico conectado directamente al BaaS**:

1. `src/main.tsx` monta React.
2. `src/App.tsx` define proveedores y rutas, con carga diferida.
3. Pages y componentes consumen hooks de `src/hooks/`.
4. Los hooks y algunos componentes llaman directamente a `supabase.from`, `rpc`, Storage y Functions.
5. Reglas adicionales viven en funciones/triggers SQL y Edge Functions.
6. React Query maneja caché e invalidación; el service worker y `localStorage` agregan offline.

No existe una frontera estable entre UI, aplicación, dominio e infraestructura. No hay carpeta `services`; cálculos, validaciones, persistencia, notificaciones y feedback visual conviven en hooks y componentes. Ejemplos representativos son `src/pages/Certificados.tsx` (2.860 líneas), `src/hooks/useCertificados.ts` (872), `src/components/personal/DocumentosEmpleadoTab.tsx` (1.233) y `src/components/maquinarias/GastosMaquinaria.tsx` (1.012).

La base de datos sí contiene reglas útiles —RLS, FKs, checks, índices, triggers y RPCs—, pero el criterio no es uniforme. Algunos flujos críticos son atómicos en SQL; otros se coordinan desde el navegador mediante varias requests independientes.

## 5. Mapa del sistema

| Ubicación | Responsabilidad observada | Observación de riesgo |
|---|---|---|
| `src/pages/` | composición de pantallas y parte de la lógica | varias pages concentran cientos/miles de líneas |
| `src/components/` | UI, formularios, grillas, cálculos, imports/exports | mezcla presentación, negocio y persistencia |
| `src/hooks/` | consultas, mutaciones, cálculos y sincronización | actúa de facto como capa de datos, sin contratos de dominio |
| `src/integrations/supabase/` | cliente y tipos generados | buena centralización del cliente; tipos eludidos con casts |
| `src/lib/`, `src/utils/` | matching, exportación, PDFs y helpers | reglas críticas dispersas, especialmente dinero/fechas |
| `src/sw.ts` | PWA, runtime cache y push | cachea REST autenticado y está excluido del tsconfig de app |
| `supabase/migrations/` | esquema, RLS, funciones, triggers, cron/net | 127 cambios incrementales; fuente importante de reglas |
| `supabase/functions/` | administración, IA, backup y push | autorización inconsistente entre funciones |
| `drizzle/` | migraciones posteriores | segundo mecanismo de migración sin schema fuente |
| `.lovable/plan/` | planes de funcionalidades | útil como historial, no sustituye documentación operativa |
| raíz | toolchain, locks, env, README | tres lockfiles y documentación genérica |

Dominios visibles: obras/tablero, remitos, partes diarios, maquinaria/mantenimiento, stock, personal/RRHH, documentos, cotizaciones, proveedores/compras, certificados/cobranzas, contabilidad, reportes, notificaciones y configuración.

## 6. Métricas del proyecto

Métricas aproximadas obtenidas sin instalar herramientas:

| Métrica | Valor |
|---|---:|
| Archivos bajo `src/` | 307 |
| Archivos TypeScript/TSX bajo `src/` | 298 |
| Líneas TS/TSX bajo `src/` | 76.310 |
| Pages TS/TSX | 34 |
| Componentes TS/TSX bajo `src/components` | 176 |
| Hooks | 62 |
| Services | 0 |
| Tablas expuestas en tipos generados | 58 |
| Migraciones Supabase | 127 |
| Migraciones Drizzle SQL | 8 |
| Edge Functions | 9 |
| Tests automatizados | 0 |
| Llamadas `.from(...)` aproximadas en cliente | 383 |
| `as any` aproximados | 181 |
| anotaciones `: any` aproximadas | 202 |
| `parseFloat` aproximados | 74 |
| `new Date` aproximados | 228 |
| `toISOString` aproximados | 64 |
| `console.error` aproximados | 139 |

### Diez archivos más grandes

| Archivo | Líneas |
|---|---:|
| `src/integrations/supabase/types.ts` | 4.465 |
| `src/pages/Certificados.tsx` | 2.860 |
| `src/components/personal/DocumentosEmpleadoTab.tsx` | 1.233 |
| `src/components/remitos/RemitosDataGrid.tsx` | 1.052 |
| `src/components/maquinarias/GastosMaquinaria.tsx` | 1.012 |
| `src/pages/Remitos.tsx` | 998 |
| `src/pages/Personal.tsx` | 899 |
| `src/components/parte-diario/ParteDiarioFormView.tsx` | 872 |
| `src/hooks/useCertificados.ts` | 872 |
| `src/components/cotizaciones/CotizacionFormContent.tsx` | 871 |

`types.ts` es código generado y su tamaño no representa complejidad manual. Los restantes sí merecen separación progresiva.

### Diez unidades con mayor complejidad estimada

Se utilizó una heurística local de tamaño más tokens de control (`if`, `case`, bucles, `catch`, operadores condicionales). **No es complejidad ciclomática formal**.

1. `src/pages/Certificados.tsx`
2. `src/components/personal/DocumentosEmpleadoTab.tsx`
3. `src/pages/Remitos.tsx`
4. `src/components/remitos/RemitosDataGrid.tsx`
5. `src/components/maquinarias/GastosMaquinaria.tsx`
6. `src/components/remitos/CSVImportDialog.tsx`
7. `src/hooks/useCertificados.ts`
8. `src/components/personal/SueldosTab.tsx`
9. `src/hooks/useReporteObra.ts`
10. `src/components/dashboard/ObraDashboard.tsx`

Las mayores concentraciones de lógica están en certificados/pagos, remitos/importación, personal/documentos/sueldos, maquinaria/gastos, tablero/reportes y cotizaciones.

## 7. Hallazgos críticos

### SEC-01 — Lectura pública de la tabla completa de personal

- **Severidad:** CRÍTICO
- **Clasificación:** CONFIRMADO en migraciones; despliegue activo REQUIERE VERIFICACIÓN EN LOVABLE CLOUD.
- **Problema:** la policy `Allow public legajo lookup for registration` usa `FOR SELECT USING (true)` sobre `public.personal`, no sobre una proyección limitada.
- **Evidencia:** `supabase/migrations/20260128175102_5761f409-8f01-4391-a10f-d56233cb55b2.sql:1-6`. Los tipos generados (`src/integrations/supabase/types.ts`, entidad `personal`) incluyen DNI, banco, cuenta, sueldo, sueldo negro, teléfono, email, observaciones y datos laborales.
- **Impacto:** si `anon` conserva `SELECT` y la policy está desplegada, un cliente sin autenticar podría consultar datos personales y salariales completos.
- **Riesgo:** privacidad, fraude, exposición laboral/financiera e incidente legal.
- **Recomendación:** verificar inmediatamente la policy y grants efectivos; sustituir el lookup público por una función mínima y controlada, con rate limit/invitación; revisar logs y rotar el mecanismo de alta. No asumir que una vista limitada corrige una policy permisiva sobre la tabla.

### SEC-02 — Elevación de privilegios mediante legajo controlado por el usuario

- **Severidad:** CRÍTICO
- **Clasificación:** CONFIRMADO.
- **Problema:** `handle_new_user` confía en `raw_user_meta_data.legajo`, busca el rol de `personal` y convierte `administrativo` en `admin`. `link_personal_to_user` es `SECURITY DEFINER`, está concedida a `authenticated` y no exige que `p_user_id = auth.uid()` ni prueba posesión del legajo.
- **Evidencia:** `supabase/migrations/20260601153253_d7eb578f-b768-4bc0-9f16-cf5440b1d8cc.sql:1-117`; grant posterior a `authenticated` en `20260601153323_c905d7c9-d15f-493d-9d8b-f66db9ea120e.sql:1-6`; flujo público en `src/pages/RegistroEmpleado.tsx:41-96` y mapeo de rol en `:138-150`; rutas públicas `/registro` y `/registro-empleado` en `src/App.tsx`.
- **Impacto:** apropiación de un legajo existente, vínculo a un UUID arbitrario y asignación de rol administrador.
- **Riesgo:** control total de datos y funciones administrativas.
- **Recomendación:** suspender/verificar el alta pública desplegada; usar invitaciones de un solo uso ligadas a identidad, validar dentro de una transacción y restringir RPC a service role/backend. Auditar usuarios, vínculos y `user_roles` históricos.

### FIN-01 — Integridad contable no garantizada

- **Severidad:** CRÍTICO
- **Clasificación:** CONFIRMADO.
- **Problema:** comprobantes, pagos y asientos admiten `UPDATE`/`DELETE` para admin/contador; faltan constraints de partida doble, totales, importes, moneda e identidad documental. Varias relaciones `asiento_id` no tienen FK. La idempotencia de generación se basa en leer un campo sin bloqueo ni unique constraint.
- **Evidencia:** `supabase/migrations/20260624174603_d2ae10ee-91ef-4acc-be83-d144bf196207.sql` (tablas, policies y RPC); `src/hooks/useContabilidad.ts:325-355` guarda cabecera y reemplaza ítems sin transacción, `:384-414` anula/borra sin asiento reversor, `:433-477` crea/edita/elimina pagos y asientos en pasos independientes; `src/components/contabilidad/ComprobanteDialog.tsx:147-195` calcula en `number` y fuerza ARS/cotización 1.
- **Impacto:** comprobantes desbalanceados o duplicados, pagos sin asiento, asientos huérfanos y pérdida de trazabilidad por borrado.
- **Riesgo:** estados contables no reproducibles y decisiones financieras basadas en información incorrecta.
- **Recomendación:** no ampliar ni usar como libro contable formal hasta introducir inmutabilidad/posteo, asientos reversores, constraints, claves documentales únicas, RPCs transaccionales e idempotentes, períodos/cierres y auditoría.

## 8. Deuda técnica

Este inventario es la fuente del conteo por severidad del resumen.

| ID | Problema | Severidad | Clasificación | Área | Archivos afectados | Impacto | Recomendación |
|---|---|---|---|---|---|---|---|
| SEC-01 | Policy pública sobre toda `personal` | CRÍTICO | CONFIRMADO | Seguridad/RLS | migración `20260128175102...` | exposición de PII y salarios | validar producción y reemplazar por lookup mínimo |
| SEC-02 | Alta/vinculación permite escalar rol | CRÍTICO | CONFIRMADO | Auth/RBAC | migraciones `20260601153253...`, `...153323...`, `RegistroEmpleado.tsx` | toma de rol admin | invitación verificada y RPC backend-only |
| FIN-01 | Modelo contable mutable y no atómico | CRÍTICO | CONFIRMADO | Contabilidad | migración `20260624174603...`, `useContabilidad.ts` | pérdida de integridad financiera | posteo inmutable, reversión y transacciones |
| SEC-03 | Edge Functions privilegiadas sin autorización suficiente | ALTO | CONFIRMADO | Functions | `send-push`, `recordar-parte-pendiente`, `match-empleado-documentos`, parsers | spam, consumo de créditos, acceso excesivo | validar JWT y permiso por función |
| SEC-04 | Caché REST autenticada no aislada por usuario | ALTO | RIESGO POTENCIAL | PWA | `src/sw.ts:67-77`, `useAuth.tsx:245-253` | datos residuales/cruzados en equipos compartidos | no cachear datos privados o usar caché por usuario y purga |
| SEC-05 | RPC SQL genérica para cualquier autenticado | ALTO | RIESGO POTENCIAL | DB/API | migración `20260601151237...` | superficie de consulta difícil de limitar | reemplazar por consultas/RPC allowlisted |
| RLS-01 | Policies demasiado amplias | ALTO | CONFIRMADO | RLS | `drizzle/0004...`, migración vacaciones, bucket mantenimiento | lectura/escritura fuera del rol esperado | matriz de permisos y tests de RLS |
| DAT-01 | Flujos multi-entidad desde cliente sin transacción | ALTO | CONFIRMADO | Datos | certificados, cotizaciones, OC, remitos | estados parciales y pérdida de ítems | command RPC por agregado |
| DAT-02 | Movimiento y saldo de stock no atómicos | ALTO | CONFIRMADO | Stock | `src/hooks/useStock.ts:165-193` | saldo sobrescrito o movimiento sin stock | transacción con lock/actualización relativa |
| FIN-02 | Liquidaciones/sueldos editables y parciales | ALTO | CONFIRMADO | RRHH | `useLiquidaciones.ts`, `LiquidacionDetalle.tsx` | pagos y totales incoherentes | estados inmutables, transacción y auditoría |
| DB-01 | Remitos asociados a obra por texto | ALTO | CONFIRMADO | Modelo | `obraMatch.ts`, `useTableroObras.ts`, `useTableroHistorico.ts` | costos/ingresos mal imputados | FK `obra_id` y migración controlada |
| DB-02 | Dos sistemas de migración sin fuente única | ALTO | CONFIRMADO | Base de datos | `supabase/migrations`, `drizzle`, schema vacío | drift y despliegue no reproducible | elegir autoridad y validar desde cero |
| AUD-01 | Trazabilidad insuficiente | ALTO | CONFIRMADO | Auditoría | esquema completo | no se sabe quién cambió qué/antes/después | audit log append-only y actores |
| TST-01 | Cero tests y cero CI versionado | ALTO | CONFIRMADO | Calidad | repositorio/package.json | regresiones productivas no detectadas | pirámide priorizada y gate CI |
| BKP-01 | “Backup” es exportación parcial y tolera errores | ALTO | CONFIRMADO | Continuidad | `backup-database/index.ts` | falsa sensación de recuperación | backup administrado + restore drill |
| ENV-01 | Sin separación verificable de ambientes | ALTO | CONFIRMADO | Operación | `.env`, `config.toml`, ausencia de configs | desarrollo contra producción | proyectos/credenciales separados |
| MON-01 | Dinero calculado con `number` y reglas dispersas | ALTO | RIESGO POTENCIAL | Finanzas | contabilidad, certificados, cotizaciones, reportes | centavos, impuestos y saldos divergentes | política monetaria central y cálculo servidor |
| DATE-01 | Fechas de negocio derivadas de UTC/local de forma inconsistente | ALTO | CONFIRMADO | Fechas | múltiples forms/PDFs, `toISOString()` | fecha corrida en Argentina | tipo `LocalDate` y zona IANA explícita |
| PERF-01 | Reportes pueden truncar/cargar datos masivos en cliente | ALTO | RIESGO POTENCIAL | Performance | `useReporteObra.ts`, tableros, contabilidad | totales incompletos o degradación | agregaciones SQL y paginación verificable |
| ARCH-01 | UI, negocio y datos mezclados en archivos grandes | MEDIO | CONFIRMADO | Arquitectura | archivos del §6 | alto costo de cambio | modularización incremental por dominio |
| TS-01 | TypeScript no estricto y uso extenso de `any` | MEDIO | CONFIRMADO | Tipado | `tsconfig.app.json`, hooks/componentes | errores de contrato llegan a runtime | endurecimiento gradual y tipar bordes |
| VAL-01 | Validación mayormente ad hoc y no compartida | MEDIO | CONFIRMADO | Formularios | forms y mutaciones | reglas divergentes/bypass directo | schemas por comando + constraints DB |
| OBS-01 | Sin error tracking, métricas ni alertas versionadas | MEDIO | CONFIRMADO | Operación | cliente y functions | fallas silenciosas/difícil diagnóstico | observabilidad con PII redactada |
| FIL-01 | Gobierno de documentos incompleto | MEDIO | RIESGO POTENCIAL | Storage | migraciones de buckets, uploads | exposición/tipos/tamaños no uniformes | inventario, límites y políticas por bucket |
| DEP-01 | Tres lockfiles y librerías solapadas | MEDIO | RECOMENDACIÓN | Dependencias | raíz/package.json | builds no deterministas y superficie mayor | fijar package manager y revisar solapes |
| DOC-01 | README y runbooks insuficientes | MEDIO | CONFIRMADO | Documentación | `README.md`, `.lovable/plan` | dependencia del conocimiento tácito | documentación mínima operativa |
| IAM-01 | Roles gruesos, hardcodeados y con excepción UUID | MEDIO | CONFIRMADO | Autorización | `ProtectedRoute.tsx`, `useAuth.tsx`, SQL | no escala a segregación de funciones | permisos/capabilities backend-first |
| PORT-01 | Configuración cloud no completamente versionada | MEDIO | REQUIERE VERIFICACIÓN | Portabilidad | repo vs Lovable Cloud | recuperación/migración incierta | inventario y export de configuración |
| ERR-01 | Errores ignorados y éxito después de fallas parciales | MEDIO | CONFIRMADO | Errores | hooks de contabilidad, liquidaciones y archivos | usuario cree que operación terminó | resultado transaccional y error central |
| CLEAN-01 | Supresiones y candidatos sin uso | BAJO | RIESGO POTENCIAL | Higiene | `generateReciboPDF.ts`, `empleadoMatcher.ts`, `mockData.ts`, `Placeholder.tsx` | ruido y mantenimiento | confirmar con tooling antes de retirar |

## 9. Arquitectura y mantenibilidad

La ausencia de `services` no es un problema por sí sola; el problema es que no existe otra frontera equivalente. Por ejemplo, `useCertificados.ts` consulta, muta, sube archivos, sincroniza estado y dispara feedback, mientras `Certificados.tsx` mantiene reglas y UI en 2.860 líneas. Esto dificulta probar reglas sin React/Supabase y hace que una modificación atraviese varias responsabilidades.

El acceso directo a Supabase está distribuido. Los hooks con mayor concentración incluyen `useCertificados`, `useContabilidad`, `useReporteObra`, `useLiquidaciones`, `useRrhh`, `useTableroObras`, `useCotizaciones` y `useDashboardData`. El patrón no obliga a usar transacciones ni a compartir validaciones.

Aspectos positivos: rutas lazy, React Query configurado, componentes UI reutilizables, tipos generados y agrupación funcional de componentes. La estrategia recomendable es **monolito modular**, no microservicios: extraer gradualmente comandos/consultas por dominio manteniendo React, Supabase y el despliegue actual.

No se detectó evidencia concluyente de dependencias circulares mediante la revisión estática disponible. Confirmarlas requiere un análisis del grafo en CI.

## 10. Seguridad

Además de SEC-01 y SEC-02:

- `send-push/index.ts:29-42` procesa `user_ids`, título y cuerpo sin validar usuario/rol, y luego usa service role. `recordar-parte-pendiente/index.ts` tampoco valida identidad y llama a datos/notifications con privilegio.
- `match-empleado-documentos` acepta archivos/listas y llama al gateway de IA sin autenticación de aplicación. `parse-computo` y `parse-orden-compra` verifican que exista usuario, pero no un rol autorizado. `chat-reportes` sí verifica admin: demuestra que existe un patrón más seguro, pero no se aplica consistentemente.
- No hay bloques `[functions.*]` en `supabase/config.toml`; el `verify_jwt` realmente desplegado **REQUIERE VERIFICACIÓN EN LOVABLE CLOUD**. Aun con gateway JWT, `send-push` necesita autorización de negocio.
- `execute_readonly_query(text)` (`20260601151237...`) acepta SQL dinámico `SELECT/WITH` con blacklist y está concedida a `authenticated`. RLS sigue aplicando por ser invoker, pero una blacklist SQL no es frontera robusta y permite explorar cualquier objeto que el rol pueda leer/ejecutar.
- `.env` está versionado y no ignorado. Los valores observados son identificador, URL y publishable/anon key, que por diseño pueden estar en el cliente; **no se halló una service-role key o clave privada literal**. Aun así, versionar `.env` favorece confusión de ambientes. Un JWT-like literal en `20260616194010...` corresponde aparentemente al anon key usado por `app_config`; no se reproduce aquí.
- El service worker cachea cualquier GET `/rest/` de cualquier host `*.supabase.co` por URL durante 24 h. No incorpora identidad en la clave y `signOut()` no limpia `supabase-api-cache`, `offline_cache_*` ni `offline_partes_queue`. En un dispositivo compartido puede servir información del usuario anterior; el alcance real depende de headers y uso offline.

## 11. Roles y permisos

El enum observado contiene `admin`, `capataz`, `maquinista`, `ayudante`, `remitero` y `contador`. La navegación y `ProtectedRoute` replican reglas en frontend; la protección real depende de RLS/RPC. Existe una excepción por UUID hardcodeado para remitos en `src/components/auth/ProtectedRoute.tsx:7-11`, señal de autorización por identidad en lugar de permiso.

El modelo no representa adecuadamente Dirección, Administración, Tesorería, Compras, Jefe de obra, Taller y RRHH con segregación de funciones. `admin` concentra demasiado, y el mapeo `administrativo -> admin` es especialmente peligroso. Para crecer, conviene conservar roles como agrupadores y agregar capabilities backend-first (`payments.approve`, `accounting.post`, etc.), alcance por obra/empresa y separación crear/aprobar/pagar.

Las RLS son valiosas, pero hay excepciones amplias: `vacaciones` permite `SELECT USING (true)` a todo autenticado; `drizzle/0004_create_cotizacion_anticipos.sql:19-24` permite `FOR ALL USING (true) WITH CHECK (true)` a cualquier autenticado; `tablero_sesiones` usa un patrón similar. Debe verificarse necesidad por caso.

## 12. Base de datos

Los tipos generados reflejan 58 tablas. En las migraciones Supabase se observaron aproximadamente 54 `CREATE TABLE`, 153 `CREATE POLICY`, 54 habilitaciones RLS, 30 funciones, 112 índices, 98 referencias/FK, 70 checks, 12 unique y 51 triggers. Son ocurrencias históricas, no conteo del estado efectivo.

Fortalezas: UUIDs, timestamps frecuentes, RLS extensa, índices explícitos, FKs y checks en varios módulos. Debilidades:

- `remitos` se imputa a obras por comparación normalizada de `desde`/`hasta` cuando falta `obra_id` (`src/lib/obraMatch.ts:17-31`). Tableros descargan remitos del período y realizan ese matching en cliente.
- En contabilidad faltan unique de comprobante empresarial y varias garantías semánticas; `asiento_id` en comprobantes/pagos no está respaldado por FK.
- El borrado suele ser físico: se observaron aproximadamente 74 llamadas cliente `.delete()`. No hay estrategia uniforme de soft delete/archivo.
- Dos cadenas de migración coexisten. `drizzle/schema.ts` está intencionalmente vacío, por lo que Drizzle no es una representación declarativa del esquema.
- No existe evidencia de un proceso automatizado que levante una base vacía y aplique ambas series en orden.

No se afirma que falten índices específicos sin `EXPLAIN` y métricas reales; esa evaluación **REQUIERE VERIFICACIÓN EXTERNA** sobre carga representativa.

## 13. Integridad de datos

El riesgo dominante es coordinar agregados desde el navegador:

- `useRemitoItems` borra todos los ítems y luego inserta los nuevos; si falla el insert, el remito queda sin detalle.
- `useCotizaciones` crea/actualiza cabecera, categorías, ítems y anticipos en llamadas separadas; algunos errores de delete sólo se registran.
- `useCertificados` separa cabecera, detalle, comprobantes y sincronización de estado.
- órdenes de compra reemplazan cabecera/detalle sin unidad transaccional.
- `useStock.ts:165-193` inserta movimiento y luego actualiza saldo; el fallo del saldo sólo genera toast y existe carrera de lectura-modificación-escritura.
- liquidaciones crean cabecera e ítems por separado; la edición recorre ítems, ignora resultados y después muestra éxito.

La regla futura debe ser: un comando empresarial que deba ser indivisible se ejecuta en una única función SQL/RPC transaccional, con constraints e idempotency key. El frontend sólo envía el comando y presenta un único resultado.

## 14. Lovable Cloud

Confirmado en repositorio:

- metadatos/planes `.lovable` y `lovable-tagger` en desarrollo;
- proyecto Supabase identificado en `supabase/config.toml` y variables Vite;
- Supabase Auth, Database, Storage, Realtime y Edge Functions;
- gateway `ai.gateway.lovable.dev` en funciones de IA;
- README con flujo de publicación Lovable;
- URL Lovable hardcodeada en una integración de mensajes.

No verificable localmente: plan contratado, región, SLA, límites, logs, dominios, deploy activo, versionado de functions, secrets, WAF/rate limiting, backups/PITR, configuración Auth, SMTP, OAuth, retención y estado de extensiones. No se presume su existencia.

## 15. Dependencia de Lovable Cloud

El acoplamiento está dividido:

- **Bajo en UI:** React/Vite/Tailwind puede construirse en cualquier hosting.
- **Medio/alto en backend:** la app usa intensamente la API Supabase directamente, RLS y funciones.
- **Específico de Lovable en IA:** varias Edge Functions llaman al gateway Lovable.
- **Operativo no determinado:** no hay pipeline alternativo, runbook o IaC completo.

No hay razón técnica suficiente para migrar ahora. Sí hay razón para documentar y versionar lo necesario para reconstruir el servicio y para aislar llamadas propietarias detrás de adaptadores simples.

## 16. Portabilidad

| Componente | Estado | Evidencia | Dependencia |
|---|---|---|---|
| Frontend | PORTABLE | React/Vite estándar; tagger sólo en dev | hosting y variables reemplazables |
| Backend | PARCIALMENTE PORTABLE | acceso directo mediante Supabase JS | APIs Supabase y lógica distribuida |
| Base de datos | PARCIALMENTE PORTABLE | PostgreSQL y SQL versionado | `auth.uid`, RLS, Storage, Realtime, `pg_cron`, `pg_net` |
| Auth | PARCIALMENTE PORTABLE | Supabase Auth y tokens en cliente | identidades, metadata y policies Supabase |
| Storage | PARCIALMENTE PORTABLE | buckets/policies Supabase | un bucket parece no crearse en repo |
| Functions | PARCIALMENTE PORTABLE | Deno/TypeScript | runtime Supabase; algunas DEPENDIENTES DE LOVABLE por IA |
| Secrets | NO DETERMINABLE | sólo nombres/uso en código | valores y rotación están en cloud |
| Deploy | NO DETERMINABLE | README menciona Lovable Publish; no CI/IaC | configuración fuera del repo |

Respuesta: **sí podría ejecutarse fuera de Lovable, pero no como traslado inmediato**. El frontend es directo; reproducir backend exige Supabase compatible o adaptar auth/RLS/storage/functions. El mayor riesgo actual no es lock-in puro, sino configuración operativa no versionada.

## 17. Performance

`useReporteObra.ts:126-130` usa una sola ventana `.range(0, 9999)` y luego agrega en cliente. Si el límite servidor es menor o el volumen supera 10.000, un reporte puede quedar incompleto sin indicarlo. `useRemitoItems` pagina todos los ítems globales para construir un mapa; los tableros descargan históricos amplios (hasta decenas de miles), filtran repetidamente por obra y hacen matching por texto. Listas contables no tienen paginación visible.

Realtime invalida conjuntos completos de queries ante cambios, generando refetch amplio. El impacto actual depende de cardinalidad y telemetría, por eso PERF-01 es riesgo potencial. Antes de optimizar a ciegas: medir p95 por pantalla/query, cantidad de filas y payload; luego mover totales/reportes a vistas/RPC paginadas, filtrar por claves y virtualizar sólo donde el volumen lo justifique.

Aspectos positivos: code splitting de rutas, stale/gc times en React Query, virtualización disponible y algunos selects/índices explícitos.

## 18. Manejo de errores

Hay feedback con Sonner y numerosos `try/catch`, pero el contrato es inconsistente. Se contaron ~139 `console.error`; varios catches ignoran errores, y algunas mutaciones muestran éxito aunque un subpaso haya fallado. Ejemplos: delete/insert de ítems, actualización de stock, loop de liquidaciones, limpieza de Storage con `.catch(() => {})` y fallback silencioso de auth/cache.

Para operaciones críticas, el error debe corresponder a un único resultado atómico, incluir código estable y correlation ID, y distinguir validación, autorización, conflicto, conectividad y error interno. No se deben registrar PII ni tokens.

## 19. Transacciones y consistencia

No hay transacciones desde Supabase JS entre requests independientes. Las transacciones existentes deben encapsularse en SQL/RPC. Prioridad:

1. alta/vinculación de identidad y rol;
2. posteo/anulación de comprobante y pago;
3. movimiento + saldo de stock;
4. liquidación + ítems + estado de pago;
5. certificado + ítems + cobro + estado;
6. cotización/orden/remito con sus detalles.

Cada comando necesita idempotency key para doble click/retry, bloqueo o control optimista para concurrencia, constraints como última defensa y test que fuerce fallo intermedio. El esquema contable actual no cumple estos requisitos.

## 20. Calidad TypeScript

`tsconfig.app.json` tiene `strict`, `strictNullChecks` y `noImplicitAny` desactivados, permite JS, no reporta unused y hace `skipLibCheck`; además excluye `src/sw.ts`. ESLint desactiva `no-unused-vars`. La búsqueda aproximada encontró 181 `as any`, 202 anotaciones `: any` y dos `@ts-expect-error` en `generateReciboPDF.ts`, más un `@ts-ignore` en `empleadoMatcher.ts`.

Los tipos Supabase generados son una buena base, pero contabilidad usa `(supabase as any)` y tipos manuales, perdiendo esa garantía. La mejora debe ser gradual: primero bordes de seguridad/dinero y módulos tocados; activar reglas en modo warning, reducir baseline y recién después endurecer `strict`.

## 21. Testing

No se hallaron archivos de test, dependencias de test, scripts `test`/`typecheck` ni workflows CI. Cobertura observable: 0.

Orden recomendado:

1. tests SQL/RLS para acceso anónimo, por rol y por obra;
2. tests de alta/vinculación y prohibición de escalación;
3. tests transaccionales/idempotentes de contabilidad, pagos, stock y liquidaciones;
4. tests unitarios de dinero, redondeo, impuestos, fechas y matching;
5. integración de hooks/adaptadores;
6. E2E mínimos: login, parte diario, remito, certificado/cobro, compra y posteo/anulación;
7. CI obligatorio con instalación reproducible, typecheck, lint, test y build.

Antes de refactors grandes conviene crear pruebas de caracterización de lo que hoy funciona.

## 22. Dependencias

No se realizó actualización ni auditoría online. Por ello no se declara ninguna versión como vulnerable sin evidencia local.

Riesgos verificables:

- `package-lock.json`, `bun.lock` y `bun.lockb` conviven sin `packageManager` ni engines;
- `xlsx` y `exceljs` solapan generación Excel; `jspdf`, `pdf-lib` y `pdfjs-dist` cubren responsabilidades PDF parcialmente superpuestas;
- frontend usa Supabase `^2.90.1`, mientras funciones fijan versiones anteriores en imports Deno;
- Zod y resolver están instalados, pero no se encontró uso de schemas Zod en formularios;
- rangos `^` hacen que el resultado dependa del lockfile elegido.

Requiere una revisión controlada con el package manager elegido, advisory scan y matriz “dependencia -> funcionalidad -> reemplazo”, sin actualización masiva.

## 23. Fechas y zona horaria

Se observaron 228 construcciones `new Date` y 64 `toISOString`. Varios formularios generan fecha de negocio con `new Date().toISOString().split('T')[0]`/`slice(0,10)`. En Argentina, desde las 21:00 hasta medianoche local, UTC ya corresponde al día siguiente. A la inversa, `new Date('YYYY-MM-DD')` se interpreta como UTC y puede mostrarse como día anterior al formatear localmente.

Ejemplos se encuentran en `ComprobanteDialog.tsx`, pagos, cotizaciones, stock, personal, certificados y PDFs. `recordar-parte-pendiente` resta tres horas manualmente, lo cual codifica un offset en lugar de `America/Argentina/Buenos_Aires`.

Separar `LocalDate` (día empresarial, string ISO sin conversión) de `Instant` (evento UTC), centralizar parse/format y probar límites de día/mes/año.

## 24. Archivos y documentos

- `certificado-comprobantes` se crea privado y tiene policies por rol.
- `mantenimiento-adjuntos` se crea con `public = true` (`20260227163552...:18-20`), por lo que una URL pública puede eludir la expectativa de privacidad. La sensibilidad real de esos adjuntos debe definirse.
- Las policies de `empleado-documentos` están versionadas, pero no se encontró `INSERT` del bucket en el repositorio; su creación/configuración **REQUIERE VERIFICACIÓN EN LOVABLE CLOUD**.
- La validación de MIME/tamaño es desigual y parte vive sólo en frontend. No se observó una política uniforme de antivirus, cuarentena, checksum, retención o borrado coordinado entre objeto y fila.
- `match-empleado-documentos` envía documentos/listados al gateway de IA; deben verificarse términos, región, retención y tratamiento de PII.

## 25. Auditoría y trazabilidad

De 58 tablas tipadas, aproximadamente 56 tienen `created_at`; sólo 8 muestran `created_by` o `uploaded_by`. No se detectaron `updated_by`, `deleted_by` o un log genérico before/after. Hay historial puntual (por ejemplo sueldos), pero no una política transversal.

Hoy no puede responderse consistentemente quién cambió qué, cuál era el valor anterior y por qué. Esto es insuficiente para pagos, cobranzas, proveedores, certificados, usuarios y permisos. Se recomienda un registro append-only con actor, rol, request/correlation ID, entidad, acción, before/after redactado, timestamp servidor y origen; acceso restringido y retención definida.

## 26. Backups y recuperación

`backup-database/index.ts` exporta a JSON una lista hardcodeada de alrededor de 29 tablas y la UI la transforma en XLSX. Omite módulos posteriores, Auth, roles/perfiles relevantes, objetos de Storage y configuración. Si una tabla falla, registra el error y devuelve un resultado parcial exitoso. Esto es una **exportación funcional**, no un backup integral ni restaurable.

No hay scripts de restauración, checksum, cifrado, retención, copia externa, PITR verificado ni pruebas de restore. La existencia de backups gestionados **REQUIERE VERIFICACIÓN EN LOVABLE CLOUD**. Debe definirse RPO/RTO, ejecutar restauración en ambiente aislado y documentar recuperación de DB + Auth + Storage + secrets/configuración.

## 27. Ambientes

Sólo se observa un project ID en `supabase/config.toml` y un `.env` versionado. No hay `.env.example`, perfiles de staging/test, proyectos separados, seeds seguros ni workflows por ambiente. Existe riesgo alto de que desarrollo/manual testing apunte al proyecto productivo.

Recomendación: dev, staging y producción con proyectos/credenciales separados; datos sintéticos en no-prod; migraciones promovidas por pipeline; protección de ramas; aprobación y rollback documentados. Confirmar la topología actual **REQUIERE VERIFICACIÓN EN LOVABLE CLOUD y GitHub**.

## 28. Observabilidad

No se encontró integración versionada de error tracking, APM, métricas de negocio, logs centralizados ni alertas. Cliente y funciones usan consola/toast. No hay evidencia de SLO, health check, correlation IDs o alerta por fallos de cron/functions.

Mínimo empresarial: errores frontend/Edge con release y correlation ID; métricas de latencia/error y fallas de comandos; alertas por login anómalo, cambios de roles, exportaciones, pagos/asientos, backup y jobs; dashboards sin PII; retención y acceso definidos.

## 29. Documentación

`README.md` conserva texto genérico de Lovable y un placeholder `REPLACE_WITH_PROJECT_ID`. No documenta arquitectura, setup real, variables, orden de migraciones, roles, deploy, rollback, backup/restore, storage, IA ni runbooks. `.lovable/plan` registra decisiones de features, pero no es documentación técnica canónica y contiene supuestos temporales sobre producción.

Un desarrollador nuevo podría reconocer el stack, pero no reconstruir ni operar el sistema con seguridad sin ayuda del autor o acceso cloud. Faltan: mapa de dominios, diccionario de datos, matriz RBAC/RLS, ADRs, runbooks de incidentes/deploy/rollback, política de fechas/dinero y manual de migración.

## 30. Áreas de alto riesgo de regresión

| Área | Archivos principales | Motivo/dependencias | Tests | Riesgo al modificar |
|---|---|---|---:|---|
| Registro/Auth/Roles | `useAuth.tsx`, `RegistroEmpleado.tsx`, `ProtectedRoute.tsx`, migrations | metadata, triggers, RLS y caché local | 0 | bloqueo o escalación de usuarios |
| RLS/migraciones | `supabase/migrations`, `drizzle` | policies acumulativas y dos toolchains | 0 | exposición o pérdida de acceso |
| Contabilidad | `useContabilidad.ts`, `components/contabilidad`, migration contable | asientos, pagos, estado y números | 0 | corrupción financiera |
| Liquidaciones/sueldos | `useLiquidaciones.ts`, `LiquidacionDetalle.tsx`, `SueldosTab.tsx` | loops multi-request y datos sensibles | 0 | pago/estado inconsistente |
| Certificados/cobranzas | `Certificados.tsx`, `useCertificados.ts` | archivo grande, storage, cálculos, pagos | 0 | saldos/documentos erróneos |
| Remitos | `Remitos.tsx`, grid, CSV, `obraMatch.ts` | importación, matching por texto, liquidación | 0 | imputación incorrecta |
| Tableros/reportes | `useReporteObra.ts`, tableros | agregación cliente y rangos limitados | 0 | decisiones con datos incompletos |
| Documentos personal | `DocumentosEmpleadoTab.tsx`, hooks, Edge IA | PII, Storage, IA, realtime | 0 | fuga o pérdida de documento |
| PWA/offline | `sw.ts`, offline hooks, auth | cachés persistentes y reintentos | 0 | datos cruzados/duplicados |
| Administración usuarios | admin Edge Functions y policies | service role y cambios de credenciales | 0 | toma o bloqueo de cuentas |

## 31. Escalabilidad empresarial

La plataforma puede evolucionar hacia ERP interno si se corrigen fundamentos. React/Supabase no son el cuello de botella inmediato. Lo que no escala es la coordinación en cliente, el RBAC grueso, matching textual, ausencia de auditoría, reportes que descargan datasets y reglas monetarias/temporales dispersas.

Antes de nuevos módulos: establecer IDs/FKs como identidad, comandos atómicos por agregado, permisos granulares, eventos/auditoría, ambientes y CI. Luego se pueden incorporar módulos por dominio dentro del mismo monolito modular, compartiendo catálogos maestros (empresa, tercero, obra/centro de costo, moneda, documento) sin crear microservicios.

## 32. Preparación para Contabilidad y Tesorería

### Fundamentos existentes

- tablas iniciales de cuentas, comprobantes, pagos, asientos y líneas;
- numeración y algunos índices/FKs/RLS;
- RPCs para generar asientos;
- asociación con obras/centros de costo en parte del modelo;
- soporte nominal para moneda/cotización en base.

### Fundamentos faltantes antes de ampliar

1. modelo de posteo: borrador -> aprobado -> posteado -> reversado, sin edición/borrado del posteado;
2. partida doble garantizada en servidor y constraints diferibles/validación transaccional;
3. claves únicas de comprobante e idempotencia de cobro/pago/asiento;
4. libro mayor/submayores reproducibles, períodos y cierres;
5. cuentas corrientes de cliente/proveedor con imputación y pagos parciales;
6. caja, bancos, transferencias y conciliación;
7. moneda/tipo de cambio histórico, fuente, fecha y regla de redondeo;
8. impuestos/IVA y condición fiscal versionada;
9. segregación crear-aprobar-pagar-contabilizar/revertir;
10. auditoría before/after y documentos adjuntos;
11. transacciones servidor, control de concurrencia y tests;
12. integración estable de obra como centro de costo mediante FK, no texto.

**Conclusión:** preparación actual baja para uso contable formal y media como prototipo funcional. No agregar Tesorería sobre el flujo actual hasta resolver FIN-01, SEC-02, DAT-01, AUD-01, TST-01 y MON-01.

## 33. Arquitectura objetivo recomendada

Mantener un **monolito modular**:

- **Presentación:** pages/componentes; sin SQL ni reglas financieras.
- **Aplicación:** comandos y queries por dominio (`certificados`, `stock`, `compras`, `contabilidad`), DTOs tipados y manejo uniforme de errores.
- **Dominio liviano:** funciones puras para dinero, estados, fechas, validaciones y permisos; sin framework nuevo.
- **Infraestructura:** único adaptador Supabase por módulo, Storage/IA/notificaciones detrás de interfaces simples.
- **Base:** RPCs transaccionales para comandos críticos; vistas/RPCs para reportes; constraints como última defensa.
- **Seguridad:** capabilities + alcance, RLS testeada y service role sólo en funciones autorizadas.
- **Operación:** CI, migración reproducible, observabilidad, backup/restore y ambientes separados.

La transición debe ser “al tocar”: primero caracterizar con tests, extraer una operación completa, conservar API/UI y evitar una migración masiva de carpetas.

## 34. Roadmap técnico

| Fase | Tarea | Prioridad | Complejidad | Riesgo de ejecución | Dependencias | Beneficio esperado |
|---|---|---|---|---|---|---|
| FASE 0 — Seguridad y riesgos críticos | verificar/revocar exposición `personal`; auditar accesos | inmediata | media | medio | acceso cloud/logs | corta posible fuga de PII |
| FASE 0 | cerrar escalación por registro/vinculación y auditar roles | inmediata | alta | alto | diseño de alta e identidad | evita toma de admin |
| FASE 0 | autenticar/autorizar/rate-limit Edge Functions | inmediata | media | medio | matriz de permisos | protege service role y créditos |
| FASE 0 | revisar caché PWA y purga por logout | inmediata | media | medio | estrategia offline | evita residuos entre usuarios |
| FASE 0 | congelar posteo contable no controlado | inmediata | baja | bajo | decisión operativa | evita agravar integridad |
| FASE 1 — Estabilización | seleccionar package manager y crear CI build/lint/typecheck | alta | baja | bajo | acceso GitHub | baseline reproducible |
| FASE 1 | crear tests RLS/auth y smoke E2E | alta | media | bajo | ambiente test | protege accesos y operación |
| FASE 1 | definir dev/staging/prod y promoción de migraciones | alta | alta | medio | proyectos cloud | reduce impacto en producción |
| FASE 1 | validar backup, PITR y restore drill | alta | media | bajo | Lovable Cloud | continuidad verificable |
| FASE 1 | instrumentar errores, correlation IDs y alertas | alta | media | bajo | herramienta elegida | detección temprana |
| FASE 2 — Deuda prioritaria | transacciones para stock, liquidaciones, certificados, OC/cotizaciones | alta | alta | medio | tests de caracterización | elimina estados parciales |
| FASE 2 | FK de remito a obra y backfill validado | alta | alta | alto | análisis de datos | imputación fiable |
| FASE 2 | unificar fechas, dinero y validaciones | alta | media | medio | reglas acordadas | cálculos consistentes |
| FASE 2 | definir autoridad única de migraciones | alta | media | medio | inventario de esquema | elimina drift |
| FASE 2 | audit log y actores en operaciones críticas | alta | alta | medio | privacidad/retención | trazabilidad |
| FASE 3 — Refactor estructural | extraer módulos certificados/remitos/personal por vertical | media | alta | medio | tests | menor costo de cambio |
| FASE 3 | reducir `any` y habilitar strict incremental | media | media | bajo | CI | contratos fiables |
| FASE 3 | reemplazar queries masivas por server-side aggregation | media | media | bajo | métricas/índices | escala y exactitud |
| FASE 4 — Preparación empresarial | capabilities, scopes y segregación de funciones | alta | alta | alto | matriz organizacional | RBAC empresarial |
| FASE 4 | maestros comunes: empresa, tercero, obra, moneda, documento | alta | alta | alto | gobierno de datos | base coherente para módulos |
| FASE 5 — Contabilidad y Tesorería | rediseñar posteo, reversión, períodos, CC, caja/bancos y conciliación | alta | alta | alto | fases 0-4 | integridad financiera |
| FASE 6 — Nuevos módulos | incorporar por dominio con gates de seguridad/test/auditoría | normal | variable | medio | fases previas | crecimiento controlado |

## 35. Quick Wins

Estas tareas son pequeñas en alcance, pero deben ejecutarse después de aprobar el plan, no como parte de esta auditoría:

1. documentar y fijar un único package manager;
2. agregar `typecheck` y CI sin cambiar comportamiento;
3. crear `.env.example` sin valores y dejar de versionar archivos de ambiente futuros;
4. eliminar el placeholder del README y documentar setup/ambientes;
5. hacer visible en UI cuando un reporte llegó al límite de filas;
6. centralizar la obtención de “fecha de hoy en Argentina”;
7. limpiar caches offline al cerrar sesión como mitigación inmediata;
8. hacer fallar el backup/export si una tabla no se exporta y rotularlo “exportación parcial”;
9. registrar correlation ID en Edge Functions;
10. crear los primeros tests de denegación anónima para `personal` y de no escalación.

## 36. Qué NO conviene tocar todavía

- No reescribir el frontend ni migrar de Supabase/Lovable sin un caso técnico/operativo.
- No dividir en microservicios: aumentaría coordinación, observabilidad y despliegues sin resolver integridad.
- No partir `Certificados.tsx`/Remitos de forma masiva antes de tests de caracterización.
- No activar `strict` global de una vez; produciría cientos de cambios mezclados.
- No unificar todas las librerías PDF/Excel antes de mapear casos de uso y salidas esperadas.
- No renombrar estados/roles directamente sobre producción antes de matriz y migración compatible.
- No hacer backfill automático de `obra_id` por texto sin revisión de ambigüedades.
- No rediseñar todo el esquema contable en paralelo con nuevas funcionalidades.
- No borrar migraciones históricas ni regenerar una baseline sin ensayo de restauración.
- No cambiar comportamiento offline hasta acordar qué datos pueden quedar en el dispositivo.

## 37. Información que requiere revisión manual en Lovable Cloud

- [ ] Confirmar si la policy pública sobre `personal` está desplegada y qué grants tiene `anon`.
- [ ] Probar con cuenta anónima controlada qué columnas/filas de `personal` y la vista de legajos son legibles.
- [ ] Auditar usuarios creados por `/registro`, vínculos `personal.user_id`, roles y cambios históricos.
- [ ] Confirmar si signup público, email confirmation, CAPTCHA y rate limit están activos.
- [ ] Verificar `verify_jwt`, CORS, rate limits y versión desplegada de cada Edge Function.
- [ ] Revisar invocaciones/logs de `send-push`, `recordar-parte-pendiente`, parsers y matching IA.
- [ ] Inventariar secrets, fecha de rotación, responsables y exposición en logs; no copiar valores.
- [ ] Confirmar migraciones Supabase y Drizzle realmente aplicadas, orden y divergencias.
- [ ] Exportar estado efectivo de grants, policies, funciones `SECURITY DEFINER` y search paths.
- [ ] Confirmar buckets, privacidad, límites MIME/tamaño y policies; especialmente `empleado-documentos` y `mantenimiento-adjuntos`.
- [ ] Verificar backups automáticos, PITR, región, retención, cifrado y última restauración exitosa.
- [ ] Confirmar RPO/RTO/SLA, incidentes y contacto de soporte.
- [ ] Confirmar ambientes/proyectos separados y qué project ID usa cada deploy/preview.
- [ ] Revisar dominios, headers de cache/CSP/HSTS, service worker desplegado y purga de caches.
- [ ] Revisar logs de consultas/errores, tamaño de tablas, p95 y límites de Supabase.
- [ ] Confirmar cron jobs, `pg_net`, Realtime publications y fallas recientes.
- [ ] Verificar configuración de IA: proveedor/modelos, región, retención, PII, cuotas y costos.
- [ ] Revisar ramas/protecciones, pipeline, quién puede desplegar y mecanismo de rollback en GitHub/Lovable.

## 38. Top 10 hallazgos

1. **SEC-02 — Elevación de privilegios en registro/vinculación.** Un legajo controlado por el usuario puede derivar en rol `admin` y la RPC permite UUID objetivo arbitrario.
2. **SEC-01 — Posible exposición pública de `personal`.** La policy versionada permite `SELECT USING (true)` sobre una tabla con PII y salarios.
3. **FIN-01 — Contabilidad sin integridad de posteo.** Documentos/asientos son mutables y borrables, sin garantías de partida doble/reversión/idempotencia.
4. **DAT-01 — Operaciones empresariales no transaccionales.** Certificados, cotizaciones, órdenes, remitos y pagos pueden quedar a mitad.
5. **SEC-03 — Edge Functions con privilegio insuficientemente autorizado.** Push, recordatorios e IA exponen service role/créditos/PII.
6. **AUD-01 — Ausencia de trazabilidad transversal.** No puede reconstruirse quién cambió valores críticos ni el before/after.
7. **TST-01 — Sin tests ni CI.** Cada cambio en módulos monolíticos llega sin red automatizada a un sistema productivo.
8. **BKP-01 — Recuperación no demostrada.** La función llamada backup es una exportación parcial; backups/PITR/restore cloud no están verificados.
9. **DB-01 — Imputación de remitos por texto.** Costos e ingresos pueden asignarse mal y los reportes no escalan.
10. **ENV-01 — Ambientes no separados de forma verificable.** Existe riesgo de desarrollar/probar sobre infraestructura y datos productivos.

---

**Cierre:** el producto es recuperable y evolucionable sin reescritura. La prioridad no debe ser agregar más superficie funcional, sino cerrar acceso, transacciones, trazabilidad, pruebas, ambientes y recuperación. Una vez estabilizados esos fundamentos, React + Supabase/Lovable pueden seguir soportando un ERP interno de pequeña/mediana empresa mediante una arquitectura modular y cambios incrementales.
