
-- Sequence for auto-numbering OC-0001
CREATE SEQUENCE IF NOT EXISTS public.ordenes_compra_numero_seq START 1;

CREATE TABLE public.ordenes_compra (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero text NOT NULL UNIQUE,
  fecha date NOT NULL DEFAULT CURRENT_DATE,
  proveedor_id uuid REFERENCES public.proveedores(id) ON DELETE RESTRICT,
  obra_id uuid REFERENCES public.obras(id) ON DELETE SET NULL,
  estado text NOT NULL DEFAULT 'borrador',
  incluir_iva boolean NOT NULL DEFAULT true,
  subtotal numeric NOT NULL DEFAULT 0,
  iva numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  condiciones_pago text,
  fecha_entrega_estimada date,
  observaciones text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.orden_compra_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  orden_id uuid NOT NULL REFERENCES public.ordenes_compra(id) ON DELETE CASCADE,
  descripcion text NOT NULL,
  unidad text NOT NULL DEFAULT 'un',
  cantidad numeric NOT NULL DEFAULT 0,
  precio_unitario numeric NOT NULL DEFAULT 0,
  subtotal numeric NOT NULL DEFAULT 0,
  orden integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_orden_compra_items_orden ON public.orden_compra_items(orden_id);
CREATE INDEX idx_ordenes_compra_proveedor ON public.ordenes_compra(proveedor_id);
CREATE INDEX idx_ordenes_compra_obra ON public.ordenes_compra(obra_id);

-- Auto-numbering trigger
CREATE OR REPLACE FUNCTION public.set_orden_compra_numero()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.numero IS NULL OR NEW.numero = '' THEN
    NEW.numero := 'OC-' || LPAD(nextval('public.ordenes_compra_numero_seq')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_set_orden_compra_numero
BEFORE INSERT ON public.ordenes_compra
FOR EACH ROW EXECUTE FUNCTION public.set_orden_compra_numero();

CREATE TRIGGER trg_ordenes_compra_updated_at
BEFORE UPDATE ON public.ordenes_compra
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.ordenes_compra ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orden_compra_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and capataces can manage ordenes_compra"
ON public.ordenes_compra FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'capataz'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'capataz'::app_role));

CREATE POLICY "Admins and capataces can manage orden_compra_items"
ON public.orden_compra_items FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'capataz'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'capataz'::app_role));
