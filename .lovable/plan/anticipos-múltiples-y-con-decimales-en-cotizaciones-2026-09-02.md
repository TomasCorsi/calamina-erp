# Anticipos múltiples y con decimales en cotizaciones

## Qué cambia

Hoy cada cotización admite un solo anticipo (porcentaje o monto) y el campo de monto sólo acepta números enteros. Vamos a permitir:

1. **Decimales** en el monto del anticipo (paso 0,01), igual que ya pasa con el porcentaje.
2. **Varios anticipos** en la misma cotización, cada uno con su propia descripción, tipo (porcentaje o monto) y valor. Ejemplo: "Anticipo inicial 30%" + "Lote entregado en pago" + "Cuota mensual".

## Cómo se ve

En el formulario de cotización, el bloque de Anticipo pasa a ser una lista:

```text
Anticipos
 ┌──────────────────────────────────────────────────────────┐
 │ [Descripción: Anticipo inicial] [%▾] [30]      -$X   [x] │
 │ [Descripción: Lote Ezeiza]      [$▾] [12.500.000,50] [x] │
 └──────────────────────────────────────────────────────────┘
 [+ Agregar anticipo]
```

En el resumen de totales se lista cada anticipo con su descripción y su importe en negativo, y luego "Subtotal - Anticipos", IVA y Total. Igual criterio que hoy: **todos los anticipos se descuentan del subtotal antes de calcular el IVA**.

El mismo desglose aparece en la vista de detalle de la cotización y en el PDF.

## Detalles técnicos

**Base de datos**
- Nueva tabla `cotizacion_anticipos`: `id`, `cotizacion_id` (FK on delete cascade), `descripcion` (text), `tipo` (`porcentaje` | `monto`), `valor` (numeric), `monto` (numeric calculado), `orden` (int). Con GRANTs y RLS igual al resto de las tablas de cotizaciones.
- Se conservan `anticipo_tipo` / `anticipo_valor` / `anticipo_monto` en `cotizaciones`: `anticipo_monto` pasa a guardar la **suma** de todos los anticipos (lo usan el tablero y los reportes), y los otros dos quedan como compatibilidad del primer anticipo.
- Migración de datos: las cotizaciones con `anticipo_tipo <> 'ninguno'` generan una fila en la tabla nueva con descripción "Anticipo".

**Frontend**
- `useCotizaciones.ts`: traer `anticipos` en el select, y en create/update borrar+reinsertar las filas de anticipos igual que se hace hoy con items y categorías.
- `CotizacionFormContent.tsx`: reemplazar el bloque único por la lista editable; recalcular `anticipoTotal = Σ(monto)` donde porcentaje se aplica sobre el subtotal; `baseImponible = subtotal - anticipoTotal`; IVA y total se sincronizan como hoy. Input de monto con `step="0.01"`.
- `CotizacionTable.tsx` y `generateCotizacionPDF.ts`: recibir el arreglo de anticipos y renderizar una línea por cada uno (fallback al campo único si no hay filas).
- `Cotizaciones.tsx`: estado `anticipos` en el formulario, cargado al editar y pasado al guardar.
