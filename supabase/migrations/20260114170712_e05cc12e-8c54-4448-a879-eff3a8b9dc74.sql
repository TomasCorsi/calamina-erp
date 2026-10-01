-- Agregar campos para horas, tipo de maquinaria y cantidad
ALTER TABLE asignaciones_maquinaria_obra 
ADD COLUMN horas NUMERIC DEFAULT 0,
ADD COLUMN cantidad INTEGER DEFAULT 1,
ADD COLUMN tipo_maquinaria tipo_maquinaria;

-- Hacer maquinaria_id opcional (ya no es obligatorio)
ALTER TABLE asignaciones_maquinaria_obra 
ALTER COLUMN maquinaria_id DROP NOT NULL;

-- Eliminar constraint UNIQUE anterior
ALTER TABLE asignaciones_maquinaria_obra 
DROP CONSTRAINT IF EXISTS asignaciones_maquinaria_obra_obra_id_maquinaria_id_key;

-- Agregar nuevo constraint por obra + tipo
ALTER TABLE asignaciones_maquinaria_obra 
ADD CONSTRAINT asignaciones_maquinaria_obra_obra_tipo_unique 
UNIQUE(obra_id, tipo_maquinaria);