# Carga de los 3 certificados de POLO INDUSTRIAL EZEIZA 2

Se cargan los certificados N° 1, 2 y 3 (jun-26, jul-26, ago-26) sobre la obra POLO INDUSTRIAL EZEIZA 2, usando los 45 conceptos ya cargados. Quedan **emitidos**, con IVA 21% sobre el importe de la planilla, listos para que cargues los pagos.

## Certificados a crear

| N° | Período | Ítems | Subtotal (neto) | IVA 21% | Total |
|----|---------|-------|-----------------|---------|-------|
| 1 | jun-26 | 2 | $201.294.350,40 | $42.271.813,58 | $243.566.163,98 |
| 2 | jul-26 | 8 | $386.049.007,50 | $81.070.291,58 | $467.119.299,08 |
| 3 | ago-26 | 5 | $336.727.572,50 | $70.712.790,23 | $407.440.362,73 |

Acumulado certificado: $924.070.930,40 netos (8,17% + 4,74% de avance según planilla, 12,91% acumulado).

### Detalle por certificado (cantidad presente)

**Certificado 1 — jun-26**
- 3.1 Limpieza del terreno: 0,80 gl → $37.867.750,40
- 3.2 Excavación 40-60 cm: 43.007 m² → $163.426.600,00

**Certificado 2 — jul-26**
- 3.1 Limpieza del terreno: 0,20 gl → $47.334.048,00
- 3.2 Excavación 40-60 cm: 20.760 m² → $78.888.000,00
- 3.3 Suelo cal 10 cm al 3%: 28.533 m² → $57.066.000,00
- 3.4 Aporte de suelo A4 compactado: 28.533 m² → $114.132.000,00
- TS1 1.3 Excavación para conductos: 727 m³ → $2.908.000,00
- TS1 4.3 Caño circular F=1000 mm: 379,75 ml → $57.437.187,50
- TS1 4.4 Caño circular F=1200 mm: 18 ml → $3.720.420,00
- TS1 4.5 Caño circular F=1500 mm: 70,80 ml → $24.563.352,00

**Certificado 3 — ago-26**
- 3.3 Suelo cal 10 cm al 3%: 37.217 m² → $74.434.000,00 (obs.: demasía acceso)
- 3.4 Aporte de suelo A4 compactado: 39.166 m² → $156.664.000,00
- TS1 1.3 Excavación para conductos: 4.216 m³ → $16.864.000,00
- TS1 4.3 Caño circular F=1000 mm: 4,25 ml → $642.812,50
- TS1 4.5 Caño circular F=1500 mm: 254 ml → $88.122.760,00

## Ajuste previo

El concepto **3.1 Limpieza del terreno** quedó con precio unitario $800 (así figura la columna de la planilla), pero su precio total de contrato es $47.334.688 por 1 gl. Se corrige el precio unitario a $47.334.688 para que el avance y los importes cierren.

## Detalles técnicos

- Inserts en `certificados` (obra_id de POLO INDUSTRIAL EZEIZA 2, tipo `obra`, estado `emitido`, `incluir_iva` = true, período `2026-06`/`2026-07`/`2026-08`, fecha de certificado y emisión al último día de cada mes) y en `certificado_items`, vinculando cada ítem a su `concepto_id`.
- El `precio_unitario` de cada ítem se guarda como importe / cantidad, para respetar exactamente los importes de las planillas (incluido el ítem 3.1 del certificado 2, que la planilla balancea contra el acumulado).
- `subtotal`, `iva` y `total` del certificado se calculan a partir de la suma de los ítems.
- Sin cambios de código: los certificados ya se ven en la sección Certificados y alimentan la pestaña "Avance y certificados" de la obra.
