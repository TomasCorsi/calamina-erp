# Inventario funcional y mapa de migración del frontend legacy

Fecha de revisión: 2026-10-02.

Este inventario se obtuvo de `src/App.tsx`, `src/pages/`,
`src/components/layout/Sidebar.tsx`, `AppLauncher.tsx`, hooks y consultas
Supabase del código existente. No habilita ninguna consulta legacy: sólo define
qué UI puede recuperarse y qué backend debe reemplazarse antes de montar cada
módulo.

## Estado de integración

La aplicación principal vuelve a ser el router legacy (`App.tsx`), con la
grilla `Index`, `MainLayout`, `TopNavbar` y `AppLauncher`. Los módulos marcados
como pendientes conservan su tile, ruta, título y layout, pero el router no
monta todavía sus hooks de datos. De esta manera no se ejecutan consultas al
esquema anterior ni se presenta un shell alternativo.

| Sección real | Ruta legacy | Entradas UI principales | Tablas, vistas o servicios observados | Estado v2 y adaptación necesaria |
|---|---|---|---|---|
| Inicio / Dashboard | `/`, `/dashboard` | `Index`, `Dashboard`, componentes `dashboard/*` | `obras`, `maquinarias`, `viajes`, `cotizaciones`, `personal_selector`, `mantenimientos` | Shell v2 activo; KPIs legacy pendientes de queries/RLS v2 por dominio. |
| Tablero TV | `/tablero/tv` | `TableroTV`, `TableroVista` | `tablero_sesiones`, consultas agregadas de obras, partes, remitos, combustible, gastos, compras y mantenimiento | Pendiente; requiere modelo de lectura y, si se conserva actualización en vivo, revisar Realtime por separado. |
| Obras | `/obras` | `Obras`, formularios, tabla y diálogos legacy | V2: `obras`, catálogo mínimo `clientes`, `personal` | Compatible v2 para listado, filtros, detalle y CRUD bajo `obras.view`/`obras.manage`. Avance y certificados siguen aislados hasta migrar esos dominios. |
| Clientes | `/clientes` | `Clientes` | V2: catálogo mínimo `clientes` sólo para Obras; CRUD legacy aún aislado | La pantalla Clientes sigue pendiente; su catálogo v2 no habilita escrituras desde esa ruta. |
| Cotizaciones | `/cotizaciones` | `Cotizaciones`, `ImportComputoDialog` | `cotizaciones`, `cotizacion_categorias`, `cotizacion_items`, `cotizacion_anticipos`, Edge `parse-computo` | Pendiente; modelar cabecera/items transaccionalmente y revisar la Edge de importación. |
| Certificados | `/certificados` | `Certificados`, componentes `certificados/*` | `certificados`, `certificado_items`, `certificado_conceptos`, `certificado_pagos`, bucket `certificado-comprobantes` | Pendiente; requiere esquema, storage/policies y operaciones transaccionales. |
| Personal | `/personal` | `Personal`, `EmpleadosTab`, `EmpleadoDialog`, tablas, filtros y diálogos compartidos | Legacy: `personal`, vacaciones, sueldos, EPP, documentos. V2: RPCs `list/create/update/set_personal_status` | Compatible para datos básicos v2. Se reutilizó la presentación; tabs laborales/documentales siguen pendientes. |
| Usuarios | legacy dentro de Configuración; v2 `/usuarios` | `UserManagement`, `LinkUserDialog`, diálogos de email/password | Legacy: `profiles`, `user_roles`, `personal`, Edge de cambio de email/password. V2: memberships, IAM, invitaciones y RPCs de gestión | Compatible para listado, invitación, roles asignables y suspensión. Cambio de email/password y vínculo manual quedan pendientes. |
| Maquinarias / flota | `/maquinarias` | `Maquinarias`, `MaquinariasDataGrid`, paneles de gastos/actividad | `maquinarias`, `partes_diarios`, `horas_maquina` | Pendiente; separar maestro de equipos, asignación a obra, horas y costos. |
| Viajes | `/viajes` | `Viajes` | `viajes` | Pendiente; CRUD directo y relaciones deben llevar RLS/RPC. |
| Remitos | `/remitos` | `Remitos`, `RemitosSimpleGrid`, `RemitoQuickFormDialog`, `RemitoItemsEditor` | v2: `remitos`, `remito_items`, `obras`, `clientes`, `maquinarias`, `api.replace_remito_items` | Núcleo compatible v2: listado, filtros, alta, edición, baja e ítems atómicos. Importaciones CSV/Gaucho, liquidaciones y precios masivos siguen visibles pero aislados y deshabilitados hasta una migración específica. |
| Gastos / Combustible | `/gastos` | `Gastos`, componentes `gastos/*` | `cargas_combustible_repartidor`, `otros_gastos`, obras y personal selector | Pendiente; separar carga operativa y aprobación/costo, con RPCs y auditoría. |
| Mantenimiento | `/mantenimiento` | `MantenimientoPage`, formularios de service/reparación | `mantenimientos`, `mantenimientos_list_view`, `observaciones_maquina_estado`, `personal_selector` | Pendiente; reemplazar vistas y writes directos, definir responsables y estados. |
| Stock | `/stock` | `Stock` | `stock_items`, `movimientos_stock` | Pendiente; movimientos deben ser RPC transaccional y el stock derivado no editable directamente. |
| Parte Diario | `/parte-diario` | `ParteDiario`, home, formulario, listado, detalle y vista administrativa legacy | `partes_diarios`, `obras`, maestro mínimo `maquinarias`, `api.list_parte_diario_personal_options`; borrador de formulario local | Núcleo compatible con v2. Rendimiento, faltantes, combustible, mantenimiento y alertas permanecen aislados sin consultas legacy. La cola offline anterior no se reenvía automáticamente. |
| Presentismo | `/presentismo` | `Presentismo` | `registros_hh`, `personal` | Pendiente; definir fuente de verdad y reglas de corrección/auditoría. |
| Proveedores / Compras | `/proveedores` | `Proveedores`, componentes de órdenes e importación | `proveedores`, `ordenes_compra`, `orden_compra_items`, Edge `parse-orden-compra` | Pendiente; proveedores y órdenes requieren scopes, workflow mínimo y RPC cabecera/items. |
| Liquidaciones | `/liquidaciones` | `Liquidaciones`, detalle, adelantos, préstamos y configuración | `liquidaciones`, `liquidacion_items`, `liquidacion_config_personal`, `adelantos_personal`, `prestamos_personal`, `prestamo_cuotas`, `sueldos` | Pendiente sensible; no montar hasta definir acceso salarial, auditoría y separación de funciones. |
| RRHH | `/rrhh` | `RRHH`, `EmpleadoDialog`, planillas | `rrhh_periodos`, `rrhh_novedades`, `rrhh_jornada_config`, `rrhh_feriados`, `rrhh_sueldos_historial`, vacaciones | Pendiente sensible; requiere permisos distintos de Personal básico y protección de datos laborales. |
| Reportes | `/reportes` | `Reportes`, hooks de reporte de obra | Lecturas agregadas de obras, remitos, partes, horas, maquinaria, personal/sueldos, combustible, compras, gastos, cotizaciones y clientes | Pendiente hasta migrar sus fuentes; no debe consultar el esquema legacy ni reactivar IA archivada. |
| Mensajes | `/mensajes` | `Mensajes` y plantillas WhatsApp | `personal`, `personal_selector`, `partes_diarios`; enlaces `wa.me` | Pendiente; faltan teléfono v2, consentimiento y fuentes migradas. No hay envío servidor actual. |
| Contabilidad | `/contabilidad` | `Contabilidad`, componentes `contabilidad/*` | `contab_empresa`, `contab_plan_cuentas`, `contab_terceros`, comprobantes/items, pagos, asientos/líneas y RPCs contables legacy | Diferido explícitamente; no reutilizar writes ni RPCs hasta diseñar el dominio contable v2. |
| Configuración | `/configuracion` | `Configuracion`, `UserManagement`, backup y ajustes | Usuarios legacy, Edge `backup-database`, configuraciones variadas | Pendiente; Usuarios ya vive en `/usuarios`. Backup y settings necesitan diseño v2 independiente. |
| Mi Perfil | `/mi-perfil` | `MiPerfil` | `profiles`, `personal` legacy | Pendiente; v2 permite sólo lectura propia y actualización segura de `display_name`. |
| Mis Documentos / documentación | `/mis-documentos` y tabs de Personal | `MisDocumentos`, `DocumentosEmpleadoTab` | `empleado_documentos` y Storage | Pendiente; crear buckets/policies v2 y controles de visibilidad antes de montar UI. |
| Registro de empleado | `/registro-empleado` | `RegistroEmpleado` | RPCs legacy de legajo y vinculación, `user_roles` | Retirado del flujo: fue reemplazado por invitaciones v2. |
| Instalación/PWA y recuperación | `/install`, recuperación de contraseña | pantallas Auth/PWA legacy | Auth y service worker legacy | Fuera del router operativo actual; revisar por separado sin reactivar signup público. |

