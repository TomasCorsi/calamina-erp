-- Permitir que usuarios vinculen su propio registro durante el registro
CREATE POLICY "Users can link their own personal record"
  ON public.personal FOR UPDATE
  TO authenticated
  USING (user_id IS NULL)
  WITH CHECK (user_id = auth.uid());