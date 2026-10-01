# Módulo RRHH: novedades, sueldos y pagos

Nuevo módulo **RRHH** en el App Launcher (solo admin), que reutiliza lo que ya existe: personal, adelantos, préstamos, vacaciones y la liquidación de sueldos actual. Se avanza por etapas; esta primera entrega cubre lo que hoy más cuesta: períodos, novedades y la planilla para el estudio contable.

## Etapa 1 (esta entrega)

### Períodos
- Crear períodos: 1ª Quincena, 2ª Quincena o Mensual, con fechas desde/hasta calculadas automáticamente.
- Estados: Abierto, En revisión, Cerrado.
- Configuración de jornada habitual (horas por día de la semana) y feriados, para calcular las horas normales del período.

### Novedades
- Pantalla de carga rápida con tipos: inasistencia, enfermedad, ART, vacaciones, licencia, horas extras, feriado trabajado, premio, adelanto, alta, baja, cambio de sueldo y otro.
- El formulario muestra solo los campos que corresponden al tipo elegido (por ejemplo vacaciones pide Desde/Hasta; horas extras pide fecha y horas).
- Una novedad puede haber ocurrido en otra fecha y liquidarse en el período elegido (novedades atrasadas).
- Las vacaciones y adelantos ya cargados en el sistema aparecen automáticamente como novedades del período, sin volver a cargarlos.

### Planilla para el estudio contable
- Vista tipo planilla por período con: legajo, empleado, ingreso, baja, horas normales, feriado trabajado, inasistencias, enfermedad, ART, licencia, vacaciones, total horas, premio, anticipo y observaciones.
- Legajo, nombre e ingreso salen de la ficha del empleado; las horas se calculan desde la jornada configurada y se descuentan según las novedades.
- Botón **Exportar para estudio contable** a Excel con el formato de la planilla.

### Ficha del empleado ampliada
- Se agregan fecha de alta, fecha de baja, puesto, sector/obra, estado (activo, vacaciones, licencia, ART, baja) y observaciones.
- Pestaña **Historial** por empleado: novedades, adelantos, cambios de sueldo y liquidaciones en orden cronológico.

### Sueldos con historial
- Sueldo acordado y sueldo registrado, con la diferencia calculada sola, y vigencia desde una fecha: cada cambio queda guardado sin pisar el anterior.
- Se cargan de cero (no se migran los importes actuales).
- Modalidad mensual o quincenal por empleado.

### Dashboard RRHH
- Empleados activos, de vacaciones, con ART, altas y bajas recientes, y novedades del período en curso.

## Etapas siguientes (no en esta entrega)

2. **Liquidación interna por período**: detalle por empleado (base, premios, extras, adelantos, cuotas, descuentos, total) y vista general tipo Excel con filtros y edición, tomando el sueldo vigente y las novedades ya cargadas.
3. **Preparación de efectivo y sobres**: total a preparar, cantidad de sobres, estado pendiente/preparado/entregado, filtros por empleado, obra, sector y estado.
4. **Conceptos y movimientos extra + ampliación de préstamos y cuotas**, integrados con las novedades.

## Permisos

Todo el módulo (incluida la planilla y el historial) queda restringido a administradores, igual que el resto de la información salarial.

## Detalles técnicos

- Nuevas tablas: `rrhh_periodos`, `rrhh_novedades`, `rrhh_jornada_config`, `rrhh_feriados`, `rrhh_sueldos_historial`; columnas nuevas en `personal` (fecha_alta, fecha_baja, puesto, sector, estado_laboral, observaciones) añadidas como nullable.
- RLS admin-only con `has_role(auth.uid(),'admin')` + GRANT a `authenticated` y `service_role` en cada tabla nueva.
- Nueva ruta `/rrhh` con `ProtectedRoute requiredRoles={['admin']}`, entrada en `AppLauncher`, y pestañas: Panel, Novedades, Planilla, Empleados, Configuración.
- Hooks nuevos `useRrhhPeriodos`, `useRrhhNovedades`, `useSueldosHistorial`; se reutilizan `usePersonal`, `useVacaciones`, `useAdelantos`/`usePrestamos` de `useLiquidaciones`.
- Export Excel con ExcelJS siguiendo el estilo corporativo ya usado en liquidaciones/remitos. Fechas dd/mm/yyyy vía `formatDate()`; strings vacíos saneados a `null`.
