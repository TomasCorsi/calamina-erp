
-- Enum for certificado status
CREATE TYPE public.estado_certificado AS ENUM ('borrador', 'emitido', 'cobrado');

-- 1. Conceptos catalog per obra
CREATE TABLE public.certificado_conceptos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  obra_id UUID NOT NULL REFERENCES public.obras(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  unidad TEXT NOT NULL,
  precio_unitario NUMERIC NOT NULL DEFAULT 0,
  activo BOOLEAN NOT NULL DEFAULT true,
  orden INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Certificado header
CREATE TABLE public.certificados (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  obra_id UUID NOT NULL REFERENCES public.obras(id) ON DELETE CASCADE,
  numero TEXT NOT NULL,
  periodo TEXT NOT NULL,
  estado public.estado_certificado NOT NULL DEFAULT 'borrador',
  fecha_emision DATE,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  iva NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  observaciones TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(obra_id, periodo)
);

-- 3. Certificado line items
CREATE TABLE public.certificado_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  certificado_id UUID NOT NULL REFERENCES public.certificados(id) ON DELETE CASCADE,
  concepto_id UUID REFERENCES public.certificado_conceptos(id) ON DELETE SET NULL,
  descripcion TEXT NOT NULL,
  unidad TEXT NOT NULL,
  cantidad NUMERIC NOT NULL DEFAULT 0,
  precio_unitario NUMERIC NOT NULL DEFAULT 0,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.certificado_conceptos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificado_items ENABLE ROW LEVEL SECURITY;

-- certificado_conceptos policies
CREATE POLICY "Admins and capataces can manage certificado_conceptos"
  ON public.certificado_conceptos FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'capataz'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'capataz'::app_role));

CREATE POLICY "Maquinistas can view certificado_conceptos"
  ON public.certificado_conceptos FOR SELECT
  USING (has_role(auth.uid(), 'maquinista'::app_role));

-- certificados policies
CREATE POLICY "Admins and capataces can manage certificados"
  ON public.certificados FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'capataz'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'capataz'::app_role));

CREATE POLICY "Maquinistas can view certificados"
  ON public.certificados FOR SELECT
  USING (has_role(auth.uid(), 'maquinista'::app_role));

-- certificado_items policies
CREATE POLICY "Admins and capataces can manage certificado_items"
  ON public.certificado_items FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'capataz'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'capataz'::app_role));

CREATE POLICY "Maquinistas can view certificado_items"
  ON public.certificado_items FOR SELECT
  USING (has_role(auth.uid(), 'maquinista'::app_role));

-- Updated_at triggers
CREATE TRIGGER update_certificado_conceptos_updated_at
  BEFORE UPDATE ON public.certificado_conceptos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_certificados_updated_at
  BEFORE UPDATE ON public.certificados
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
