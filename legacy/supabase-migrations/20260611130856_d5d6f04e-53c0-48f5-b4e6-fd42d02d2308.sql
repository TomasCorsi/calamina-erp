CREATE INDEX IF NOT EXISTS idx_obras_estado_created ON public.obras(estado, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_maquinarias_estado ON public.maquinarias(estado) WHERE estado IN ('operativa','en_uso');
CREATE INDEX IF NOT EXISTS idx_remitos_fecha_created ON public.remitos(fecha DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_obsmaq_atendida_fecha ON public.observaciones_maquina_estado(atendida, fecha_reporte DESC);
ANALYZE public.obras;
ANALYZE public.maquinarias;
ANALYZE public.remitos;
ANALYZE public.observaciones_maquina_estado;