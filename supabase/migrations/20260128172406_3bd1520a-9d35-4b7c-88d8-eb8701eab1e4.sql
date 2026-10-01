-- 1. Agregar columna user_id a personal para vincular con auth.users
ALTER TABLE public.personal 
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Índice único para evitar duplicados
CREATE UNIQUE INDEX IF NOT EXISTS personal_user_id_unique 
ON public.personal(user_id) WHERE user_id IS NOT NULL;

-- 2. Crear tabla partes_diarios
CREATE TABLE public.partes_diarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha date NOT NULL DEFAULT CURRENT_DATE,
  personal_id uuid NOT NULL REFERENCES public.personal(id) ON DELETE CASCADE,
  obra_id uuid REFERENCES public.obras(id) ON DELETE SET NULL,
  maquinaria_id uuid REFERENCES public.maquinarias(id) ON DELETE SET NULL,
  
  -- Horarios
  hora_entrada time,
  hora_salida time,
  
  -- Campos Maquinista
  horometro_inicio numeric DEFAULT 0,
  horometro_fin numeric DEFAULT 0,
  
  -- Campos Chofer
  cantidad_viajes integer DEFAULT 0,
  cantidad_movimiento_interno integer DEFAULT 0,
  
  -- Campos compartidos Maquinista/Chofer
  combustible numeric DEFAULT 0,
  estado_maquina text CHECK (estado_maquina IS NULL OR estado_maquina IN ('OK', 'OBSERVACION')),
  observacion_maquina text,
  
  -- Checklist Maquinista
  check_filtro_aire boolean DEFAULT false,
  check_aceite_hidraulico boolean DEFAULT false,
  
  -- Checklist Maquinista y Chofer
  check_aceite_motor boolean DEFAULT false,
  
  -- Checklist Chofer
  check_liquido_refrigerante boolean DEFAULT false,
  check_uria boolean DEFAULT false,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Trigger para updated_at
CREATE TRIGGER update_partes_diarios_updated_at
  BEFORE UPDATE ON public.partes_diarios
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Habilitar RLS
ALTER TABLE public.partes_diarios ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
-- Empleados pueden gestionar sus propios partes
CREATE POLICY "Employees can manage own partes"
  ON public.partes_diarios FOR ALL
  USING (
    personal_id IN (
      SELECT id FROM public.personal WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    personal_id IN (
      SELECT id FROM public.personal WHERE user_id = auth.uid()
    )
  );

-- Admin y Capataz pueden ver y gestionar todos
CREATE POLICY "Admins and capataces can manage all partes"
  ON public.partes_diarios FOR ALL
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'capataz'))
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'capataz'));