## Componentes reutilizables

- Layout: `Sidebar`, `Header`, drawer responsive, logo y `bg-grid-pattern`.
- Sistema visual: componentes `src/components/ui/*`, `card-industrial`, badges,
  tablas, inputs, botones y diálogos.
- Presentación: filtros, tablas responsive, estados vacíos, acciones por fila y
  formularios modales.
- Utilidades puras sin dependencia del backend pueden reutilizarse después de
  revisar sus tipos de datos.

No son reutilizables sin adaptación los hooks `useAuth` legacy, los tipos
generados antiguos, los servicios que importan `integrations/supabase/client`,
las escrituras directas, las funciones Edge archivadas y cualquier consulta a
tablas/vistas que aún no existen en v2.

## Orden de migración

1. Obras (completado para el alcance básico v2).
2. Partes diarios.
3. Remitos.
4. Maquinarias y flota.
5. Gastos y combustible.
6. Proveedores y compras.
7. Tesorería, cuando se defina su dominio real.
8. Contabilidad.

Clientes, cotizaciones, certificados, stock, mantenimiento, viajes, RRHH,
documentación, mensajes y reportes se incorporarán según las dependencias del
módulo activo, sin conectar temporalmente al backend anterior.

## Riesgos críticos encontrados

1. Gran parte del legacy hace INSERT/UPDATE/DELETE directo desde el navegador.
2. El Auth legacy consulta `user_roles` y perfiles con un modelo incompatible.
3. Varias pantallas dependen de vistas (`*_list_view`, `personal_selector`) no
   presentes en v2.
