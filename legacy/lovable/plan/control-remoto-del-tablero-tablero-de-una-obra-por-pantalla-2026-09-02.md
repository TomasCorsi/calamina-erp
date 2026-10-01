# Control remoto del tablero + tablero de una obra por pantalla

## Objetivo

1. Poder manejar desde el celular (o cualquier PC) qué se ve en la TV, sin tocar la máquina conectada al televisor.
2. Rediseñar el tablero para mostrar **una obra por vez**, con tarjetas más legibles y más gráficos útiles.

## 1. Control remoto en tiempo real

Se crea una "sesión de tablero" guardada en la base de datos que la TV escucha en vivo. Lo que se toca en el control aparece en la TV en menos de un segundo.

**Pantalla de control** (nueva pestaña "Control TV" dentro del Tablero, con diseño responsive: se usa igual desde la PC de escritorio, una notebook o el celular):
- Elegir obras del tablero (mismo selector actual, pero sin límite de 3: se pueden cargar todas las que quiera y la TV las va pasando).
- Botón grande por obra: al tocarla, la TV salta a esa obra.
- Elegir la métrica del gráfico principal (m³ / Movimientos / Horas / Litros).
- Elegir el mes del período.
- Rotación automática: encender/apagar y elegir cada cuántos segundos cambia de obra (10s / 20s / 30s / 60s).
- Anterior / Siguiente obra y Pausa.
- Botón "Refrescar TV" y estado de conexión de la pantalla ("TV conectada hace X").

**Pantalla de TV** (`/tablero/tv`):
- Se abre una sola vez en la PC del televisor, en pantalla completa. No requiere volver a tocarla.
- Lee la sesión en vivo y obedece: obra visible, métrica, mes, rotación.
- Reintenta la conexión sola si se cae internet y sigue mostrando el último dato con aviso de "Reconectando".

## 2. Tablero rediseñado: una obra por pantalla

Con una sola obra en pantalla entra mucha más información y se lee de lejos:

- **Encabezado grande**: nombre de la obra, estado, alertas activas, y a un costado "Obra 2 de 5" con puntos indicadores de la rotación.
- **Fila de KPIs grandes** (números enormes, etiqueta clara arriba, comparación histórica chica abajo): Movimientos, m³, Horas, Litros, Maquinaria en uso, Personal, Gastos.
  - Se reemplaza el bloque actual de 8 mini-tarjetas apretadas por 4 tarjetas principales destacadas + una fila secundaria más chica.
- **Gráficos** (todos con datos ya existentes del sistema):
  1. Barras por día de la métrica elegida (el actual, más grande).
  2. Acumulado del mes vs. mes anterior (línea o barras comparativas).
  3. Composición de gastos de la obra (combustible / mantenimiento / otros gastos).
  4. Top maquinarias por horas del período (barras horizontales).
- **Panel de alertas** de la obra a la derecha, con las observaciones de máquina del período.
- Todo entra sin scroll, tanto en escritorio como en TV.

## Detalles técnicos

- Nueva tabla `tablero_sesiones` (id, nombre, obra_ids uuid[], obra_activa, metrica, mes, rotacion_activa, rotacion_segundos, updated_at, created_by) con GRANTs y RLS para usuarios autenticados. Realtime habilitado vía `ALTER PUBLICATION supabase_realtime ADD TABLE`.
- Hook `useTableroSesion(sesionId)`: lectura + suscripción `postgres_changes` + mutaciones (`setObraActiva`, `setMetrica`, etc.) con actualización optimista.
- Ruta nueva `/tablero/tv` que renderiza el tablero sin `MainLayout`, en modo TV, tomando el estado de la sesión. Se mantienen los atajos de teclado actuales como respaldo.
- `Dashboard.tsx` se divide: `TableroObraView.tsx` (vista de una obra), `TableroControl.tsx` (control remoto) y la página contenedora.
- `ObraPanel.tsx` se reemplaza por componentes más chicos: `ObraHeader`, `ObraKPIs`, y los 4 gráficos en `src/components/dashboard/charts/`.
- Se reutilizan `useTableroObras`, `useTableroSeries`, `useTableroHistorico` y `useTableroRealtime` sin cambiar su lógica de cálculo; se agrega el desglose de gastos y horas por maquinaria a `useTableroObras`.
- `useObrasSeleccionadas` deja de limitar a 3 obras (la selección pasa a la sesión; localStorage queda como respaldo offline).
