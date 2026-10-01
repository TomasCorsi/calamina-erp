
CREATE TABLE public.entregas_epp (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  personal_id uuid NOT NULL REFERENCES public.personal(id) ON DELETE CASCADE,
  fecha date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.entrega_epp_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entrega_id uuid NOT NULL REFERENCES public.entregas_epp(id) ON DELETE CASCADE,
  producto text NOT NULL,
  tipo_modelo text DEFAULT '',
  marca text DEFAULT '',
  posee_certificacion boolean DEFAULT true,
  cantidad integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.entregas_epp ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entrega_epp_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and capataces can manage entregas_epp"
ON public.entregas_epp FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'capataz'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'capataz'::app_role));

CREATE POLICY "Admins and capataces can manage entrega_epp_items"
ON public.entrega_epp_items FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'capataz'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'capataz'::app_role));

CREATE TRIGGER update_entregas_epp_updated_at
  BEFORE UPDATE ON public.entregas_epp
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
