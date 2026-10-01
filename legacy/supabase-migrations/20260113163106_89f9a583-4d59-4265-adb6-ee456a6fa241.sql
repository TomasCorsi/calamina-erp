-- Update the rol_personal enum to only include the required roles
-- First, we need to check if any existing data uses roles we're removing

-- Create a new enum with the correct values
CREATE TYPE rol_personal_new AS ENUM ('capataz', 'maquinista', 'chofer', 'administrativo', 'ayudante', 'sereno');

-- Update existing data to use valid roles before changing the column type
UPDATE personal SET rol = 'administrativo' WHERE rol IN ('administrador', 'supervisor', 'auditor');

-- Alter the column to use the new enum
ALTER TABLE personal 
  ALTER COLUMN rol TYPE rol_personal_new 
  USING rol::text::rol_personal_new;

-- Drop the old enum and rename the new one
DROP TYPE rol_personal;
ALTER TYPE rol_personal_new RENAME TO rol_personal;