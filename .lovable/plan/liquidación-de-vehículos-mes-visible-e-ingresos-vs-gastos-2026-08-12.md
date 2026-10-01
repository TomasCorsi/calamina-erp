# Liquidación de vehículos: mes visible e ingresos vs gastos

Dos cambios en el PDF "todos los vehículos" (Maquinarias → Gastos).

## 1. Mes del período en el PDF

Debajo del título "LIQUIDACIÓN DE VEHÍCULOS" se muestra el mes en texto (ej. "AGOSTO 2026") cuando el rango filtrado corresponde a un único mes. Si el rango abarca varios meses, se muestra "AGOSTO 2026 - OCTUBRE 2026". Se mantiene la línea de "Período: dd/mm/aaaa - dd/mm/aaaa" ya existente. El mes también se agrega al nombre del archivo.

## 2. Ingresos vs gastos

Hoy los remitos se suman como gasto dentro de "GASTO TOTAL". Se corrige: los remitos son **ingresos** (solo aplican a camiones y demás unidades que facturan viajes).

Nueva estructura de la tabla:

- Código, Vehículo, Tipo, Chofer / Maquinista
- Litros, $ Combustible
- Mant., $ Mantenimiento
- **GASTO TOTAL** = combustible + mantenimiento
- Rem./Viajes, **INGRESOS** ($ remitos)
- **RESULTADO** = ingresos - gastos, en verde si positivo, en rojo si negativo

Filas sin ingresos (maquinaria que no hace viajes) muestran "-" en ingresos y el resultado queda igual al gasto en negativo.

Fila de TOTALES con gasto total, ingreso total y resultado global.

Debajo de la tabla, el bloque resumen actual pasa a mostrar:
- Ingresos totales (remitos)
- Gastos: combustible y mantenimiento con su porcentaje sobre el gasto
- Resultado del período y margen (%) sobre ingresos

## Detalles técnicos

- `src/utils/generateGastosMaquinariaPDF.ts` → `generateLiquidacionVehiculosPDF`: reordenar columnas, calcular `gastoOperativo` (combustible + mantenimiento) y `resultado`, colorear la columna resultado con `didParseCell`, agregar la línea de mes y reescribir el bloque de totales por concepto.
- `src/components/maquinarias/GastosMaquinaria.tsx` → `exportarPDFTodos`: `gastoTotal` deja de incluir `costoRemitos`; se pasa `ingresoRemitos` por separado. El filtro de "vehículos con movimiento" se mantiene igual.
- El PDF individual por máquina y el Excel no se modifican.
