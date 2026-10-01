-- Add obra_id column to maquinarias
ALTER TABLE public.maquinarias 
ADD COLUMN obra_id uuid REFERENCES public.obras(id);

-- Drop columns that are no longer needed
ALTER TABLE public.maquinarias DROP COLUMN IF EXISTS modelo;
ALTER TABLE public.maquinarias DROP COLUMN IF EXISTS ubicacion_actual;
ALTER TABLE public.maquinarias DROP COLUMN IF EXISTS proximo_service;