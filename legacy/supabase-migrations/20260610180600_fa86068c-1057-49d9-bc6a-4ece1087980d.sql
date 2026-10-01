
CREATE INDEX IF NOT EXISTS idx_remitos_fecha_created
  ON public.remitos (fecha DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_remitos_obra_fecha
  ON public.remitos (obra_id, fecha DESC) WHERE obra_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_remitos_desde_lower
  ON public.remitos (lower(desde));

CREATE INDEX IF NOT EXISTS idx_partes_personal_fecha
  ON public.partes_diarios (personal_id, fecha DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_partes_fecha
  ON public.partes_diarios (fecha DESC);

CREATE INDEX IF NOT EXISTS idx_mantenimientos_fecha
  ON public.mantenimientos (fecha DESC);
CREATE INDEX IF NOT EXISTS idx_mantenimientos_maquinaria_fecha
  ON public.mantenimientos (maquinaria_id, fecha DESC);

CREATE INDEX IF NOT EXISTS idx_cargas_rep_repartidor_created
  ON public.cargas_combustible_repartidor (repartidor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cargas_rep_fecha
  ON public.cargas_combustible_repartidor (fecha DESC);

CREATE INDEX IF NOT EXISTS idx_obs_maq_atendida_fecha
  ON public.observaciones_maquina_estado (atendida, fecha_reporte DESC);

CREATE INDEX IF NOT EXISTS idx_horas_maquina_obra_fecha
  ON public.horas_maquina (obra_id, fecha DESC);
CREATE INDEX IF NOT EXISTS idx_cargas_combustible_obra_fecha
  ON public.cargas_combustible (obra_id, fecha DESC);
