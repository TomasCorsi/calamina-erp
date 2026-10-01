
-- Helper: lazy access check function for the views
CREATE OR REPLACE FUNCTION public.can_view_remitos(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.has_role(_user_id, 'admin'::public.app_role)
    OR public.has_role(_user_id, 'capataz'::public.app_role)
    OR public.has_role(_user_id, 'maquinista'::public.app_role)
    OR public.has_role(_user_id, 'remitero'::public.app_role)
$$;

CREATE OR REPLACE FUNCTION public.can_view_mantenimientos(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.has_role(_user_id, 'admin'::public.app_role)
    OR public.has_role(_user_id, 'capataz'::public.app_role)
    OR public.has_role(_user_id, 'maquinista'::public.app_role)
    OR public.has_role(_user_id, 'ayudante'::public.app_role)
    OR public.is_personal_mecanico(_user_id)
$$;

GRANT EXECUTE ON FUNCTION public.can_view_remitos(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_view_mantenimientos(uuid) TO authenticated;

-- Remitos flat view (SECURITY INVOKER but selects through the table; we want SECURITY DEFINER to skip per-row RLS overhead and apply our own simple filter)
DROP VIEW IF EXISTS public.remitos_list_view;
CREATE VIEW public.remitos_list_view
WITH (security_invoker = false) AS
SELECT
  r.id, r.numero, r.viaje_id, r.fecha, r.obra_id, r.material, r.cantidad, r.unidad,
  r.recibido_por, r.firmado, r.evidencia_url, r.observaciones, r.created_at, r.updated_at,
  r.row_color, r.proveedor, r.cliente, r.cliente_destino, r.remito_tercero, r.remito_local,
  r.desde, r.hasta, r.cantidad_viajes, r.tipo_material, r.precio_total, r.tipo_transporte,
  r.maquinaria_id, r.patente_tercero, r.cantidad_uni, r.precio_unitario, r.precio_calc_mode,
  r.forma_pago, r.created_by, r.cliente_cantera,
  o.nombre AS obra_nombre,
  m.codigo AS maquinaria_codigo,
  m.patente AS maquinaria_patente
FROM public.remitos r
LEFT JOIN public.obras o ON o.id = r.obra_id
LEFT JOIN public.maquinarias m ON m.id = r.maquinaria_id
WHERE
  public.can_view_remitos(auth.uid())
  AND (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'capataz'::public.app_role)
    OR public.has_role(auth.uid(), 'maquinista'::public.app_role)
    OR (public.has_role(auth.uid(), 'remitero'::public.app_role) AND r.created_by = auth.uid())
  );

GRANT SELECT ON public.remitos_list_view TO authenticated;

-- Mantenimientos flat view
DROP VIEW IF EXISTS public.mantenimientos_list_view;
CREATE VIEW public.mantenimientos_list_view
WITH (security_invoker = false) AS
SELECT
  mt.id, mt.fecha, mt.maquinaria_id, mt.tipo, mt.descripcion, mt.repuestos,
  mt.costo_repuestos, mt.costo_mano_obra, mt.costo_total, mt.horas_maquina, mt.kilometros,
  mt.tecnico, mt.tecnico_id, mt.estado, mt.proximo_mantenimiento, mt.proximo_service_km,
  mt.proximo_service_hr, mt.informe_tecnico, mt.alerta_campo, mt.checklist_cambio,
  mt.checklist_chequeo, mt.adjunto_url, mt.observaciones, mt.observacion_reporte_id,
  mt.created_at, mt.updated_at,
  m.nombre AS maquinaria_nombre,
  m.codigo AS maquinaria_codigo,
  m.horas_acumuladas AS maquinaria_horas_acumuladas,
  p.nombre AS tecnico_nombre,
  p.apellido AS tecnico_apellido
FROM public.mantenimientos mt
LEFT JOIN public.maquinarias m ON m.id = mt.maquinaria_id
LEFT JOIN public.personal p ON p.id = mt.tecnico_id
WHERE public.can_view_mantenimientos(auth.uid());

GRANT SELECT ON public.mantenimientos_list_view TO authenticated;
