
CREATE INDEX IF NOT EXISTS idx_obsmaq_maquinaria ON public.observaciones_maquina_estado (maquinaria_id);
CREATE INDEX IF NOT EXISTS idx_obsmaq_parte ON public.observaciones_maquina_estado (parte_diario_id);
CREATE INDEX IF NOT EXISTS idx_obsmaq_atendida_fecha ON public.observaciones_maquina_estado (atendida, fecha_reporte);

CREATE INDEX IF NOT EXISTS idx_remitos_obra ON public.remitos (obra_id);
CREATE INDEX IF NOT EXISTS idx_remitos_viaje ON public.remitos (viaje_id);
CREATE INDEX IF NOT EXISTS idx_remitos_maquinaria ON public.remitos (maquinaria_id);
CREATE INDEX IF NOT EXISTS idx_remitos_created_by ON public.remitos (created_by);
CREATE INDEX IF NOT EXISTS idx_remitos_fecha_created ON public.remitos (fecha DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_remitos_orden_fecha ON public.remitos (orden DESC NULLS LAST, fecha DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_mant_maquinaria ON public.mantenimientos (maquinaria_id);
CREATE INDEX IF NOT EXISTS idx_mant_tecnico ON public.mantenimientos (tecnico_id);
CREATE INDEX IF NOT EXISTS idx_mant_fecha ON public.mantenimientos (fecha DESC);
CREATE INDEX IF NOT EXISTS idx_mant_obs_reporte ON public.mantenimientos (observacion_reporte_id);

CREATE INDEX IF NOT EXISTS idx_partes_personal ON public.partes_diarios (personal_id);
CREATE INDEX IF NOT EXISTS idx_partes_obra ON public.partes_diarios (obra_id);
CREATE INDEX IF NOT EXISTS idx_partes_maquinaria ON public.partes_diarios (maquinaria_id);
CREATE INDEX IF NOT EXISTS idx_partes_personal_fecha ON public.partes_diarios (personal_id, fecha DESC);
CREATE INDEX IF NOT EXISTS idx_partes_fecha_created ON public.partes_diarios (fecha DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ccr_operador ON public.cargas_combustible_repartidor (operador_id);
CREATE INDEX IF NOT EXISTS idx_ccr_maquinaria ON public.cargas_combustible_repartidor (maquinaria_id);
CREATE INDEX IF NOT EXISTS idx_ccr_obra ON public.cargas_combustible_repartidor (obra_id);
CREATE INDEX IF NOT EXISTS idx_ccr_repartidor ON public.cargas_combustible_repartidor (repartidor_id);
CREATE INDEX IF NOT EXISTS idx_ccr_created ON public.cargas_combustible_repartidor (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_cc_maquinaria ON public.cargas_combustible (maquinaria_id);
CREATE INDEX IF NOT EXISTS idx_cc_obra ON public.cargas_combustible (obra_id);
CREATE INDEX IF NOT EXISTS idx_cc_fecha ON public.cargas_combustible (fecha DESC);

CREATE INDEX IF NOT EXISTS idx_maq_operador ON public.maquinarias (operador_asignado_id);
CREATE INDEX IF NOT EXISTS idx_maq_obra ON public.maquinarias (obra_id);

CREATE INDEX IF NOT EXISTS idx_obras_responsable ON public.obras (responsable_id);
CREATE INDEX IF NOT EXISTS idx_obras_cliente ON public.obras (cliente_id);
CREATE INDEX IF NOT EXISTS idx_obras_created ON public.obras (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_viajes_fecha ON public.viajes (fecha DESC);
CREATE INDEX IF NOT EXISTS idx_viajes_obra ON public.viajes (obra_id);
CREATE INDEX IF NOT EXISTS idx_viajes_camion ON public.viajes (camion_id);
CREATE INDEX IF NOT EXISTS idx_viajes_chofer ON public.viajes (chofer_id);

CREATE INDEX IF NOT EXISTS idx_hm_maquinaria ON public.horas_maquina (maquinaria_id);
CREATE INDEX IF NOT EXISTS idx_hm_operador ON public.horas_maquina (operador_id);
CREATE INDEX IF NOT EXISTS idx_hm_obra ON public.horas_maquina (obra_id);
CREATE INDEX IF NOT EXISTS idx_hm_fecha ON public.horas_maquina (fecha DESC);

CREATE INDEX IF NOT EXISTS idx_personal_user ON public.personal (user_id);
CREATE INDEX IF NOT EXISTS idx_personal_legajo ON public.personal (legajo);

CREATE INDEX IF NOT EXISTS idx_asig_pers_obra ON public.asignaciones_personal_obra (obra_id);
CREATE INDEX IF NOT EXISTS idx_asig_maq_obra ON public.asignaciones_maquinaria_obra (obra_id);
CREATE INDEX IF NOT EXISTS idx_asig_maq_maquinaria ON public.asignaciones_maquinaria_obra (maquinaria_id);

ANALYZE public.observaciones_maquina_estado;
ANALYZE public.remitos;
ANALYZE public.mantenimientos;
ANALYZE public.partes_diarios;
ANALYZE public.cargas_combustible_repartidor;
ANALYZE public.cargas_combustible;
ANALYZE public.maquinarias;
ANALYZE public.obras;
ANALYZE public.viajes;
ANALYZE public.horas_maquina;
ANALYZE public.personal;
