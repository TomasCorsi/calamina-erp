-- Ensure vacaciones has a proper relationship to personal for embedded selects
ALTER TABLE public.vacaciones
  ADD CONSTRAINT vacaciones_personal_id_fkey
  FOREIGN KEY (personal_id)
  REFERENCES public.personal(id)
  ON UPDATE CASCADE
  ON DELETE RESTRICT;

-- Helpful index for lookups / joins
CREATE INDEX IF NOT EXISTS idx_vacaciones_personal_id
  ON public.vacaciones (personal_id);