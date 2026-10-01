# Gráficos estilo Power BI en el Tablero de Obras

Sumar una capa visual de gráficos al tablero, manteniendo los KPIs y los paneles por obra que ya existen.

Objetivo clave: todo entra en una sola pantalla, sin scroll, con pocos elementos y lectura inmediata.

## Qué se agrega (solo 3 gráficos)

**1. Tendencia de actividad (área, últimos 14 días)**
- Una línea por obra seleccionada, con selector de métrica: Movimientos, m³ u Horas.

**2. Comparativa entre obras (barras horizontales)**
- Una sola métrica visible a la vez (m³ del mes por defecto), obras ordenadas de mayor a menor.

**3. Distribución de gastos del mes (dona)**
- Participación de cada obra sobre el gasto total, con monto y porcentaje.

Se descartan el sparkline por panel y el gráfico de estado de maquinaria para no recargar la vista; la maquinaria sigue como métrica numérica en cada panel.

## Layout sin scroll

- La página del tablero usa altura fija de viewport (`h-screen`, sin scroll vertical) y reparte el espacio en tres franjas: KPIs compactos arriba, gráficos al medio, paneles de obra abajo.
- Las alturas de los gráficos se calculan con unidades relativas al alto disponible, no fijas en píxeles, para adaptarse a cualquier pantalla o TV.
- KPIs pasan a una fila compacta (una sola línea de 6 tarjetas, sin subtítulos largos).
- Paneles de obra se compactan: métricas clave en una fila y alertas resumidas en un contador con detalle en tooltip, en lugar de listado extendido.
- En pantallas chicas (móvil/tablet) sí se permite scroll: la restricción de "todo visible" aplica a escritorio y modo TV.

## Comportamiento

- Los gráficos respetan las obras seleccionadas y se actualizan con el refresco del tablero (auto-refresco de 60s en modo TV).
- En modo TV: tipografía y trazos más grandes, leyendas visibles, sin controles administrativos, todo en una pantalla.
- Paleta acorde a la identidad: rojo #B00020 principal y grises oscuros para series secundarias sobre fondo oscuro.
- Skeletons de carga y mensaje claro cuando no hay datos en el período.

## Detalles técnicos

- Librería: `recharts` (ya usada en `ViajesChart`).
- Nuevo hook `useTableroSeries(obraIds)`: consulta `partes_diarios` y `remitos` de los últimos 14 días agrupando por obra y día; mismo patrón de refresco que `useTableroObras`.
- Nuevos componentes en `src/components/dashboard/`: `TendenciaObrasChart.tsx`, `ComparativaObrasChart.tsx`, `GastosDistribucionChart.tsx`.
- `Dashboard.tsx`: contenedor flex de alto completo con `overflow-hidden` en escritorio/TV y proporciones fijas por franja.
- `ObraPanel.tsx` y `KPICard.tsx`: variante compacta para reducir alto sin perder legibilidad.
- Sin cambios de esquema en la base de datos.

