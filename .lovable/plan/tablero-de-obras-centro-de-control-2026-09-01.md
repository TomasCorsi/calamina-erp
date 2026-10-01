# Tablero de Obras (Centro de Control)

Convertir el Dashboard en un tablero configurable por obra, apto para dejar en una TV de oficina.

## 1. Selector de obras

- Botón "Seleccionar obras" en la parte superior del Dashboard.
- Abre un modal con:
  - Buscador por nombre.
  - Filtro de estado: solo activas (por defecto) o incluir pausadas/finalizadas.
  - Lista con checkboxes, máximo 3 obras seleccionadas (al llegar a 3 se deshabilitan las demás, con aviso).
  - Botones Aplicar / Limpiar.
- La selección se guarda en el navegador (localStorage) y se restaura al volver a entrar.
- Si no hay selección previa: se eligen automáticamente las 3 obras activas con mayor actividad reciente (más partes diarios y remitos en los últimos 7 días).
- Chips en el encabezado mostrando las obras elegidas, con opción de quitarlas.

## 2. Tablero dividido en 3 sectores

Una tarjeta grande por obra (grilla de 3 columnas en pantallas anchas, apiladas en móvil), cada una con:

- Nombre de la obra + estado.
- Movimientos hoy (partes diarios + viajes/remitos del día).
- m³ del día y acumulado del mes.
- Maquinaria asignada / en uso.
- Horas máquina del día y del mes.
- Personal que reportó hoy.
- Gastos del mes (combustible + mantenimiento + otros gastos).
- Alertas de la obra (máquinas con observación, servicios vencidos).

Los indicadores generales de la parte superior (KPIs) pasan a calcularse solo sobre las obras seleccionadas.

## 3. Modo pantalla completa (TV)

- Botón "Pantalla completa" que usa la API de fullscreen del navegador y activa un modo TV:
  - Oculta navegación, launcher, filtros y botones administrativos.
  - Tipografía y números ampliados, alto contraste.
  - Muestra: nombres de obras, indicadores principales, actividad reciente, gastos, movimientos, maquinaria, horas, personal, alertas.
  - Reloj y "Última actualización: hh:mm" en el pie.
  - Auto-refresco cada 60 segundos.
  - Salida con Esc o botón discreto en la esquina.
- La selección de obras se hace antes de entrar y se mantiene guardada.

## Detalles técnicos

- Nuevo hook `useObrasSeleccionadas` (localStorage + fallback a top 3 por actividad reciente).
- Nuevo hook `useTableroObras(obraIds)`: consultas agregadas por obra en paralelo sobre `partes_diarios`, `viajes`/`remitos`, `maquinarias`, `cargas_combustible_repartidor`/gastos, `mantenimientos`; `refetchInterval` configurable (60s en modo TV).
- Nuevos componentes: `ObraSelectorDialog.tsx`, `ObraPanel.tsx`, `TableroHeader.tsx` bajo `src/components/dashboard/`.
- `src/pages/Dashboard.tsx` orquesta selector, grilla de 3 paneles, KPIs filtrados y modo TV (render sin `MainLayout` cuando está en fullscreen).
- Se usan tokens de color existentes (rojo/negro/grises), sin colores hardcodeados.
