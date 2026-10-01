# PDF consolidado de liquidación de todos los vehículos

Hoy, en Maquinarias → Gastos, el PDF solo se puede generar para la máquina seleccionada. Se agrega la posibilidad de generar un único PDF con la liquidación de **todos los camiones/vehículos** del período elegido.

## Qué se agrega

En la barra de acciones de la pestaña Gastos, junto a los botones actuales:

- Botón **PDF** → menú con dos opciones:
  - **Máquina seleccionada** (lo actual)
  - **Todos los vehículos** (nuevo)

## Contenido del PDF consolidado

1. **Portada / encabezado**: logo y datos de Calamina Sur, título "Liquidación de Vehículos", período (desde–hasta) y fecha de emisión.
2. **Resumen general (tabla principal)**: una fila por vehículo con
   - Código y nombre / patente
   - Tipo
   - Litros y $ combustible
   - Remitos / viajes y $
   - Mantenimientos y $
   - **Gasto total**
   - Fila final de **TOTALES** de todas las columnas.
3. **Totales por tipo de gasto**: bloque resumen (combustible, remitos, mantenimiento) con porcentaje sobre el total.
4. Se incluyen solo los vehículos con movimiento en el período (los sin gastos quedan fuera para no inflar el reporte).

Se respetan los filtros de período activos en la pantalla (mes actual, mes puntual o rango personalizado).

Estilo idéntico al PDF actual de gastos: escala de grises + rojo corporativo, tabla a ancho completo, numeración de páginas y repetición de encabezados.

## Detalles técnicos

- Nueva función `generateLiquidacionVehiculosPDF` en `src/utils/generateGastosMaquinariaPDF.ts` (reutiliza logo, cabecera y helpers de formato ya existentes).
- En `src/components/maquinarias/GastosMaquinaria.tsx`: nuevo cálculo `totalesPorMaquinaria` con `useMemo`, que recorre todas las maquinarias y agrega cargas de combustible (litros × precio del mes), remitos y mantenimientos aplicando el mismo filtro de fechas que ya usa `datosFiltrados`.
- El botón PDF pasa a ser `DropdownMenu` con las dos acciones; no se modifica la lógica existente de exportación individual ni el Excel.
