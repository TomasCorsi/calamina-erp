
ALTER TABLE public.remitos ADD COLUMN IF NOT EXISTS created_by uuid;
CREATE INDEX IF NOT EXISTS idx_remitos_created_by ON public.remitos(created_by);

CREATE OR REPLACE FUNCTION public.set_remito_created_by()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.created_by IS NULL THEN
    NEW.created_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_remito_created_by ON public.remitos;
CREATE TRIGGER trg_set_remito_created_by
BEFORE INSERT ON public.remitos
FOR EACH ROW
EXECUTE FUNCTION public.set_remito_created_by();

DROP POLICY IF EXISTS "Sergio can manage own remitos" ON public.remitos;
CREATE POLICY "Sergio can manage own remitos"
ON public.remitos
FOR ALL
TO authenticated
USING (
  auth.uid() = 'c92028bd-dd42-416d-8892-f00b5ef90f8f'::uuid
  AND created_by = auth.uid()
)
WITH CHECK (
  auth.uid() = 'c92028bd-dd42-416d-8892-f00b5ef90f8f'::uuid
);
