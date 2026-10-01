# Tablero en tiempo real y sin mouse

Objetivo: que el tablero se actualice solo apenas se carga un dato en el sistema, y que se pueda dejar en una TV rotando la información sin tocar el mouse ni el teclado.

## 1. Tiempo real (sin esperar al refresco de 60s)

Suscripción en vivo a los cambios de las tablas que alimentan el tablero:

- `partes_diarios`
- `remitos`
- `cargas_combustible_repartidor`
- `otros_gastos`
- `mantenimientos`
- `maquinarias`

Cuando llega un INSERT/UPDATE/DELETE en cualquiera de ellas, el tablero vuelve a pedir los datos (con un pequeño retardo agrupado de ~2 segundos para no recargar 20 veces si entran muchos remitos juntos). El indicador "Actualizado hh:mm" queda con un punto verde "En vivo" cuando la conexión está activa, y vuelve al refresco periódico si se corta.

Se mantiene además el auto-refresco cada 60s como red de seguridad.

## 2. Modo sin mouse (kiosco)

En pantalla completa, el tablero se maneja solo:

- **Rotación automática de métrica**: cada 20 segundos cambia entre m³ → Movimientos → Horas → Litros, resaltando la opción activa.
- **Rotación de foco por obra** (opcional, activada por defecto): cada 20 segundos una de las 3 obras se destaca (borde y leve escala), útil para leer de lejos.
- **Barra de progreso** fina arriba que muestra cuánto falta para el próximo cambio.
- **Sin cursor**: el puntero se oculta tras 3 segundos de inactividad en modo TV.
- **Reanudación automática**: si alguien mueve el mouse o toca la pantalla, la rotación se pausa 30s y luego sigue sola.

## 3. Control por teclado (sin mouse, fuera de TV también)

- `F` entra/sale de pantalla completa
- `→` / `←` cambia de métrica
- `Espacio` pausa/reanuda la rotación
- `R` refresca ahora
- `1`–`4` selecciona métrica directa

Se muestra una ayuda discreta con estos atajos al entrar a pantalla completa (se desvanece a los 5s).

## Detalles técnicos

- Migración: `ALTER PUBLICATION supabase_realtime ADD TABLE ...` para las 6 tablas, y `REPLICA IDENTITY FULL` donde falte.
- Nuevo hook `src/hooks/useTableroRealtime.ts`: un canal único con varios listeners `postgres_changes`, debounce de 2s, invalida las queries `tablero-obras` y `tablero-series`; cleanup con `removeChannel` en el unmount (un solo `useEffect`, sin recrear el canal en cada render).
- Nuevo hook `src/hooks/useAutoRotacion.ts`: temporizador con pausa por actividad (`mousemove`, `keydown`, `touchstart`) y progreso 0–1 para la barra.
- `src/pages/Dashboard.tsx`: integra ambos hooks, atajos de teclado, indicador "En vivo", barra de progreso y clase `cursor-none` en modo TV.
- `src/components/dashboard/ObraPanel.tsx`: prop `destacada` para el resaltado rotativo (solo estilos).
