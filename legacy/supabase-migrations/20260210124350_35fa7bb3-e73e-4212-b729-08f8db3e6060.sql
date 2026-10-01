
-- Allow cargas without a linked parte_diario
ALTER TABLE cargas_combustible_repartidor 
ALTER COLUMN parte_diario_id DROP NOT NULL;

-- Add product type column
ALTER TABLE cargas_combustible_repartidor 
ADD COLUMN tipo_producto text DEFAULT 'combustible';

-- Update RLS policy to allow repartidor to insert without parte_diario_id
-- We need a new policy that allows employees to insert their own cargas directly
-- First, we need to add a repartidor_id column so we know who created the carga
ALTER TABLE cargas_combustible_repartidor
ADD COLUMN repartidor_id uuid REFERENCES personal(id);

-- Backfill repartidor_id from parte_diario where possible
UPDATE cargas_combustible_repartidor c
SET repartidor_id = p.personal_id
FROM partes_diarios p
WHERE c.parte_diario_id = p.id AND c.repartidor_id IS NULL;

-- Drop old employee policy
DROP POLICY IF EXISTS "Employees can manage own cargas_repartidor" ON cargas_combustible_repartidor;

-- New policy: employees can manage cargas linked to their partes OR where they are the repartidor
CREATE POLICY "Employees can manage own cargas_repartidor" ON cargas_combustible_repartidor
FOR ALL
USING (
  repartidor_id IN (SELECT id FROM personal WHERE user_id = auth.uid())
  OR parte_diario_id IN (
    SELECT id FROM partes_diarios 
    WHERE personal_id IN (SELECT id FROM personal WHERE user_id = auth.uid())
  )
)
WITH CHECK (
  repartidor_id IN (SELECT id FROM personal WHERE user_id = auth.uid())
  OR parte_diario_id IN (
    SELECT id FROM partes_diarios 
    WHERE personal_id IN (SELECT id FROM personal WHERE user_id = auth.uid())
  )
);
