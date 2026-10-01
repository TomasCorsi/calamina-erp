CREATE INDEX IF NOT EXISTS idx_cert_items_certificado ON public.certificado_items (certificado_id);
CREATE INDEX IF NOT EXISTS idx_cert_items_concepto ON public.certificado_items (concepto_id);
CREATE INDEX IF NOT EXISTS idx_cert_pagos_certificado_fecha ON public.certificado_pagos (certificado_id, fecha DESC);
CREATE INDEX IF NOT EXISTS idx_cert_conceptos_obra_orden ON public.certificado_conceptos (obra_id, orden);
CREATE INDEX IF NOT EXISTS idx_certificados_obra_periodo ON public.certificados (obra_id, periodo DESC);
CREATE INDEX IF NOT EXISTS idx_certificados_obra_tipo_periodo ON public.certificados (obra_id, tipo, periodo);