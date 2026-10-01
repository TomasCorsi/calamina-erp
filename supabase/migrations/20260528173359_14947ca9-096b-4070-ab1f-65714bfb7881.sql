ALTER TABLE public.otros_gastos
  ADD CONSTRAINT otros_gastos_maquinaria_id_fkey
  FOREIGN KEY (maquinaria_id) REFERENCES public.maquinarias(id) ON DELETE SET NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.otros_gastos TO authenticated;
GRANT ALL ON public.otros_gastos TO service_role;