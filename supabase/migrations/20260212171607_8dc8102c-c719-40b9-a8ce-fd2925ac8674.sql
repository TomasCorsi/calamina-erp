
-- Crear tabla clientes
CREATE TABLE public.clientes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  cuit text,
  direccion text,
  localidad text,
  telefono text,
  email text,
  contacto text,
  observaciones text,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Trigger para updated_at
CREATE TRIGGER update_clientes_updated_at
  BEFORE UPDATE ON public.clientes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and capataces can manage clientes"
  ON public.clientes FOR ALL
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'capataz'));

CREATE POLICY "Maquinistas can view clientes"
  ON public.clientes FOR SELECT
  USING (has_role(auth.uid(), 'maquinista'));

-- Agregar cliente_id a obras
ALTER TABLE public.obras
  ADD COLUMN cliente_id uuid REFERENCES public.clientes(id) ON DELETE SET NULL;
