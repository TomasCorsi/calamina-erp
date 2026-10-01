-- Agregar columna estado con valor por defecto 'completado'
-- para no afectar registros existentes
ALTER TABLE public.partes_diarios 
ADD COLUMN estado text NOT NULL DEFAULT 'completado';

-- Agregar constraint para valores válidos
ALTER TABLE public.partes_diarios
ADD CONSTRAINT partes_diarios_estado_check 
CHECK (estado IN ('borrador', 'completado'));