-- Create table for personnel assignments to obras by role category
CREATE TABLE public.asignaciones_personal_obra (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  obra_id UUID NOT NULL REFERENCES public.obras(id) ON DELETE CASCADE,
  rol rol_personal NOT NULL,
  cantidad INTEGER NOT NULL DEFAULT 1,
  sueldo_mensual NUMERIC NOT NULL DEFAULT 0,
  costo_total NUMERIC GENERATED ALWAYS AS (cantidad * sueldo_mensual) STORED,
  observaciones TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(obra_id, rol)
);

-- Enable RLS
ALTER TABLE public.asignaciones_personal_obra ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins and capataces can manage asignaciones_personal_obra"
ON public.asignaciones_personal_obra
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'capataz'::app_role));

CREATE POLICY "Maquinistas can view asignaciones_personal_obra"
ON public.asignaciones_personal_obra
FOR SELECT
USING (has_role(auth.uid(), 'maquinista'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_asignaciones_personal_obra_updated_at
BEFORE UPDATE ON public.asignaciones_personal_obra
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();