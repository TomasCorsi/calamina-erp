-- Drop the old unique index that only allows one completed parte per employee per day
DROP INDEX IF EXISTS unique_parte_completado_por_dia;

-- Create new unique index that allows multiple completed partes per day
-- as long as each is for a different machine
CREATE UNIQUE INDEX unique_parte_completado_por_dia_maquina 
ON public.partes_diarios (personal_id, fecha, maquinaria_id) 
WHERE (estado = 'completado');