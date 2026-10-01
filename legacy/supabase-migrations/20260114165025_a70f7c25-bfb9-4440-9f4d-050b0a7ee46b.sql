-- Create table for machinery assignments to obras
CREATE TABLE public.asignaciones_maquinaria_obra (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id UUID NOT NULL REFERENCES public.obras(id) ON DELETE CASCADE,
  maquinaria_id UUID NOT NULL REFERENCES public.maquinarias(id) ON DELETE CASCADE,
  costo_hora NUMERIC NOT NULL DEFAULT 0,
  fecha_inicio DATE,
  fecha_fin DATE,
  activa BOOLEAN DEFAULT true,
  observaciones TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(obra_id, maquinaria_id)
);

-- Enable RLS
ALTER TABLE public.asignaciones_maquinaria_obra ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Admins and capataces can manage asignaciones_maquinaria_obra"
ON public.asignaciones_maquinaria_obra
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'capataz'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'capataz'::app_role));

CREATE POLICY "Maquinistas can view asignaciones_maquinaria_obra"
ON public.asignaciones_maquinaria_obra
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'maquinista'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_asignaciones_maquinaria_obra_updated_at
BEFORE UPDATE ON public.asignaciones_maquinaria_obra
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();