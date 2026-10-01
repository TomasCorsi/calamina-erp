-- Add column for third-party license plates
ALTER TABLE remitos 
ADD COLUMN patente_tercero TEXT DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN remitos.patente_tercero IS 'License plate for third-party transport vehicles (not in maquinarias table)';