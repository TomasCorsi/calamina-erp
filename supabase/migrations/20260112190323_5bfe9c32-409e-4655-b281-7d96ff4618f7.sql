-- First drop the partially created new enum if it exists
DROP TYPE IF EXISTS tipo_maquinaria_new;

-- Create new enum with updated values
CREATE TYPE tipo_maquinaria_new AS ENUM (
  'cargadora',
  'compactador',
  'retroexcavadora',
  'minicargadora',
  'motoniveladora',
  'topador',
  'pala_retro',
  'batea',
  'acoplado',
  'camion',
  'carreton',
  'cisterna',
  'tanque_cisterna',
  'tanque_regador_tractor',
  'soplador',
  'zanjeadora',
  'rastra',
  'tractor',
  'rastra_grosspal'
);

-- Alter the column with proper mapping using CASE
ALTER TABLE public.maquinarias 
  ALTER COLUMN tipo TYPE tipo_maquinaria_new 
  USING (
    CASE tipo::text
      WHEN 'cargadora' THEN 'cargadora'
      WHEN 'retroexcavadora' THEN 'retroexcavadora'
      WHEN 'motoniveladora' THEN 'motoniveladora'
      WHEN 'topadora' THEN 'topador'
      WHEN 'rodillo' THEN 'compactador'
      WHEN 'camion_articulado' THEN 'camion'
      WHEN 'excavadora' THEN 'cargadora'
      ELSE 'cargadora'
    END
  )::tipo_maquinaria_new;

-- Drop old enum and rename new one
DROP TYPE tipo_maquinaria;
ALTER TYPE tipo_maquinaria_new RENAME TO tipo_maquinaria;