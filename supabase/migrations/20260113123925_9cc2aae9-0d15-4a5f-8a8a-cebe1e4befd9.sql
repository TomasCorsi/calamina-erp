-- Add new values to tipo_maquinaria enum
ALTER TYPE tipo_maquinaria ADD VALUE IF NOT EXISTS 'auto';
ALTER TYPE tipo_maquinaria ADD VALUE IF NOT EXISTS 'camioneta';