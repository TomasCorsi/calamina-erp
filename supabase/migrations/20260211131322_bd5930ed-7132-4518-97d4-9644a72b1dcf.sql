
-- Table to track observation resolution status
CREATE TABLE public.observaciones_maquina_estado (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parte_diario_id uuid REFERENCES public.partes_diarios(id) ON DELETE CASCADE NOT NULL,
  maquinaria_id uuid REFERENCES public.maquinarias(id) ON DELETE SET NULL,
  fecha_reporte date NOT NULL,
  observacion text NOT NULL DEFAULT '',
  atendida boolean NOT NULL DEFAULT false,
  atendida_por text,
  fecha_atencion timestamptz,
  notas_resolucion text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.observaciones_maquina_estado ENABLE ROW LEVEL SECURITY;

-- Admins and capataces can manage
CREATE POLICY "Admins and capataces can manage observaciones_maquina"
ON public.observaciones_maquina_estado
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'capataz'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'capataz'::app_role));

-- Maquinistas can view
CREATE POLICY "Maquinistas can view observaciones_maquina"
ON public.observaciones_maquina_estado
FOR SELECT
USING (has_role(auth.uid(), 'maquinista'::app_role));

-- Trigger function: auto-create observation record when parte has OBSERVACION
CREATE OR REPLACE FUNCTION public.sync_observacion_maquina()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only act when estado_maquina = 'OBSERVACION' and there's a maquinaria
  IF NEW.estado_maquina = 'OBSERVACION' AND NEW.maquinaria_id IS NOT NULL THEN
    INSERT INTO public.observaciones_maquina_estado (
      parte_diario_id, maquinaria_id, fecha_reporte, observacion
    ) VALUES (
      NEW.id, NEW.maquinaria_id, NEW.fecha, COALESCE(NEW.observacion_maquina, '')
    )
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

-- Add unique constraint to prevent duplicates
ALTER TABLE public.observaciones_maquina_estado
  ADD CONSTRAINT uq_observacion_parte UNIQUE (parte_diario_id);

-- Trigger on insert and update
CREATE TRIGGER trg_sync_observacion_maquina
AFTER INSERT OR UPDATE OF estado_maquina, observacion_maquina
ON public.partes_diarios
FOR EACH ROW
EXECUTE FUNCTION public.sync_observacion_maquina();
