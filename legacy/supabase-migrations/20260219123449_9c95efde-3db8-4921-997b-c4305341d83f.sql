
-- Función para verificar si un usuario tiene rol mecanico en la tabla personal
CREATE OR REPLACE FUNCTION public.is_personal_mecanico(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.personal
    WHERE user_id = _user_id
      AND rol = 'mecanico'
  )
$$;

-- Mecánicos pueden ver mantenimientos
CREATE POLICY "Mecanicos personal can view mantenimientos"
  ON mantenimientos FOR SELECT
  USING (is_personal_mecanico(auth.uid()));

-- Mecánicos pueden crear mantenimientos
CREATE POLICY "Mecanicos personal can insert mantenimientos"
  ON mantenimientos FOR INSERT
  WITH CHECK (is_personal_mecanico(auth.uid()));

-- Mecánicos pueden actualizar mantenimientos
CREATE POLICY "Mecanicos personal can update mantenimientos"
  ON mantenimientos FOR UPDATE
  USING (is_personal_mecanico(auth.uid()));

-- Mecánicos pueden ver maquinarias (para el selector del formulario)
CREATE POLICY "Mecanicos personal can view maquinarias"
  ON maquinarias FOR SELECT
  USING (is_personal_mecanico(auth.uid()));

-- Mecánicos pueden ver observaciones de campo
CREATE POLICY "Mecanicos personal can view observaciones_maquina"
  ON observaciones_maquina_estado FOR SELECT
  USING (is_personal_mecanico(auth.uid()));

-- Mecánicos pueden actualizar observaciones de campo (para marcar como atendida)
CREATE POLICY "Mecanicos personal can update observaciones_maquina"
  ON observaciones_maquina_estado FOR UPDATE
  USING (is_personal_mecanico(auth.uid()));

-- Ayudantes también: ver/insertar/actualizar mantenimientos
CREATE POLICY "Ayudantes personal can view mantenimientos"
  ON mantenimientos FOR SELECT
  USING (has_role(auth.uid(), 'ayudante'::app_role));

CREATE POLICY "Ayudantes personal can insert mantenimientos"
  ON mantenimientos FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'ayudante'::app_role));

CREATE POLICY "Ayudantes personal can update mantenimientos"
  ON mantenimientos FOR UPDATE
  USING (has_role(auth.uid(), 'ayudante'::app_role));

-- Ayudantes: ver observaciones (para el módulo de mecánico compartido con ayudante)
CREATE POLICY "Ayudantes personal can view observaciones_maquina"
  ON observaciones_maquina_estado FOR SELECT
  USING (has_role(auth.uid(), 'ayudante'::app_role));

CREATE POLICY "Ayudantes personal can update observaciones_maquina"
  ON observaciones_maquina_estado FOR UPDATE
  USING (has_role(auth.uid(), 'ayudante'::app_role));
