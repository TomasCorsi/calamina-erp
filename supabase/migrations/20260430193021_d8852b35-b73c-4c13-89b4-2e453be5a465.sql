
CREATE TABLE public.sueldos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  personal_id UUID,
  legajo TEXT NOT NULL,
  nombre TEXT,
  sueldo_blanco NUMERIC NOT NULL DEFAULT 0,
  sueldo_negro NUMERIC NOT NULL DEFAULT 0,
  modalidad_pago TEXT NOT NULL DEFAULT 'quincenal',
  periodo TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.sueldos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and capataces can manage sueldos"
  ON public.sueldos
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'capataz'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'capataz'::app_role));

CREATE INDEX idx_sueldos_periodo ON public.sueldos (periodo);
CREATE INDEX idx_sueldos_legajo ON public.sueldos (legajo);

CREATE TRIGGER update_sueldos_updated_at
  BEFORE UPDATE ON public.sueldos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
