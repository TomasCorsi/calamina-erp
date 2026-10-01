# Remitos: "Suelo seleccionado" + Importación Canteras del Gaucho

## 1. Nuevo tipo de material

Agregar "Suelo seleccionado" a:
- El selector de tipo de material del formulario de remitos.
- La grilla de remitos (edición inline).
- El normalizador del importador (acepta "suelo seleccionado", "suelo select.", "suelo").

## 2. Botón "Importar remitos Canteras del Gaucho"

Nuevo botón en la barra de acciones de Remitos, al lado de "Importar", que abre un diálogo dedicado a este formato fijo.

### Archivo aceptado
Excel (.xlsx / .xls) y también CSV/TSV, con estas columnas (el orden puede variar, se detectan por nombre):

`fecha | remito N° | nombre cliente | material | transporte | patente | Hasta | Destino | m3 | precio | importe`

### Reglas de mapeo
| Columna del archivo | Destino en el sistema |
|---|---|
| fecha | Fecha del remito |
| remito N° | Remito tercero |
| nombre cliente | Se ignora |
| material | Tipo de material (normalizado contra la lista del sistema) |
| transporte | Se ignora — siempre se guarda "Calamina Sur" |
| patente | Se busca el vehículo del sistema por patente |
| Hasta | Se busca la obra del sistema por nombre |
| Destino | Se ignora |
| m3 | Cantidad total (y cantidad por viaje, ya que es 1 viaje) |
| precio | Precio unitario |
| importe | Precio total |

Valores fijos para todas las filas:
- Unidad: **M3**
- Cantidad de viajes: **1**
- Proveedor: **Canteras del Gaucho**
- Cliente: se completa automáticamente con el cliente de la obra encontrada en "Hasta" (si esa obra tiene cliente asignado); si no, queda vacío.

### Previsualización antes de importar
Igual al importador actual: tabla con las filas leídas, cantidad de válidas, avisos por patente no encontrada, obra no encontrada o material desconocido (la fila igual se puede importar, sólo queda sin vincular), y errores por fecha inválida. Botón "Importar N remitos" y descarga de plantilla de ejemplo.

## Detalles técnicos
- Nuevo componente `src/components/remitos/ImportGauchoDialog.tsx` (carga lazy, mismo patrón que `CSVImportDialog`), reutilizando `findMaquinariaId`, `parseDate`, `parseNumber` y los normalizadores exportados desde `CSVImportDialog.tsx`.
- Lectura de Excel con la librería `xlsx` ya presente en el proyecto; conversión de la hoja a matriz y luego mismo pipeline que CSV.
- Resolución de cliente: `obrasMap` (nombre → obra) ampliado en `src/pages/Remitos.tsx` para exponer también `cliente?.nombre` de cada obra.
- La importación reutiliza el `onImport` existente (`createRemitosBulk`), sin cambios de base de datos.
- `TIPO_MATERIAL_OPTIONS` en `RemitoQuickFormDialog.tsx`, la lista de la grilla en `RemitosDataGrid.tsx` y `tipoMaterialNormalize` en `CSVImportDialog.tsx` suman "Suelo seleccionado".
