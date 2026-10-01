-- Create otros_gastos table for miscellaneous expenses
CREATE TABLE public.otros_gastos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha DATE NOT NULL,
  obra_id UUID REFERENCES public.obras(id) ON DELETE SET NULL,
  categoria TEXT NOT NULL,
  descripcion TEXT NOT NULL,
  monto NUMERIC NOT NULL DEFAULT 0,
  comprobante TEXT,
  proveedor TEXT,
  observaciones TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.otros_gastos ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins and capataces can manage otros_gastos"
ON public.otros_gastos
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'capataz'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'capataz'::app_role));

CREATE POLICY "Maquinistas can view otros_gastos"
ON public.otros_gastos
FOR SELECT
USING (has_role(auth.uid(), 'maquinista'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_otros_gastos_updated_at
BEFORE UPDATE ON public.otros_gastos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();