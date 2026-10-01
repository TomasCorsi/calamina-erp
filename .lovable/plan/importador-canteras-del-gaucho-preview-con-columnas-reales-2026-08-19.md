# Importador Canteras del Gaucho: preview con columnas reales

## 1. Número de remito → Remito tercero

El valor de la columna `remito N°` ya se guarda en el campo **Remito tercero** del sistema (verificado en el mapeo actual). Lo que confunde es la previsualización, que titula esa columna sólo como "Remito". Se renombra el encabezado a **Rem. Tercero** para que quede explícito.

## 2. Previsualización con las columnas reales del remito

Reemplazar la tabla simplificada de la previsualización (Fecha, Remito, Material, Patente, Hasta, Cliente, M3, Precio, Importe) por una tabla con las mismas columnas y el mismo formato que la grilla de Remitos, mostrando exactamente cómo va a quedar cada fila cargada:

| Columna | Valor que se va a guardar |
|---|---|
| Fecha | fecha del archivo (dd/mm/aaaa) |
| Rem. Tercero | remito N° |
| Rem. Local | vacío |
| Desde | vacío |
| Hasta | obra matcheada (en ámbar si no matcheó) |
| Tipo | material normalizado |
| Transporte | Calamina Sur (fijo) |
| Vehículo | código - patente del vehículo matcheado (en ámbar si no matcheó) |
| Cliente | cliente de la obra |
| Viajes | 1 (fijo) |
| C. Uni. | m3 |
| C. Total | m3 |
| Unidad | M3 (fijo) |
| P. Unit. | precio, con formato $ |
| P. Total | importe, con formato $ |
| Proveedor | Canteras del Gaucho (fijo) |

Las columnas fijas (Transporte, Viajes, Unidad, Proveedor) se muestran en gris tenue para dejar claro que son valores automáticos, y se agrega arriba de la tabla una línea de totales: cantidad de remitos, total de M3 y total de importe.

La tabla queda con scroll horizontal y vertical dentro del diálogo, mostrando todas las filas leídas (no sólo las primeras).

## 3. Aviso de obras no vinculadas

En el ejemplo cargado, todas las filas quedaron sin "Hasta" ni "Cliente". Se mantiene el contador de "sin obra vinculada" y se agrega, al lado, el detalle de los nombres del archivo que no matchearon (hasta 5, con "y N más"), para poder corregir el Excel o dar de alta la obra antes de importar.

## Detalles técnicos

- Cambios acotados a `src/components/remitos/ImportGauchoDialog.tsx`: encabezados y celdas de la tabla de preview, línea de totales y detalle de obras no encontradas.
- Se reutiliza `formatDate` de `@/lib/utils` y `toLocaleString("es-AR")` para montos, igual que en `RemitosSimpleGrid`.
- No cambia el mapeo ni la lógica de importación (`onImport` / `createRemitosBulk`), ni la base de datos.
