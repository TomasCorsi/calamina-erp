-- Create vacaciones table
CREATE TABLE public.vacaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  personal_id UUID NOT NULL,
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE NOT NULL,
  dias_totales INTEGER NOT NULL,
  motivo TEXT NOT NULL DEFAULT 'vacaciones',
  estado TEXT NOT NULL DEFAULT 'pendiente',
  aprobado_por UUID,
  fecha_aprobacion DATE,
  observaciones TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.vacaciones ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Admins and capataces can manage vacaciones"
ON public.vacaciones
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'capataz'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'capataz'::app_role));

CREATE POLICY "Maquinistas can view vacaciones"
ON public.vacaciones
FOR SELECT
USING (has_role(auth.uid(), 'maquinista'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_vacaciones_updated_at
BEFORE UPDATE ON public.vacaciones
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();