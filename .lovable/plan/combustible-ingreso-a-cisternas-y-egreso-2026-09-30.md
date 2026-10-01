# Combustible: Ingreso a cisternas y Egreso

En el formulario de entrega de combustible se agrega un selector **Movimiento: Ingreso / Egreso**.

## Qué va a ver

- **Egreso** (por defecto): igual que hoy — carga de combustible a una máquina (operador, máquina, horas/km, obra).
- **Ingreso**: carga que entra a una cisterna. El formulario muestra solo:
  - Fecha, producto, cantidad (litros), N° remito, observaciones.
  - **Cisterna** (obligatoria): solo 981, 982, 983 o 984.
  - Se ocultan operador, tipo de operador, horas, km y obra.
- En la lista de entregas, cada tarjeta muestra una etiqueta verde "Ingreso" o roja "Egreso", y los totales separados (L ingresados / L entregados).
- En el módulo Combustible de administración: nueva columna/filtro "Movimiento" y un resumen **Historial de cisternas** con lo ingresado por cisterna y por mes. Los ingresos no se suman como consumo de máquinas ni como costo de obra (para no contar dos veces el mismo combustible).
- Aplica a todos los que cargan combustible (Franco desde Remitos, repartidores desde Parte Diario).

## Detalles técnicos

- Migración: `ALTER TABLE cargas_combustible_repartidor ADD COLUMN tipo_movimiento text NOT NULL DEFAULT 'egreso' CHECK (tipo_movimiento IN ('ingreso','egreso'))`. Los registros existentes quedan como egreso.
- Cisternas identificadas por `maquinarias.codigo IN ('981','982','983','984')` (tipo `tanque_cisterna`); el ingreso guarda la cisterna en `maquinaria_id`.
- `CargaCombustibleRepartidorDialog.tsx`: selector, campos condicionales, validación de cisterna; `onSave` incluye `tipo_movimiento`.
- `useCargasRepartidor.ts` / `useCargasRepartidorAll.ts`: exponer el campo y totales por tipo.
- `CargasCombustibleRepartidorList.tsx`: etiqueta y totales separados.
- `CombustibleRepartidorTab.tsx`: filtro, columna y resumen por cisterna/mes.
- Excluir `tipo_movimiento = 'ingreso'` de los cálculos de consumo/costo por máquina y obra (`useTableroObras`, `useReporteObra`, `GastosMaquinaria` donde lean esta tabla).
