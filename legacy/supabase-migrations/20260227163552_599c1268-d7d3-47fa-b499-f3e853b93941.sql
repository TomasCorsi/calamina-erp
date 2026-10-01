
-- Add new columns to mantenimientos table
ALTER TABLE public.mantenimientos 
  ADD COLUMN IF NOT EXISTS kilometros NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS proximo_service_km NUMERIC(10,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS proximo_service_hr NUMERIC(10,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS informe_tecnico TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS alerta_campo TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS checklist_cambio JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS checklist_chequeo JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS tecnico_id UUID DEFAULT NULL REFERENCES public.personal(id),
  ADD COLUMN IF NOT EXISTS adjunto_url TEXT DEFAULT NULL;

-- Add 'pendiente' to estado_mantenimiento enum
ALTER TYPE public.estado_mantenimiento ADD VALUE IF NOT EXISTS 'pendiente';

-- Create storage bucket for attachments
INSERT INTO storage.buckets (id, name, public) 
VALUES ('mantenimiento-adjuntos', 'mantenimiento-adjuntos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies
CREATE POLICY "Authenticated users can view mantenimiento adjuntos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'mantenimiento-adjuntos');

CREATE POLICY "Admins capataces can upload mantenimiento adjuntos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'mantenimiento-adjuntos' 
  AND (
    public.has_role(auth.uid(), 'admin') 
    OR public.has_role(auth.uid(), 'capataz')
    OR public.has_role(auth.uid(), 'ayudante')
    OR public.is_personal_mecanico(auth.uid())
  )
);

CREATE POLICY "Admins capataces can update mantenimiento adjuntos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'mantenimiento-adjuntos' 
  AND (
    public.has_role(auth.uid(), 'admin') 
    OR public.has_role(auth.uid(), 'capataz')
  )
);

CREATE POLICY "Admins capataces can delete mantenimiento adjuntos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'mantenimiento-adjuntos' 
  AND (
    public.has_role(auth.uid(), 'admin') 
    OR public.has_role(auth.uid(), 'capataz')
  )
);
