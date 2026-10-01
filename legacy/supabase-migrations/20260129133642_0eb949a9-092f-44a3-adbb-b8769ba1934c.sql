-- Agregar columna para estado de pago de vacaciones
ALTER TABLE public.vacaciones 
ADD COLUMN pagada boolean NOT NULL DEFAULT false;

-- Comentario descriptivo
COMMENT ON COLUMN public.vacaciones.pagada IS 'Indica si las vacaciones fueron pagadas al empleado';