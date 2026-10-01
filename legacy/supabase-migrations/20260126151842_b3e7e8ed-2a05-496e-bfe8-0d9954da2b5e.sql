-- Add grupo_electrogeno to the tipo_maquinaria enum
ALTER TYPE public.tipo_maquinaria ADD VALUE IF NOT EXISTS 'grupo_electrogeno';