# Arreglar filtros de Remitos

## Qué está pasando (verificado)

- Los datos en la base están limpios: no hay espacios ni variantes de mayúsculas en `desde`, `hasta`, `tipo_material` ni `proveedor` (5.367 remitos, mismos valores distintos con y sin normalizar). El problema no es de datos, es de la pantalla.
- La pantalla de Remitos **no carga todo el historial**: por defecto trae solo los últimos 90 días y el histórico completo es opcional. Las listas de opciones de los filtros nuevos (Tipo, Proveedor, Transporte, Desde, Hasta, Usuario) se arman **solo con esos remitos cargados**, así que faltan valores y, al filtrar, aparecen menos resultados de los que existen.
- Hoy la carga del histórico solo se dispara si elegís una **fecha** anterior a 90 días; no se dispara al elegir una obra, un origen/destino o un proveedor viejo.
- Los filtros se combinan todos con "Y" (deben cumplirse todos a la vez). Además el filtro de **Obra** ya compara el nombre de la obra contra Desde/Hasta, así que Obra + Desde + Hasta juntos se pisan entre sí y el resultado queda vacío sin explicación.

## Qué se va a cambiar

1. **Opciones completas de los filtros**
   - Traer los valores posibles (tipo de material, proveedor, transporte, desde, hasta) desde la base, no del subconjunto cargado en pantalla, para que aparezcan todas las opciones aunque sean de meses viejos.

2. **Carga automática del histórico**
   - Además de la fecha, disparar la carga del historial completo cuando se aplique cualquier filtro (obra, maquinaria, tipo, proveedor, transporte, desde, hasta, usuario), con un indicador "Cargando histórico…" mientras trae los datos, para que no parezca que el filtro "no trae nada".

3. **Filtros dependientes y sin combinaciones imposibles**
   - Recalcular las opciones de cada filtro según lo que ya está filtrado (excluyendo el propio filtro), y marcar en gris las opciones que darían 0 resultados.
   - Evitar que Obra y Desde/Hasta se pisen: si hay Desde u Hasta seleccionados, el filtro de Obra se aplica solo sobre el lado que no esté ya filtrado.

4. **Feedback claro cuando no hay resultados**
   - Fila de "chips" con todos los filtros activos (con X para sacar cada uno) y un botón "Limpiar todo" único.
   - Mensaje explícito cuando el resultado es 0: "Sin remitos para esta combinación de filtros" con acceso directo a quitar el último filtro aplicado.

5. **Verificación**
   - Probar con los casos de la captura (2 tipos + Desde "Campo el Tatu" + Hasta "La Alameda" + rango de fechas) y contrastar el conteo en pantalla contra la misma consulta en la base para confirmar que coinciden.

## Detalle técnico

- `src/pages/Remitos.tsx`: reemplazar `tiposUnicos/proveedoresUnicos/transportesUnicos/desdeUnicos/hastaUnicos` derivados de `remitos` por un hook nuevo `useRemitosFilterOptions` (consulta agrupada a `remitos_list_view`); extender el efecto de auto-histórico a cualquier filtro activo; ajustar `filteredRemitos` para la lógica Obra vs Desde/Hasta; agregar chips y estado vacío.
- `src/components/shared/MultiSelectFilter.tsx`: soportar `disabledValues` / conteo por opción y ordenar las seleccionadas arriba.
- `src/hooks/useRemitos.ts`: exponer un estado `cargandoHistorico` para el indicador (sin cambiar la lógica de carga existente).
