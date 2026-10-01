# Remitos con varios ítems (viajes + jornadas de máquina)

Hoy un remito guarda un solo concepto. El papel real puede tener varias líneas: "9 viajes de tierra x 24 m3", "1 día de retro", "½ día de motoniveladora". La idea es cargar esas líneas extra dentro del mismo remito, sin que ensucien los internos de las máquinas.

## Cómo va a funcionar

El remito sigue teniendo su cabecera igual que hoy (fecha, desde/hasta, transporte, patente, cliente, material, viajes, cantidad, precio). Eso es **el viaje del camión** y sigue imputándose al interno del camión como siempre.

Debajo se agrega una sección nueva: **Ítems adicionales del remito**.

Cada ítem tiene:
- Cantidad (acepta decimales: 1 = un día, 0,5 = medio día, 1,5 = un día y medio)
- Unidad (DÍA por defecto; también HS, U, M3)
- Concepto (texto libre con sugerencias: Día de retro, Día de motoniveladora, Día de topador, Día de pala, Hora de retro, etc.)
- Precio unitario y total (se calcula solo)

Estos ítems **no se vinculan a ninguna máquina** y **no suman viajes**, así que no aparecen en los internos ni en los conteos de viajes/m3. Solo suman plata al total del remito.

El total del remito pasa a ser: total del viaje + total de los ítems adicionales.

## Dónde se ve

- **Formulario de remito**: sección "Ítems adicionales" con botón "Agregar ítem", filas que se pueden borrar y un subtotal. Si el remito no tiene ítems extra, se ve igual que hoy.
- **Grilla de remitos**: una marca discreta en la fila (por ejemplo "+2 ítems") y, al abrir el remito, se ven en detalle. La grilla sigue mostrando el viaje como hoy.
- **Exportar a Excel**: la hoja "Remitos" suma dos columnas nuevas — "Ítems adicionales" (resumen en texto, ej. "1 Día de retro; 0,5 Día de motoniveladora") e "Importe ítems" — y el total del remito ya los incluye. Se agrega además una segunda hoja "Ítems" con una fila por ítem (fecha, N° remito, obra, cantidad, unidad, concepto, precio unitario, importe) para poder filtrar y sumar por concepto.
- **Liquidaciones de cliente y de obra**: los importes de ítems se incluyen en los totales facturables, detallados como línea propia para que se entienda de dónde sale la diferencia.

## Detalles técnicos

- Nueva tabla `public.remito_items`: `id`, `remito_id` (FK a `remitos`, `ON DELETE CASCADE`), `orden` int, `concepto` text, `cantidad` numeric, `unidad` text default `'DIA'`, `precio_unitario` numeric, `precio_total` numeric, `observaciones` text, timestamps. RLS igual a `remitos` (reutilizando `can_view_remitos`) + GRANT a `authenticated` y `service_role`. Índice por `remito_id`.
- Se deja claro por diseño que estos ítems **no** llevan `maquinaria_id` ni `cantidad_viajes`, de modo que ningún cálculo existente de internos, viajes o m3 (`useTableroObras`, `useTableroSeries`, `useTableroHistorico`, `useReporteObra`, `GastosMaquinaria`, `VehiculosActivosMesPanel`) los tome. No se tocan esos hooks salvo para sumar el importe donde hoy se suma `precio_total` como ingreso.
- `useRemitos.ts`: alta/edición/borrado de ítems junto con el remito (reemplazo completo del set de ítems al guardar) y el listado trae el resumen de ítems por remito para la grilla y el export.
- `RemitoQuickFormDialog.tsx`: editor de ítems con parseo decimal reutilizando el helper de coma/punto ya existente.
- `Remitos.tsx` (`exportarExcel`): columnas nuevas + hoja "Ítems".
- No se cambia nada del importador de Canteras del Gaucho ni de la carga masiva: esos remitos siguen sin ítems adicionales.
