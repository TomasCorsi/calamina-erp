
-- Add observacion_reporte_id to mantenimientos
ALTER TABLE public.mantenimientos 
ADD COLUMN observacion_reporte_id UUID REFERENCES public.observaciones_maquina_estado(id);

-- Create trigger function to sync completion
CREATE OR REPLACE FUNCTION public.sync_mantenimiento_completado()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.estado = 'completado' AND NEW.observacion_reporte_id IS NOT NULL 
     AND (OLD.estado IS DISTINCT FROM 'completado') THEN
    UPDATE public.observaciones_maquina_estado
    SET atendida = true,
        atendida_por = NEW.tecnico,
        fecha_atencion = now(),
        notas_resolucion = 'Resuelto via mantenimiento: ' || NEW.descripcion
    WHERE id = NEW.observacion_reporte_id;
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger
CREATE TRIGGER trg_sync_mantenimiento_completado
BEFORE UPDATE ON public.mantenimientos
FOR EACH ROW
EXECUTE FUNCTION public.sync_mantenimiento_completado();
