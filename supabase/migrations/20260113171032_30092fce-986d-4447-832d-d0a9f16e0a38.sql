-- Add new values to rol_personal enum
ALTER TYPE public.rol_personal ADD VALUE IF NOT EXISTS 'mecanico';
ALTER TYPE public.rol_personal ADD VALUE IF NOT EXISTS 'topografo';