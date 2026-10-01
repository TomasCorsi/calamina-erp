
-- Columna para acumular km en maquinarias
ALTER TABLE public.maquinarias ADD COLUMN km_acumulados numeric DEFAULT 0;

-- Trigger function
CREATE OR REPLACE FUNCTION public.sync_horas_km_from_parte()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_horas numeric;
  v_old_horas numeric := 0;
  v_old_km numeric := 0;
BEGIN
  IF NEW.estado = 'completado' AND NEW.maquinaria_id IS NOT NULL THEN
    
    v_horas := GREATEST(COALESCE(NEW.horometro_fin, 0) - COALESCE(NEW.horometro_inicio, 0), 0);
    
    IF TG_OP = 'UPDATE' AND OLD.estado = 'completado' AND OLD.maquinaria_id IS NOT NULL THEN
      v_old_horas := GREATEST(COALESCE(OLD.horometro_fin, 0) - COALESCE(OLD.horometro_inicio, 0), 0);
      v_old_km := COALESCE(OLD.km_camion, 0);
      
      UPDATE horas_maquina SET
        obra_id = COALESCE(NEW.obra_id, OLD.obra_id),
        fecha = NEW.fecha,
        hora_inicio = COALESCE(NEW.hora_entrada, '00:00'),
        hora_fin = COALESCE(NEW.hora_salida, '00:00'),
        horas_trabajadas = v_horas,
        observaciones = NEW.observacion_maquina
      WHERE maquinaria_id = OLD.maquinaria_id 
        AND operador_id = OLD.personal_id 
        AND fecha = OLD.fecha;
    ELSE
      IF NEW.obra_id IS NOT NULL AND v_horas > 0 THEN
        INSERT INTO horas_maquina (
          fecha, maquinaria_id, obra_id, operador_id,
          hora_inicio, hora_fin, horas_trabajadas, observaciones
        ) VALUES (
          NEW.fecha, NEW.maquinaria_id, NEW.obra_id, NEW.personal_id,
          COALESCE(NEW.hora_entrada, '00:00'), COALESCE(NEW.hora_salida, '00:00'),
          v_horas, NEW.observacion_maquina
        )
        ON CONFLICT DO NOTHING;
      END IF;
    END IF;
    
    UPDATE maquinarias SET
      horas_acumuladas = horas_acumuladas + v_horas - v_old_horas,
      km_acumulados = km_acumulados + COALESCE(NEW.km_camion, 0) - v_old_km
    WHERE id = NEW.maquinaria_id;
    
  END IF;
  
  RETURN NEW;
END;
$$;

-- Crear trigger
CREATE TRIGGER trg_sync_horas_km_from_parte
  AFTER INSERT OR UPDATE ON public.partes_diarios
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_horas_km_from_parte();
