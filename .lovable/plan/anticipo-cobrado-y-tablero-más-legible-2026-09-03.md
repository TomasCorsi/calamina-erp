# Anticipo cobrado y tablero más legible

## 1. Anticipo cobrado en la tarjeta de Rentabilidad

Hoy la tarjeta muestra Cotizado, Gastado, Beneficio, Certificado y Cobrado, pero ignora el anticipo pactado en la cotización aprobada de la obra.

- Sumar los anticipos de las cotizaciones aprobadas de la obra (los múltiples de `cotizacion_anticipos`, con fallback al `anticipo_monto` de la cotización cuando no haya registros hijos) y exponerlos en el tablero.
- Mostrarlo como una línea propia junto a Certificado/Cobrado: **Anticipo** con importe entero y su % sobre el cotizado.
- Sumar el anticipo al total cobrado para el saldo pendiente real: `Cobrado total = anticipo + pagos de certificados`, y el saldo se recalcula sobre esa base.
- Si no hay anticipo, la línea no aparece (el tablero queda limpio).

## 2. Avance de obra más grande

- Pasar la barra de avance a un bloque destacado dentro de la tarjeta de Rentabilidad: porcentaje en número grande (tamaño similar a Cotizado/Gastado, más grande aún en modo TV) a la izquierda y barra gruesa a la derecha.
- Etiquetar claramente "Avance de obra certificado".

## 3. Más color y contraste en el tablero

- Bloques de la rentabilidad con fondo tonal en vez de gris plano: Cotizado en azul/primario suave, Gastado en ámbar, Beneficio en verde o rojo según signo, todos con borde del mismo tono.
- Certificado / Cobrado / Anticipo como chips con fondo de color e ícono, no texto suelto.
- Barras de progreso con más altura, fondo más oscuro y color de relleno vivo (verde/ámbar/rojo según consumo; primario para avance).
- KPIs y tarjetas de gráficos: encabezados con acento de color e íconos coloreados según categoría, y bordes más marcados para separar tarjetas del fondo.

Todos los colores salen de los tokens del sistema (primary, success, warning, destructive) para que respeten el tema claro y oscuro.

## Detalles técnicos

- `src/hooks/useTableroObras.ts`: agregar consulta a `cotizacion_anticipos` por las cotizaciones aprobadas de las obras y el campo `anticipoCobrado` en `ObraTableroData`.
- `src/components/dashboard/ObraDashboard.tsx`: nueva línea de anticipo, bloque de avance ampliado y nueva paleta de la tarjeta de rentabilidad y de los KPIs.
- Sin cambios de esquema ni de lógica de negocio en certificados o cotizaciones.
