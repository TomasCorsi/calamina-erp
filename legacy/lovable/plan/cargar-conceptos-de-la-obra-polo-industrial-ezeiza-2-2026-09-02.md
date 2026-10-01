# Cargar conceptos de la obra POLO INDUSTRIAL EZEIZA 2

Hoy esa obra no tiene ningún concepto cargado. Voy a cargar de una sola vez los ~40 ítems del cómputo que enviaste, respetando su numeración, unidad, cantidad y precio unitario.

## Cómo se van a organizar

Cada bloque de la planilla queda como **etapa**, para que después se filtre y certifique por sector:

- MOVIMIENTO DE SUELOS (ítems 3.1 a 3.5)
- PAVIMENTOS (4.1, 4.2)
- TS1 INTERNO (movimiento de suelo, caños premoldeados, sumideros, cámaras de inspección, conductos rectangulares)
- ARROYO AGUIRRE (movimiento de suelo, caños, obras accesorias, sumideros, cámaras, conductos)

Detalles de la carga:

- El nombre de cada concepto se guarda con su número adelante (ej. "3.2 EXCAVACION 40-60 cm") para mantener el orden del cómputo.
- Se guarda la cantidad contratada y el precio unitario tal cual figuran, incluidos los ítems con cantidad 0 (quedan disponibles por si se ejecutan).
- Unidades convertidas al formato del sistema: gl → GL, m² → M2, m3 → M3, m/ml → ML, UNIDAD → UN.
- Categoría "Ejecución de obra" y tipo "obra", así el avance por trabajo se calcula sobre la cantidad contratada.
- El campo "orden" sigue la secuencia de la planilla.

## Verificación

Después de la carga se revisa que estén los ~40 conceptos en la obra y que el total contratado (cantidad × precio) coincida con la planilla, y se confirma que aparezcan tanto en Certificados como en la pestaña Avance de la obra.

## Nota técnica

Es solo una carga de datos en `certificado_conceptos` para `obra_id = d7dc659f...`; no requiere cambios de código ni de esquema.
