# Tablero: gastos por categoría, beneficio vs cotizado y lectura sin mouse

## 1. Gastos separados por categoría real

Hoy el gráfico de gastos solo muestra tres bloques: Combustible, Mantenimiento y "Otros gastos" (todo junto). En la base, `otros_gastos` ya guarda una categoría por gasto (hoy se usan: servicios, materiales, varios).

Cambio:
- Traer la categoría de cada gasto y desglosar el bloque "Otros gastos" en sus categorías reales (Servicios, Materiales, Varios y cualquier otra que se cargue en el futuro).
- El gráfico de composición pasa a mostrar: Combustible, Mantenimiento y una porción por cada categoría cargada, ordenadas de mayor a menor.
- Debajo del gráfico, una lista compacta con categoría, monto y porcentaje, siempre visible (sin necesidad de apoyar el mouse).
- Si hay muchas categorías chicas, se muestran las 5 principales y el resto se agrupa como "Otras".

## 2. Cotizado vs gastado (beneficio)

Cada obra puede tener cotizaciones asociadas; se toman las que están en estado **aprobada**.

Cambio:
- Nueva tarjeta "Rentabilidad" en el panel de la obra con:
  - **Cotizado** (suma de cotizaciones aprobadas de la obra, sin IVA).
  - **Gastado** (acumulado histórico de la obra: combustible + mantenimiento + otros gastos).
  - **Beneficio** = Cotizado − Gastado, y **margen %**, en verde si es positivo y en rojo si es negativo.
  - Barra de avance que muestra qué porcentaje del monto cotizado ya se consumió en gastos.
- Si la obra no tiene cotización aprobada, la tarjeta lo indica ("Sin cotización aprobada") en lugar de mostrar números vacíos.

## 3. Gráficos legibles sin mouse (modo TV)

Los tooltips de Recharts solo aparecen al pasar el mouse, y en la TV nadie va a apoyarlo.

Cambio:
- Quitar la dependencia del tooltip: los valores se dibujan directamente sobre el gráfico.
  - Gráfico de barras por día: valor escrito arriba de cada barra (se ocultan los valores en cero y, si hay muchos días, se muestran uno de cada dos para que no se superpongan).
  - Gráfico acumulado: se marca y etiqueta el valor final del período, más máximo del eje visible.
  - Composición de gastos: porcentaje sobre cada porción y monto en la lista de abajo.
- Los tooltips se mantienen solo en la vista de escritorio (donde sí hay mouse) y se desactivan cuando el tablero está en modo TV/pantalla completa.
- Tipografía y etiquetas más grandes en modo TV para que se lean de lejos.

## Detalle técnico

- `src/hooks/useTableroObras.ts`: agregar `categoria` al select de `otros_gastos` y devolver `gastosPorCategoria: { categoria: string; monto: number }[]` por obra; sumar consulta de `cotizaciones` (estado `aprobada`, por `obra_id`) devolviendo `montoCotizado`.
- `src/hooks/useTableroHistorico.ts`: incluir el desglose por categoría en el acumulado histórico y el gasto total histórico usado para el beneficio.
- `src/components/dashboard/ObraDashboard.tsx`: nuevo bloque de rentabilidad, pie de gastos alimentado por `gastosPorCategoria`, `LabelList` en barras y área, `RTooltip` condicionado a `!tv`, leyenda propia con montos.
- Sin cambios de esquema en la base de datos.
