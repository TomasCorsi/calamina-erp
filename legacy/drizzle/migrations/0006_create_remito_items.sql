CREATE TABLE public.remito_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  remito_id UUID NOT NULL REFERENCES public.remitos(id) ON DELETE CASCADE,
  orden INTEGER NOT NULL DEFAULT 0,
  concepto TEXT NOT NULL DEFAULT '',
  cantidad NUMERIC NOT NULL DEFAULT 0,
  unidad TEXT NOT NULL DEFAULT 'DIA',
  precio_unitario NUMERIC NOT NULL DEFAULT 0,
  precio_total NUMERIC NOT NULL DEFAULT 0,
  observaciones TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_remito_items_remito_id ON public.remito_items(remito_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.remito_items TO authenticated;
GRANT ALL ON public.remito_items TO service_role;

ALTER TABLE public.remito_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios con acceso a remitos pueden ver items"
ON public.remito_items FOR SELECT TO authenticated
USING (public.can_view_remitos(auth.uid()));

CREATE POLICY "Usuarios con acceso a remitos pueden insertar items"
ON public.remito_items FOR INSERT TO authenticated
WITH CHECK (public.can_view_remitos(auth.uid()));

CREATE POLICY "Usuarios con acceso a remitos pueden actualizar items"
ON public.remito_items FOR UPDATE TO authenticated
USING (public.can_view_remitos(auth.uid()));

CREATE POLICY "Usuarios con acceso a remitos pueden borrar items"
ON public.remito_items FOR DELETE TO authenticated
USING (public.can_view_remitos(auth.uid()));

CREATE TRIGGER update_remito_items_updated_at
BEFORE UPDATE ON public.remito_items
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();