# Combustible para Franco Buceta

Franco entra directo a Remitos. Se le agrega ahí una segunda pestaña **Combustible** donde puede registrar entregas de combustible (mismo formulario que usa Sergio) y ver únicamente las cargas que él registró.

## Qué va a ver

- Arriba de la grilla de remitos, dos pestañas: **Remitos** y **Combustible**.
- En **Combustible**:
  - Botón "Nueva entrega" que abre el mismo formulario de entrega de combustible que ya existe (fecha, producto, litros/kg, máquina, operador, obra, horas/km, N° remito, observaciones).
  - Lista de sus entregas en tarjetas, con total de litros del período.
  - Puede editar y borrar solo sus propias entregas.
- Solo ve sus cargas: la lista se filtra por él, y la base de datos ya impide ver las de otros.
- Las pestañas aparecen únicamente para Franco; el resto de los usuarios ve Remitos igual que hoy.

## Detalles técnicos

- `src/pages/Remitos.tsx`: envolver el contenido actual en `Tabs` (shadcn) cuando `isFranco`; nueva pestaña monta un componente `CombustibleRepartidorPanel`.
- Nuevo `src/components/gastos/CombustibleRepartidorPanel.tsx`: usa `useEmpleadoProfile()` para el `personal.id` del usuario, `useCargasRepartidor(null, personalId)` para listar/crear/editar/borrar, `CargaCombustibleRepartidorDialog` para el alta/edición, `CargasCombustibleRepartidorList` para el listado y `DeleteConfirmDialog` para el borrado.
- El alta setea `repartidor_id = personal.id` del usuario, igual que en el flujo de Parte Diario, lo que satisface la política RLS "Employees can manage own cargas_repartidor" (ya existente).
- Selectores de máquina / operador / obra: reusar `useMaquinarias`, `useObras` y el selector `personal_selector` como en `ParteDiario.tsx`.
- Sin cambios en base de datos ni en la lógica de negocio; las cargas quedan en `cargas_combustible_repartidor` y siguen apareciendo en el módulo Combustible de admin.
