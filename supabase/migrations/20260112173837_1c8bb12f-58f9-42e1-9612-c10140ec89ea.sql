-- Make columns nullable (only nombre will be required)
ALTER TABLE public.obras ALTER COLUMN codigo DROP NOT NULL;
ALTER TABLE public.obras ALTER COLUMN ubicacion DROP NOT NULL;
ALTER TABLE public.obras ALTER COLUMN descripcion DROP NOT NULL;
ALTER TABLE public.obras ALTER COLUMN fecha_inicio DROP NOT NULL;

-- Set default empty string for codigo if not provided (auto-generated in code)
ALTER TABLE public.obras ALTER COLUMN codigo SET DEFAULT '';
ALTER TABLE public.obras ALTER COLUMN ubicacion SET DEFAULT '';
ALTER TABLE public.obras ALTER COLUMN descripcion SET DEFAULT '';