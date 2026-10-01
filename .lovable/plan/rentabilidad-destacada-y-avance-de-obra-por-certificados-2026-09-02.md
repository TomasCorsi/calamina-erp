# Rentabilidad destacada y Avance de obra por certificados

## 1. Tarjeta de Rentabilidad más grande y con números completos

- La tarjeta de Rentabilidad pasa a ocupar el ancho completo de la fila de gráficos (arriba de los demás), con más alto y tipografía mayor.
- Los importes dejan de abreviarse: se muestran completos con separador de miles, por ejemplo `$7.077.345.120` en lugar de `$7077.3M`, con la versión en millones como texto de apoyo abajo.
- Bloques Cotizado / Gastado / Beneficio en tamaño grande (aún más en modo TV), margen en porcentaje bien visible y barra de consumo más gruesa con su leyenda.

## 2. Avance de obra por trabajos (desde Certificados)

Nueva pestaña **Avance** dentro de la obra (y tarjeta resumen en el tablero), calculada con los datos que ya se cargan en Certificados:

- Por cada trabajo/concepto de la obra: cantidad total contratada, cantidad ya certificada (suma de todos los certificados emitidos) y **% de avance** con barra de progreso.
- Agrupado por categoría/etapa, con subtotales y un **% de avance general de la obra** ponderado por monto.
- Los conceptos que hoy no tienen cargada la cantidad total se pueden completar desde esa misma pantalla (campo editable), para que el porcentaje sea real. Hoy 22 de 79 conceptos tienen cantidad total cargada.

## 3. Pagos por certificado y por mes

- Tabla de certificados de la obra: número, período, fecha, total, pagado, saldo y estado.
- Gráfico mensual de **certificado vs cobrado** (barras por mes) y acumulado, tomando los pagos ya existentes en el sistema de certificados. Hoy hay 19 certificados y 1 solo pago cargado, así que la curva de cobros se va a llenar a medida que se carguen los pagos.
- Indicadores: total certificado, total cobrado, saldo pendiente y % cobrado.

## Detalles técnicos

- `ObraDashboard.tsx`: mover la tarjeta de Rentabilidad a una fila propia a ancho completo, formato de moneda sin abreviar (`Intl.NumberFormat es-AR`), tamaños diferenciados para TV.
- Nuevo hook `useAvanceObra.ts`: lee `certificado_conceptos` (cantidad_total, precio_unitario, categoría/etapa) y `certificado_items` unidos a `certificados` de la obra; devuelve avance por concepto, por categoría, avance general ponderado y series mensuales de certificado vs pago (`certificado_pagos`).
- Nuevo componente `AvanceObraTab.tsx` (barras de progreso + tabla + gráfico mensual), integrado en la vista de Obras y con una tarjeta compacta de "% de avance" en el tablero.
- Edición de `cantidad_total` en `certificado_conceptos` desde la pantalla de avance (campo inline).
- Sin cambios de esquema de base de datos: se usan las tablas de certificados existentes.
