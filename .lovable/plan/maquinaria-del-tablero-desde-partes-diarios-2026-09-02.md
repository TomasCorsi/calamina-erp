# Maquinaria del tablero desde partes diarios

## Por qué aparece 0/0

La tarjeta de Maquinaria hoy cuenta la tabla de maquinarias filtrando por la obra asignada en la ficha de la máquina. En la base, de 110 máquinas solo 2 tienen obra asignada, así que casi todas las obras muestran 0/0.

## Cambio propuesto

Calcular la maquinaria de cada obra a partir de los partes diarios del período seleccionado (en septiembre hay 40 partes con máquina cargada, 32 máquinas distintas):

- **Total**: cantidad de máquinas distintas que trabajaron en esa obra durante el período elegido.
- **En uso**: máquinas distintas con parte diario en el día (mes actual) o en el período (meses pasados), es decir el mismo criterio que ya usan "Movimientos hoy" y "Personal hoy".
- Se mantiene el formato `en uso / total` en la tarjeta.
- Las máquinas que sí tengan obra asignada en su ficha se suman al total, para no perder las que están afectadas pero sin parte cargado.

## Qué son los "Movimientos"

Es el total de traslados/operaciones del período para esa obra, sumando:

- Viajes cargados en los partes diarios (`cantidad de viajes`).
- Movimientos internos cargados en los partes diarios.
- Viajes de los remitos de la obra (si el remito no trae cantidad de viajes, cuenta como 1).

En el mes en curso muestra el valor del día; en meses pasados, el total del mes.

## Layout adaptativo según cantidad de obras

La grilla de paneles hoy es siempre de 3 columnas. Pasa a adaptarse:

- 1 obra: un panel a pantalla completa, con gráfico grande y métricas en fila.
- 2 obras: dos paneles al 50% de ancho cada uno.
- 3 obras: se mantiene la grilla actual de 3 columnas.

Con menos obras se aprovecha el espacio extra agrandando el gráfico y las tipografías de las métricas (especialmente en modo TV).

## Mes + histórico juntos

Cada panel de obra muestra las métricas en dos columnas comparadas:

- **Mes seleccionado**: lo que ya se calcula hoy (m³, movimientos, horas, litros, viajes, gastos, personal, maquinaria).
- **Histórico acumulado**: los mismos totales desde el inicio de la obra hasta hoy, sin filtro de mes.

Se muestran uno al lado del otro en la misma tarjeta (valor del mes arriba, acumulado histórico debajo en menor tamaño), para leer de un vistazo el avance del mes contra el total de la obra. Los KPIs superiores también agregan la línea de acumulado histórico.

## Detalle técnico

- `src/hooks/useTableroObras.ts`: agregar `maquinaria_id` al select de `partes_diarios` y derivar `maquinariasTotal` / `maquinariasEnUso` con Sets de IDs, uniendo las máquinas con `obra_id` asignado.
- Nuevo cálculo histórico en el mismo hook (o hook paralelo `useTableroHistorico`) sin rango de fechas, con paginación de 1000 filas para remitos y partes, y `staleTime` alto por ser datos que cambian poco.
- `src/pages/Dashboard.tsx`: clase de grilla dinámica según `obras.length` (1 → `grid-cols-1`, 2 → `lg:grid-cols-2`, 3 → `lg:grid-cols-3`).
- `src/components/dashboard/ObraPanel.tsx`: prop `columnas` para escalar gráfico/tipografías y prop `historico` para el segundo valor de cada métrica.
- Sin cambios de base de datos.

