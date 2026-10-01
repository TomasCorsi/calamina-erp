-- Add new columns for role-specific daily report forms
ALTER TABLE public.partes_diarios
ADD COLUMN novedades TEXT,
ADD COLUMN ausencias UUID[] DEFAULT '{}',
ADD COLUMN tareas TEXT,
ADD COLUMN observaciones_inconvenientes TEXT;

-- Add comments for documentation
COMMENT ON COLUMN public.partes_diarios.novedades IS 'Texto libre para que el Capataz describa el trabajo realizado en la obra';
COMMENT ON COLUMN public.partes_diarios.ausencias IS 'Array de UUIDs que referencia IDs de empleados que faltaron (solo Capataz)';
COMMENT ON COLUMN public.partes_diarios.tareas IS 'Texto libre para Mecánico/Ayudante describir sus tareas del día';
COMMENT ON COLUMN public.partes_diarios.observaciones_inconvenientes IS 'Texto libre para todos los roles justificar baja producción o reportar problemas';