4. Documentos y certificados dependen de buckets y policies aún no creados.
5. Partes diarios incluye cola offline; reintentar writes sin idempotencia puede
   duplicar datos.
6. Compras, liquidaciones y contabilidad necesitan transacciones; sus writes
   directos no deben trasladarse.
7. Reportes mezclan datos operativos, salarios y costos y podrían ampliar acceso
   de forma accidental.
8. Mensajes abre WhatsApp con teléfonos del personal; el teléfono no forma parte
   del baseline v2 y necesita reglas de privacidad y normalización.

## Dificultad y prioridad de migración

| Área | Estado actual | Dificultad | Prioridad |
|---|---|---:|---:|
| Inicio / grilla de aplicaciones | Restaurado | Baja | Ahora |
| Auth e invitaciones | Compatible v2 con UI legacy | Media | Ahora |
| Personal básico | Compatible v2 con UI legacy | Media | Ahora |
| Configuración / Usuarios | Parcialmente compatible v2 | Media | Ahora |
| Obras | Compatible v2 con UI legacy; avance/certificados pendientes | Media | Completado |
| Parte Diario | Núcleo CRUD/RLS v2 operativo; extensiones legacy aisladas | Media | Compatible parcial |
| Remitos | Cabecera, items e importación pendientes | Alta | 3 |
| Maquinarias / Vehículos | Maestro, actividad y costos pendientes | Alta | 4 |
| Gastos / Combustible | Operación, aprobación y auditoría pendientes | Alta | 5 |
| Proveedores / Compras | Workflow transaccional pendiente | Alta | 6 |
| Clientes | CRUD y RLS pendientes | Media | 7 |
| Viajes | Relaciones y RLS pendientes | Media | 7 |
| Mantenimiento | Estados, vistas y responsables pendientes | Alta | 7 |
| Stock | Movimientos transaccionales pendientes | Alta | 7 |
| Presentismo | Reglas y correcciones auditadas pendientes | Media | 7 |
| Cotizaciones | Cabecera, items e importación pendientes | Alta | 8 |
| Certificados | Transacciones y Storage pendientes | Alta | 8 |
| Mi Perfil / Mis Documentos | Profile parcial; Storage pendiente | Alta | 8 |
| RRHH / Liquidaciones | Datos laborales y salariales sensibles | Muy alta | 9 |
| Mensajes | Teléfono, privacidad y fuentes pendientes | Media | 9 |
| Reportes | Depende de los dominios operativos | Muy alta | 9 |
| Dashboard / Tablero TV | Agregaciones y Realtime pendientes | Muy alta | 9 |
| Contabilidad | Diferida expresamente | Muy alta | 10 |
| Registro por legajo | Retirado; reemplazado por invitaciones | — | — |
| Install/PWA | Preservado sin push legacy | Media | Posterior |
