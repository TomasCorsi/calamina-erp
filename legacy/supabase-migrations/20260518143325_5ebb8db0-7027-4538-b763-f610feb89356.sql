CREATE OR REPLACE FUNCTION public.sync_horas_km_from_parte()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_horas numeric;
BEGIN
  IF NEW.estado = 'completado' AND NEW.maquinaria_id IS NOT NULL THEN
    
    v_horas := GREATEST(COALESCE(NEW.horometro_fin, 0) - COALESCE(NEW.horometro_inicio, 0), 0);
    
    IF TG_OP = 'UPDATE' AND OLD.estado = 'completado' AND OLD.maquinaria_id IS NOT NULL THEN
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
    
    -- Sobrescribe horas/km con el valor del parte (a menos que sea 0)
    UPDATE maquinarias SET
      horas_acumuladas = CASE 
        WHEN COALESCE(NEW.horometro_fin, 0) > 0 THEN NEW.horometro_fin 
        ELSE horas_acumuladas 
      END,
      km_acumulados = CASE 
        WHEN COALESCE(NEW.km_camion, 0) > 0 THEN NEW.km_camion 
        ELSE km_acumulados 
      END
    WHERE id = NEW.maquinaria_id;
    
  END IF;
  
  RETURN NEW;
END;
$function$;