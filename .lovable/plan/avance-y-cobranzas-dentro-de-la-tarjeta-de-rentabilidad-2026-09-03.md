# Avance y cobranzas dentro de la tarjeta de Rentabilidad

Hoy el avance de obra, los certificados y los pagos sólo se ven en Obras > "Avance y certificados" (diálogo). El tablero muestra únicamente Cotizado / Gastado / Beneficio, por eso no aparece nada de avance ni pagos ahí. La rentabilidad es lo que más miran los dueños, así que se suma ahí mismo, sin recargar el tablero.

## Qué se agrega (sólo en la tarjeta de Rentabilidad, sin tarjetas nuevas)

1. **Dos líneas compactas debajo de la barra de consumo de gastos:**
   - `Certificado: $X · Y% del cotizado`
   - `Cobrado: $X · Y% · Saldo $X`

2. **Una segunda barra fina de avance** (más chica que la de consumo) con el **% de avance general** de la obra y su leyenda `Z% de avance`.

3. Si la obra no tiene certificados, las líneas y la barra se ocultan (no muestra ceros).

No se agregan gráficos nuevos ni tarjetas extra: el tablero se mantiene simple y la rentabilidad concentra cotizado, gastado, beneficio, certificado, cobrado y avance en un solo bloque claro.

## Detalles técnicos

- Reutilizar `useAvanceObra` (ya existe) desde `TableroVista` pasando el resultado a `ObraDashboard` como prop `avance`.
- `ObraDashboard.tsx`: sólo presentación — dos líneas + una barra extra dentro de la franja de rentabilidad actual. Sin cambios de layout general.
- Sin cambios de base de datos.
