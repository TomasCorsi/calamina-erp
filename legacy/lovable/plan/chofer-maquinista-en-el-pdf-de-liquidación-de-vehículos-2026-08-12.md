# Chofer / maquinista en el PDF de liquidación de vehículos

El PDF consolidado de Maquinarias → Gastos ("PDF - todos los vehículos") no muestra quién manejó cada unidad. Se agrega esa información. El filtro por categoría existente en la pantalla se sigue usando tal cual.

## Qué cambia

Nueva columna **Chofer / Maquinista** en la tabla principal del PDF, con el o los operadores que registraron partes diarios de esa unidad dentro del período, ordenados por cantidad de días y con los días entre paréntesis (ej. "J. Pérez (12d) | M. Gómez (3d)"). Si hay más de dos, se muestran los dos primeros y "+N". Si no hay partes en el período, se muestra "-".

Para que entre la columna se reacomodan los anchos (se acorta el bloque de nombre del vehículo), manteniendo el formato actual: apaisado, escala de grises + rojo, fila de TOTALES y resumen por tipo de gasto.

## Detalles técnicos

- `src/components/maquinarias/GastosMaquinaria.tsx`:
  - Nueva query `partes_diarios_periodo`: trae `maquinaria_id, fecha, personal(nombre, apellido)` de partes `completado` en el rango de fechas (paginada por lotes de 1000 según el patrón existente), y arma un mapa `maquinaria_id -> [{ nombre, dias }]`.
  - `exportarPDFTodos` agrega `conductores` a cada fila.
- `src/utils/generateGastosMaquinariaPDF.ts`:
  - `VehiculoLiquidacionRow` suma `conductores?: Array<{ nombre: string; dias: number }>`.
  - `generateLiquidacionVehiculosPDF` agrega la columna y ajusta `columnStyles`.
