-- Make maquinarias fields nullable
ALTER TABLE public.maquinarias ALTER COLUMN codigo DROP NOT NULL;
ALTER TABLE public.maquinarias ALTER COLUMN nombre DROP NOT NULL;
ALTER TABLE public.maquinarias ALTER COLUMN marca DROP NOT NULL;
ALTER TABLE public.maquinarias ALTER COLUMN anio DROP NOT NULL;

-- Add default values for required enum fields
ALTER TABLE public.maquinarias ALTER COLUMN tipo SET DEFAULT 'cargadora';
ALTER TABLE public.maquinarias ALTER COLUMN estado SET DEFAULT 'operativa';
ALTER TABLE public.maquinarias ALTER COLUMN horas_acumuladas SET DEFAULT 0;