-- First, clean up existing duplicates by keeping only the most recent per employee per day
-- This deletes older duplicates, preserving the newest record
DELETE FROM partes_diarios pd1
WHERE EXISTS (
  SELECT 1 FROM partes_diarios pd2
  WHERE pd1.personal_id = pd2.personal_id
    AND pd1.fecha = pd2.fecha
    AND pd1.created_at < pd2.created_at
);

-- Create unique partial index to prevent future duplicates
-- Only allows one completed parte per employee per day
-- Multiple drafts are still allowed (in case they need to be edited before completion)
CREATE UNIQUE INDEX IF NOT EXISTS unique_parte_completado_por_dia 
ON partes_diarios (personal_id, fecha)
WHERE estado = 'completado';