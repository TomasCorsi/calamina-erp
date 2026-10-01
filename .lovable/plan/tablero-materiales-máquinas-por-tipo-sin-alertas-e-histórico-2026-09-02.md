# Tablero: materiales, máquinas por tipo, sin alertas e histórico destacado

## 1. Movimiento de materiales de la obra

Nueva tarjeta en el tablero: **Materiales movidos** (Tosca, Tierra, Desmonte, Suelo seleccionado, Piedra, Cascote, etc.), tomados del tipo de material de cada remito de la obra.

- Gráfico de barras horizontales con los materiales principales del período, ordenados de mayor a menor, con la cantidad escrita al lado (visible en TV, sin necesidad de mouse).
- Nombres unificados: "Suelo seleccionado" y "SUELO SELECCIONADO" cuentan como el mismo material.
- Los materiales chicos se agrupan en "Otros" para que el gráfico siga siendo legible.
- Debajo de cada material también se muestra el acumulado histórico de la obra.

## 2. Gráfico de máquinas agrupado por tipo

El gráfico "Horas por maquinaria" pasa a ser **Horas por tipo de máquina**: se suman las horas de todas las máquinas del mismo tipo (camión, retroexcavadora, motoniveladora, tractor, etc.) y se muestra una barra por tipo, con la cantidad de máquinas de ese tipo indicada junto al nombre.

## 3. Alertas de máquinas fuera del tablero

Se quitan del tablero el cartel rojo de alertas del pie y el indicador "N alertas" del encabezado. Las observaciones de máquina siguen viéndose en el módulo de Mantenimiento, sin ocupar espacio en la pantalla de TV.

## 4. Histórico más remarcado

En cada indicador, el acumulado histórico deja de ser un texto gris chico: pasa a mostrarse en una franja propia dentro de la tarjeta, con etiqueta "HISTÓRICO", número en negrita y tamaño mayor (y más grande aún en modo TV), para que se distinga a simple vista del valor del período.

## Detalles técnicos

- `useTableroObras.ts`: sumar `tipo_material` de los remitos de la obra (agrupado y normalizado) y devolver `materiales: { nombre, cantidad, viajes }[]`; incluir `tipo` al traer los nombres de maquinaria y devolver `horasPorTipoMaquina: { tipo, horas, maquinas }[]` junto a lo actual.
- `useTableroHistorico.ts`: agregar `materiales` acumulados (mismo criterio, sin filtro de mes) al `HistoricoObra`.
- `ObraDashboard.tsx`: nueva `ChartCard` de materiales; reemplazar el dataset del gráfico de máquinas por el agrupado por tipo; eliminar el bloque de alertas del pie y el badge del encabezado; rediseñar el sub-valor de `KPI` como franja "HISTÓRICO" destacada.
- Sin cambios de base de datos.
