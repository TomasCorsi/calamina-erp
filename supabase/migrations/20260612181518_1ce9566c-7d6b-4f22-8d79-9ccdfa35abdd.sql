
-- Enum tipo documento
DO $$ BEGIN
  CREATE TYPE public.tipo_documento_empleado AS ENUM ('estudio_medico', 'recibo_sueldo');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Tabla
CREATE TABLE IF NOT EXISTS public.empleado_documentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  personal_id uuid NOT NULL REFERENCES public.personal(id) ON DELETE CASCADE,
  tipo public.tipo_documento_empleado NOT NULL,
  titulo text NOT NULL,
  periodo text,
  descripcion text,
  storage_path text NOT NULL,
  mime_type text,
  tamano_bytes bigint,
  nombre_original text,
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  visto_at timestamptz,
  firma_data_url text,
  firmado_at timestamptz,
  firmado_ip text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_empdoc_personal ON public.empleado_documentos(personal_id);
CREATE INDEX IF NOT EXISTS idx_empdoc_tipo ON public.empleado_documentos(tipo);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.empleado_documentos TO authenticated;
GRANT ALL ON public.empleado_documentos TO service_role;

ALTER TABLE public.empleado_documentos ENABLE ROW LEVEL SECURITY;

-- Helper: ¿el personal_id pertenece al usuario autenticado?
CREATE OR REPLACE FUNCTION public.is_owner_of_personal(_personal_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.personal WHERE id = _personal_id AND user_id = _user_id)
$$;

-- Policies
CREATE POLICY "Admin full empdoc" ON public.empleado_documentos
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Owner view own empdoc" ON public.empleado_documentos
  FOR SELECT TO authenticated
  USING (public.is_owner_of_personal(personal_id, auth.uid()));

CREATE POLICY "Owner update own empdoc visto/firma" ON public.empleado_documentos
  FOR UPDATE TO authenticated
  USING (public.is_owner_of_personal(personal_id, auth.uid()))
  WITH CHECK (public.is_owner_of_personal(personal_id, auth.uid()));

-- updated_at trigger
CREATE TRIGGER trg_empdoc_updated_at
  BEFORE UPDATE ON public.empleado_documentos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket policies (bucket se crea por separado)
CREATE POLICY "Admin manage empleado-documentos"
  ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'empleado-documentos' AND public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (bucket_id = 'empleado-documentos' AND public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Owner read own empleado-documentos"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'empleado-documentos'
    AND public.is_owner_of_personal(
      (string_to_array(name, '/'))[1]::uuid,
      auth.uid()
    )
  );

-- Signed URL RPC (autoriza admin o dueño)
CREATE OR REPLACE FUNCTION public.get_documento_signed_url(_documento_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, storage AS $$
DECLARE
  v_path text;
  v_personal uuid;
  v_url text;
BEGIN
  SELECT storage_path, personal_id INTO v_path, v_personal
  FROM public.empleado_documentos WHERE id = _documento_id;

  IF v_path IS NULL THEN RAISE EXCEPTION 'Documento no encontrado'; END IF;

  IF NOT (public.has_role(auth.uid(), 'admin'::public.app_role)
          OR public.is_owner_of_personal(v_personal, auth.uid())) THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  RETURN v_path;
END $$;

GRANT EXECUTE ON FUNCTION public.get_documento_signed_url(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_owner_of_personal(uuid, uuid) TO authenticated;
