-- Eliminar la columna estado de la tabla vacaciones
ALTER TABLE public.vacaciones DROP COLUMN IF EXISTS estado;