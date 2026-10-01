-- 1. Agregar rol al enum rol_personal
ALTER TYPE rol_personal ADD VALUE 'repartidor_calecita';

-- 2. Crear nueva tabla cargas_combustible_repartidor
CREATE TABLE public.cargas_combustible_repartidor (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parte_diario_id uuid REFERENCES partes_diarios(id) ON DELETE CASCADE NOT NULL,
  fecha date NOT NULL,
  operador_id uuid REFERENCES personal(id) ON DELETE SET NULL,
  maquinaria_id uuid REFERENCES maquinarias(id) ON DELETE SET NULL,
  obra_id uuid REFERENCES obras(id) ON DELETE SET NULL,
  litros numeric NOT NULL DEFAULT 0,
  horas numeric DEFAULT 0,
  km numeric DEFAULT 0,
  observaciones text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3. Enable RLS
ALTER TABLE public.cargas_combustible_repartidor ENABLE ROW LEVEL SECURITY;

-- 4. Trigger for updated_at
CREATE TRIGGER update_cargas_combustible_repartidor_updated_at
  BEFORE UPDATE ON public.cargas_combustible_repartidor
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 5. RLS Policies
-- Admins y capataces pueden gestionar todas las cargas
CREATE POLICY "Admins and capataces can manage cargas_repartidor"
ON public.cargas_combustible_repartidor FOR ALL
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'capataz'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'capataz'::app_role)
);

-- Empleados pueden gestionar las cargas de sus propios partes
CREATE POLICY "Employees can manage own cargas_repartidor"
ON public.cargas_combustible_repartidor FOR ALL
USING (
  parte_diario_id IN (
    SELECT id FROM partes_diarios 
    WHERE personal_id IN (
      SELECT id FROM personal WHERE user_id = auth.uid()
    )
  )
)
WITH CHECK (
  parte_diario_id IN (
    SELECT id FROM partes_diarios 
    WHERE personal_id IN (
      SELECT id FROM personal WHERE user_id = auth.uid()
    )
  )
);

-- Maquinistas pueden ver las cargas (solo lectura)
CREATE POLICY "Maquinistas can view cargas_repartidor"
ON public.cargas_combustible_repartidor FOR SELECT
USING (has_role(auth.uid(), 'maquinista'::app_role));