-- Add new columns for restructured remitos module
ALTER TABLE remitos
  ADD COLUMN IF NOT EXISTS remito_tercero text,
  ADD COLUMN IF NOT EXISTS remito_local text,
  ADD COLUMN IF NOT EXISTS desde text,
  ADD COLUMN IF NOT EXISTS hasta text,
  ADD COLUMN IF NOT EXISTS cantidad_viajes integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS tipo_material text,
  ADD COLUMN IF NOT EXISTS precio_total numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tipo_transporte text,
  ADD COLUMN IF NOT EXISTS maquinaria_id uuid REFERENCES maquinarias(id);

-- Migrate existing data: copy 'numero' to 'remito_local' and 'material' to 'tipo_material'
UPDATE remitos 
SET 
  remito_local = numero,
  tipo_material = material
WHERE remito_local IS NULL;