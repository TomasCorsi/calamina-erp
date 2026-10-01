# Gráficos del tablero: recuperar altura

## Qué está pasando

El tablero de una obra se arma como una columna de altura fija (en la app `100vh - 11rem`, en TV `100vh`). Todo lo de arriba —encabezado, 4 KPIs principales, 4 KPIs secundarios y la tarjeta de Rentabilidad— está marcado como "no se encoge", y los gráficos ocupan sólo lo que sobra. Como la tarjeta de Rentabilidad creció (bloques de Cotizado/Gastado/Beneficio + barra de consumo + Anticipo/Certificado/Cobrado + Avance grande), ya casi no queda espacio: los gráficos quedan aplastados a unos pocos píxeles y sólo se ve el título y el eje, como en la captura.

## Qué propongo

### 1. Compactar la tarjeta de Rentabilidad
Misma información, menos alto:
- Cotizado / Gastado / Beneficio en una fila de tres bloques más bajos (importe entero en una línea, el "en millones" al lado y no debajo).
- Barra de consumo más fina y su texto en la misma línea.
- Anticipo / Certificado / Cobrado total pasan a ser chips en una sola fila compacta (rótulo chico + importe), no tarjetas de tres renglones.
- Avance de obra: el número grande se mantiene, pero en la misma fila que los chips en pantallas anchas, con la barra al lado.

Objetivo: que la tarjeta pase de ~280 px a ~140 px de alto en la app.

### 2. Piso de altura para los gráficos
- En la app (no TV): el bloque de gráficos deja de pelear por el resto y pasa a tener alto mínimo propio (~460 px), con la página scrolleando si hace falta. Así los gráficos siempre se ven completos, sin importar cuánto ocupe la rentabilidad.
- En TV (sin scroll): se mantiene el ajuste a pantalla, pero con la rentabilidad compacta los gráficos recuperan aproximadamente la mitad de la pantalla, y cada tarjeta de gráfico recibe un alto mínimo para que nunca colapse.

### 3. Detalle de las tarjetas de gráfico
- Alto mínimo por tarjeta (~150 px en app, ~180 px en TV) para que el área del gráfico nunca quede en cero.
- La columna derecha (Materiales, Horas por tipo, tercer gráfico) pasa a filas de alto mínimo en lugar de `grid-rows-3` puro, que es lo que hoy las reparte hasta dejarlas invisibles.

## Detalles técnicos

- `src/components/dashboard/ObraDashboard.tsx`
  - Reescribir el interior de la Card "Rentabilidad de la obra" (bloques, barra, chips y avance) en versión compacta, sin cambiar ningún cálculo (`cotizado`, `gastadoHistorico`, `beneficio`, `consumido`, `anticipoCobrado`, `cobradoTotal`, `saldoPendiente`, `avance`).
  - Contenedor de gráficos (línea ~599): en modo app usar `min-h-[460px]` y dejar de depender sólo de `flex-1`; en TV mantener `flex-1 min-h-0`.
  - `ChartCard` (línea ~161): agregar `min-h-[150px]` (`min-h-[180px]` con `tv`).
  - Sub-grids `grid-rows-2` / `grid-rows-3`: usar `auto-rows-fr` con alto mínimo en app.
- `src/pages/Dashboard.tsx`: la pestaña "Tablero" pasa de altura fija `lg:h-[calc(100vh-11rem)]` a altura mínima, para permitir scroll cuando el contenido no entra.
- Sin cambios de datos, hooks ni lógica de negocio.

---

# Gastos de la obra: fuentes correctas y desglose por categoría

## Qué está pasando hoy

En el tablero (`useTableroObras.ts` y `useTableroHistorico.ts`) el gasto de cada obra se arma con tres fuentes:
combustible (litros × precio del mes), mantenimientos de las máquinas de la obra y `otros_gastos` (que es lo que se
carga en "Gastos generales"). **Las órdenes de compra no se suman en ningún lado**, y hoy hay 64 órdenes cargadas
(51 recibidas + 13 emitidas) por unos $894 M que no impactan en el gasto ni en la rentabilidad.

## Qué propongo

1. **Sumar las órdenes de compra** al gasto de la obra, tanto en el mes como en el histórico, tomando `total`
   de `ordenes_compra` por `obra_id` y `fecha`. Se cuentan las órdenes en estado `emitida` y `recibida`; las
   `borrador` quedan afuera (todavía no son gasto comprometido).
2. **Desglose por categoría** en la tarjeta de gastos del tablero, con estas categorías fijas:
   - Combustible
   - Órdenes de compra (opcionalmente abiertas por sector de la orden)
   - Gastos generales, abiertos por su categoría (alquiler, transporte, servicios, materiales, viáticos, varios)
   - Mantenimiento
   Se ordenan de mayor a menor y se muestra el monto y el % sobre el total gastado.
3. **Rentabilidad coherente**: al incluir órdenes de compra, el "Gastado", el "% consumido" y el "Beneficio"
   de la tarjeta de Rentabilidad pasan a reflejar el gasto real. No cambia ninguna otra fórmula.

## Detalles técnicos

- `src/hooks/useTableroObras.ts`: agregar una consulta a `ordenes_compra`
  (`obra_id, fecha, total, estado, sector`) filtrada por obra, rango del mes y `estado in ('emitida','recibida')`;
  sumar a `gastosMes` y agregar la entrada en `gastosPorCategoria`.
- `src/hooks/useTableroHistorico.ts`: misma consulta sin filtro de fecha, sumada a `gastos` y a
  `gastosPorCategoria` del histórico.
- `src/components/dashboard/ObraDashboard.tsx`: `armarGastos` ordena por monto y muestra el % del total;
  sin cambios en la lógica de rentabilidad más allá de recibir el nuevo total.
