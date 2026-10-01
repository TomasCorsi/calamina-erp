
-- Performance indexes for hot queries identified via pg_stat_statements

-- observaciones_maquina_estado: list ordered by atendida ASC, fecha_reporte ASC
-- Existing idx_obsmaq_atendida_fecha may use DESC. Add ASC composite + partial for pending.
CREATE INDEX IF NOT EXISTS idx_obsmaq_pendientes
  ON public.observaciones_maquina_estado (fecha_reporte ASC)
  WHERE atendida = false;

-- remitos: filter by created_by + order by fecha desc, created_at desc
CREATE INDEX IF NOT EXISTS idx_remitos_created_by_fecha
  ON public.remitos (created_by, fecha DESC, created_at DESC);

-- partes_diarios: per-user feed ordered by fecha, created_at
CREATE INDEX IF NOT EXISTS idx_partes_personal_fecha_created
  ON public.partes_diarios (personal_id, fecha DESC, created_at DESC);

-- cargas_combustible_repartidor: per repartidor ordered by created_at
CREATE INDEX IF NOT EXISTS idx_ccr_repartidor_created
  ON public.cargas_combustible_repartidor (repartidor_id, created_at DESC);

-- mantenimientos: ordered by fecha desc
CREATE INDEX IF NOT EXISTS idx_mant_fecha_desc
  ON public.mantenimientos (fecha DESC);

-- mantenimientos: per tecnico + fecha (mechanic mobile view)
CREATE INDEX IF NOT EXISTS idx_mant_tecnico_fecha
  ON public.mantenimientos (tecnico_id, fecha DESC);

ANALYZE public.observaciones_maquina_estado;
ANALYZE public.remitos;
ANALYZE public.partes_diarios;
ANALYZE public.cargas_combustible_repartidor;
ANALYZE public.mantenimientos;
