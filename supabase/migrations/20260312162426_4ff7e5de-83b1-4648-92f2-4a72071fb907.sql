
CREATE TABLE public.certificado_pagos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  certificado_id uuid NOT NULL REFERENCES public.certificados(id) ON DELETE CASCADE,
  fecha date NOT NULL DEFAULT CURRENT_DATE,
  monto numeric NOT NULL DEFAULT 0,
  descripcion text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.certificado_pagos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and capataces can manage certificado_pagos"
ON public.certificado_pagos
FOR ALL
TO public
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'capataz'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'capataz'::app_role));

CREATE POLICY "Maquinistas can view certificado_pagos"
ON public.certificado_pagos
FOR SELECT
TO public
USING (has_role(auth.uid(), 'maquinista'::app_role));
