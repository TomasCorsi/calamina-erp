
ALTER TABLE public.certificado_pagos
  ADD COLUMN IF NOT EXISTS metodo text,
  ADD COLUMN IF NOT EXISTS referencia text,
  ADD COLUMN IF NOT EXISTS banco text,
  ADD COLUMN IF NOT EXISTS comprobante_url text;

INSERT INTO storage.buckets (id, name, public)
VALUES ('certificado-comprobantes', 'certificado-comprobantes', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Admins/capataces can view certificado comprobantes"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'certificado-comprobantes'
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'capataz'::app_role))
);

CREATE POLICY "Admins/capataces can upload certificado comprobantes"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'certificado-comprobantes'
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'capataz'::app_role))
);

CREATE POLICY "Admins/capataces can update certificado comprobantes"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'certificado-comprobantes'
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'capataz'::app_role))
);

CREATE POLICY "Admins/capataces can delete certificado comprobantes"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'certificado-comprobantes'
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'capataz'::app_role))
);
