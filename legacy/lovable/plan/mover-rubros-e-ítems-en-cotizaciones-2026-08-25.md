# Mover rubros e ítems en cotizaciones

Permitir reordenar tanto los rubros (etapas) como los ítems dentro de cada rubro, en el formulario de cotización.

## Qué se agrega

**Rubros**
- Un manijo de arrastre (icono de agarre) a la izquierda del número del rubro, para arrastrar y soltar el rubro completo (con sus ítems) a otra posición.
- Botones de subir/bajar al lado del manijo, para reordenar con un clic (más confiable en mobile).
- Al mover, se renumeran automáticamente los rubros (1., 2., 3.) y los ítems (1.1, 1.2, …).

**Ítems**
- Un manijo de arrastre en cada fila de ítem para moverlo dentro de su rubro.
- Botones de subir/bajar por ítem.
- Mover un ítem al primer/último lugar de otro rubro no se incluye en esta etapa: el arrastre queda limitado al mismo rubro (evita ambigüedad en la numeración).

**Comportamiento**
- Los totales (subtotal, IVA, total) no cambian al reordenar.
- El orden se guarda: el PDF y la vista de detalle respetan el nuevo orden.
- El colapsado/expandido de cada rubro se mantiene coherente después de mover.

## Detalles técnicos

Archivo principal: `src/components/cotizaciones/CotizacionFormContent.tsx`

- Agregar `moveCategoria(from, to)`: reordena el array `categorias`, remapea `categoria_index` de todos los ítems al nuevo índice, y recalcula `numero`/`orden` de rubros e ítems. También remapea el estado `openCategories`.
- Agregar `moveItem(catIndex, fromPosInCat, toPosInCat)`: reordena solo los ítems de ese rubro dentro del array global `items` y renumera `numero` (`{rubro}.{n}`).
- Extraer un helper `renumber(categorias, items)` reutilizado por mover/agregar/eliminar, para eliminar la numeración duplicada que hoy existe en `removeCategoria` y `removeItem`.
- Drag & drop con HTML5 nativo (`draggable`, `onDragStart`, `onDragOver`, `onDrop`), mismo patrón ya usado en `src/components/certificados/CertificadoServiceGrid.tsx`, con borde resaltado en el destino.
- La grilla de ítems pasa de `grid-cols-12` a `grid-cols-13` (o se comparte la columna de acciones) para alojar el manijo sin romper el alineado del header.
- Verificar que el guardado ya persiste `orden`/`numero`; si `orden` de ítems no se envía, incluirlo en el payload de `useCotizaciones` para que el orden sobreviva a recargas.
