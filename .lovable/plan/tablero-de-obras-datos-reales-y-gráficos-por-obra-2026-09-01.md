# Tablero de Obras: datos reales y gráficos por obra

## El problema principal (verificado en la base)

Los remitos **no se están contando**. En el período agosto 2026 hay 1.062 remitos, y los 1.062 tienen `obra_id` vacío. El tablero filtra remitos por `obra_id`, entonces siempre da 0 en m³ y en movimientos.

En el resto del sistema (liquidación por obra, importaciones) la obra del remito se identifica por los campos de texto **Desde / Hasta** (por ejemplo "Ceamse Ensenada", "La Alameda", "Canteras del Gaucho"), que coinciden con los nombres de obra cargados.

Otros hallazgos del mismo período:
- Combustible: 555 cargas, 551 con obra asignada — hoy el tablero **no usa combustible en absoluto**.
- Partes diarios: 912 registros, 603 con obra.
- Otros gastos: solo 8 registros con obra.

## Qué se va a hacer

### 1. Que los datos aparezcan
- Los remitos de una obra se van a buscar por `obra_id` **o** por coincidencia de nombre en Desde/Hasta (comparación normalizada: sin mayúsculas, acentos ni espacios de más), igual que hace la liquidación por obra.
- Sumar el módulo de **combustible** al tablero: litros del período por obra y su costo (litros x precio del mes según la tabla de precios por producto).
- Gastos del período por obra = otros gastos + mantenimientos de sus máquinas + combustible.
- Cada KPI muestra "sin datos" en gris cuando realmente no hay registros, en lugar de un 0 confuso.

### 2. Indicadores por obra (con lo que el sistema realmente registra)
Cada panel de obra muestra: viajes/movimientos, m³, horas de máquina, litros de combustible, personal que cargó parte, maquinaria en uso / total, gastos del período y alertas.

### 3. Gráficos: uno por obra, se sacan los generales
Se eliminan los tres gráficos generales actuales (tendencia, comparativa y dona de gastos). En su lugar, **cada obra seleccionada tiene su propio gráfico**: barras diarias del mes elegido, con un selector de métrica compartido (m³, viajes/movimientos, horas o litros de combustible), el total del período arriba y sin leyendas ni ejes recargados.

```text
┌ KPIs (6) ─────────────────────────────────────────────┐
├ Obra 1            │ Obra 2            │ Obra 3        │
│  gráfico diario   │  gráfico diario   │  gráfico      │
│  métricas         │  métricas         │  métricas     │
└───────────────────────────────────────────────────────┘
```

Todo sigue entrando en una pantalla, sin scroll, y respeta el mes seleccionado y el modo TV.


## Detalles técnicos

- `src/hooks/useTableroObras.ts`: traer remitos del período sin filtrar por obra y asignarlos por `obra_id` o por `desde`/`hasta` normalizado contra el nombre de la obra; agregar consulta a `cargas_combustible_repartidor` (por `obra_id`) y a `precios_productos_mes` para valorizar litros; nuevos campos `litros`, `costoCombustible`, `viajes`, y flags de "sin datos".
- `src/hooks/useTableroSeries.ts`: mismo criterio de asignación de remitos; agregar la serie `litros`; las series ya vienen por obra y día, se usan para el gráfico de cada panel.
- Nuevo helper de normalización de nombres de obra reutilizable (minúsculas, sin acentos, trim).
- `src/components/dashboard/ObraPanel.tsx`: gráfico de barras diario (recharts `BarChart`, ejes mínimos) + métrica de litros.
- Se eliminan `TendenciaObrasChart.tsx`, `ComparativaObrasChart.tsx` y `GastosDistribucionChart.tsx` y sus usos.
- `src/pages/Dashboard.tsx`: quitar la franja de gráficos generales, dar más alto a los paneles por obra y agregar el selector de métrica compartido y el KPI de combustible.

Nota: esto no modifica los datos existentes; los remitos siguen sin `obra_id` y se resuelven por nombre al momento de leerlos.

