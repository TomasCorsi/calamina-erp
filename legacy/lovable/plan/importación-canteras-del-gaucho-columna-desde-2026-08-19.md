# Importación Canteras del Gaucho: columna "Desde"

El Excel ahora trae dos columnas de obra: **Desde** y **Hasta**. Hoy el importador sólo lee "Hasta" (y "Desde" queda siempre vacío en el remito).

## Cambios

1. **Detectar la columna "Desde"** en el encabezado (alias: `desde`, `origen`), igual que se hace con "Hasta".
2. **Matchear "Desde" contra las obras del sistema**, con la misma lógica de coincidencia que "Hasta" (normalización + coincidencia por nombre). Si matchea, se guarda el nombre real de la obra; si no, se guarda el texto tal cual vino y se marca en ámbar en la previsualización.
3. **Cliente**: se sigue tomando del cliente de la obra de "Hasta"; si "Hasta" no matcheó ninguna obra, se usa el cliente de la obra de "Desde".
4. **Previsualización**: la columna "Desde" (hoy siempre vacía) muestra el valor mapeado, con el mismo resaltado ámbar cuando no matcheó con una obra del sistema.
5. **Avisos**: el detalle de "obras no vinculadas" incluye también los nombres de "Desde" que no matchearon.
6. **Plantilla de ejemplo y texto de ayuda**: se actualizan al nuevo orden de columnas: Fecha, Remito N°, Nombre Cliente, Material, Transporte, Patente, Hasta, Desde, M3, Precio, Importe (se elimina "Destino").

## Detalles técnicos

- Cambios acotados a `src/components/remitos/ImportGauchoDialog.tsx`: nuevo alias `desde` en `COLUMN_ALIASES`, segundo `matchFromMap` sobre `obrasMap`, nuevos campos `desdeInput` / `desdeOk` en `ParsedRow`, y `desde` en el `RemitoForm` resultante.
- No cambia el mapeo del resto de columnas, ni `onImport` / `createRemitosBulk`, ni la base de datos.
