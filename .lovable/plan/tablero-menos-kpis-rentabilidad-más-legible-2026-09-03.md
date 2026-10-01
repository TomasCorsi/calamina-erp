# Tablero: menos KPIs, rentabilidad más legible

## Qué cambia

1. **Se sacan las 4 tarjetas grandes de KPIs** que aparecen en la captura (Movimientos mes, m³ del período, Horas del período, Gastos del período). Esa información clave ya se lee en la tarjeta de Rentabilidad y en los gráficos de abajo.
2. **Se mantienen los gráficos** tal como están hoy (serie diaria, acumulado, gastos por categoría, materiales movidos y horas por tipo de máquina), que ahora ganan todo el espacio que dejan las tarjetas.
3. **Dentro de la tarjeta de Rentabilidad, los datos de Anticipo, Certificado, Cobrado y Avance de obra se agrandan**: dejan de ser chips chicos y pasan a ser bloques con rótulo legible e importe grande (mismo peso visual que Cotizado / Gastado / Beneficio), y el % de avance de obra se muestra con número grande y barra gruesa al lado. Todo con los colores del sistema (primary, success, warning, destructive) y tamaños aún mayores en modo TV.

## Duda a confirmar

La fila secundaria de KPIs (Litros, Maquinaria en uso, Personal, Viajes de remitos) se mantiene. Si también querés sacarla, avisame y la quito.

## Estructura resultante

```text
Encabezado de obra
KPIs secundarios (Litros / Maquinaria / Personal / Viajes)
RENTABILIDAD DE LA OBRA
  Cotizado | Gastado | Beneficio     + barra de consumo
  Anticipo | Certificado | Cobrado   + AVANCE (número grande + barra)
Gráficos (columna izquierda: serie + acumulado | derecha: gastos, materiales, horas)
```

## Detalles técnicos

- `src/components/dashboard/ObraDashboard.tsx`
  - Eliminar el bloque `{/* KPIs principales */}` (grid de 4 `KPI` con `destacado`). El componente `KPI` se conserva para la fila secundaria.
  - En la Card de Rentabilidad: reemplazar la fila de chips de Anticipo / Certificado / Cobrado por una grilla de bloques con el mismo estilo que Cotizado / Gastado / Beneficio (borde, fondo tonal, `formatCurrencyFull` + `formatMillones`), y agrandar el bloque de avance (`avance.avanceGeneral`) con número grande (`text-4xl`, `text-6xl` en TV) y barra de progreso gruesa.
  - Sin cambios en cálculos: `cotizado`, `gastadoHistorico`, `beneficio`, `consumido`, `anticipoCobrado`, `cobradoTotal`, `saldoPendiente`, `avance`.
  - Contenedor de gráficos: al liberarse espacio, se mantienen los mínimos actuales (`min-h-[460px]` en app, `flex-1 min-h-0` en TV) y los gráficos crecen solos.
- Sin cambios en hooks, consultas ni lógica de negocio.
