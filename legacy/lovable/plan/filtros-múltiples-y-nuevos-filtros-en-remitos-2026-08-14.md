# Filtros múltiples y nuevos filtros en Remitos

## Qué se va a lograr

En la pantalla de Remitos, todos los filtros pasan a permitir **selección múltiple** (elegir varias obras, varias maquinarias, varios tipos, etc.) y se agregan cuatro filtros nuevos: **Proveedor**, **Transporte**, **Desde** (origen) y **Hasta** (destino).

## Comportamiento

- Cada filtro es un desplegable con buscador interno y casillas de selección múltiple.
- El botón muestra el resumen: "Todas las obras", "Obra X" o "3 obras".
- Dentro del desplegable: buscador, "Seleccionar todo" y "Limpiar".
- Debajo de la barra, chips con las selecciones activas y una X para quitarlas una por una, más un botón "Limpiar filtros".
- Varios valores en un mismo filtro se combinan con OR; filtros distintos se combinan con AND.
- Las opciones de Proveedor, Transporte, Desde y Hasta se arman con los valores realmente presentes en los remitos (ordenados alfabéticamente), por lo que no hace falta cargar catálogos.
- El rango de fechas (año, mes, desde/hasta calendario) sigue igual: selección simple.

## Filtros finales de la pantalla

| Filtro | Tipo |
|---|---|
| Año / Mes / Fecha desde / Fecha hasta | simple (sin cambios) |
| Obras | múltiple |
| Maquinarias | múltiple |
| Tipo de material | múltiple |
| Cargado por (admin/capataz) | múltiple |
| Proveedor | múltiple (nuevo) |
| Transporte | múltiple (nuevo) |
| Desde (origen) | múltiple (nuevo) |
| Hasta (destino) | múltiple (nuevo) |

## Detalles técnicos

1. **Nuevo componente** `src/components/shared/MultiSelectFilter.tsx`: Popover + Command (shadcn) con checkboxes, búsqueda, "Seleccionar todo"/"Limpiar", y resumen en el trigger. Recibe `options: {value,label}[]`, `selected: string[]`, `onChange`.
2. **`src/components/shared/FilterBar.tsx`**: se agregan props opcionales `multiple`, `obraIds`, `maquinariaIds` y se emiten en `FilterState` como `obraIds?: string[]` / `maquinariaIds?: string[]`. Los campos actuales (`obraId`, `maquinariaId`) se mantienen para no romper Viajes, Gastos y demás pantallas que usan FilterBar en modo simple.
3. **`src/pages/Remitos.tsx`**:
   - Reemplaza `tipoFilter`/`creadorFilter` (string) por arrays de strings; agrega estados `proveedorFilter`, `transporteFilter`, `desdeFilter`, `hastaFilter`.
   - `useMemo` para las listas de opciones únicas de proveedor, `tipo_transporte`, `desde` y `hasta` desde `remitos`.
   - `filteredRemitos`: reemplaza las comparaciones `=== valor` por `array.length === 0 || array.includes(valor)`; el filtro de obra pasa a comprobar si `desde` o `hasta` coincide con alguna de las obras seleccionadas.
   - Fila de chips activos + "Limpiar filtros".
   - Persistencia en URL de los multi-filtros usando el patrón existente `useUrlState` (valores separados por coma).

## Fuera de alcance

- No se cambian los filtros de otras pantallas (Viajes, Gastos, Partes Diarios) — FilterBar sigue funcionando igual en modo simple.
- No se modifican formularios, importación ni liquidaciones.
