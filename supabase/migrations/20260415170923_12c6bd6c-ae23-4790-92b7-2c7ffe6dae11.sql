CREATE TABLE public.proveedores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  cuit text,
  direccion text,
  localidad text,
  telefono text,
  email text,
  contacto text,
  rubro text,
  observaciones text,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.proveedores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and capataces can manage proveedores"
  ON public.proveedores FOR ALL TO public
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'capataz'))
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'capataz'));

CREATE POLICY "Maquinistas can view proveedores"
  ON public.proveedores FOR SELECT TO public
  USING (has_role(auth.uid(), 'maquinista'));

CREATE TRIGGER update_proveedores_updated_at
  BEFORE UPDATE ON public.proveedores
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();