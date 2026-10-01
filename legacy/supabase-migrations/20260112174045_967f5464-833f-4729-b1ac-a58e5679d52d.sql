-- Remove columns that are no longer needed
ALTER TABLE public.obras DROP COLUMN IF EXISTS codigo;
ALTER TABLE public.obras DROP COLUMN IF EXISTS progreso;
ALTER TABLE public.obras DROP COLUMN IF EXISTS fecha_fin_real;
ALTER TABLE public.obras DROP COLUMN IF EXISTS presupuesto;