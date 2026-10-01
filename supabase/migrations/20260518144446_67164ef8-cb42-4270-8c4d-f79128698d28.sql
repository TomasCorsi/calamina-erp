
-- 1) Recalcular horas_acumuladas filtrando outliers
WITH stats AS (
  SELECT maquinaria_id,
         percentile_cont(0.9) WITHIN GROUP (ORDER BY horometro_fin) AS p90,
         COUNT(*) AS n
  FROM partes_diarios
  WHERE estado = 'completado'
    AND maquinaria_id IS NOT NULL
    AND horometro_fin > 0
  GROUP BY maquinaria_id
),
ultimos AS (
  SELECT DISTINCT ON (p.maquinaria_id)
    p.maquinaria_id, p.horometro_fin
  FROM partes_diarios p
  JOIN stats s ON s.maquinaria_id = p.maquinaria_id
  WHERE p.estado = 'completado'
    AND p.horometro_fin > 0
    AND (s.n < 5 OR p.horometro_fin <= s.p90 * 1.15)
  ORDER BY p.maquinaria_id, p.fecha DESC, p.created_at DESC
)
UPDATE maquinarias m
SET horas_acumuladas = u.horometro_fin
FROM ultimos u
WHERE m.id = u.maquinaria_id;

-- 2) Recalcular km_acumulados filtrando outliers
WITH stats AS (
  SELECT maquinaria_id,
         percentile_cont(0.9) WITHIN GROUP (ORDER BY km_camion) AS p90,
         COUNT(*) AS n
  FROM partes_diarios
  WHERE estado = 'completado'
    AND maquinaria_id IS NOT NULL
    AND km_camion > 0
  GROUP BY maquinaria_id
),
ultimos AS (
  SELECT DISTINCT ON (p.maquinaria_id)
    p.maquinaria_id, p.km_camion
  FROM partes_diarios p
  JOIN stats s ON s.maquinaria_id = p.maquinaria_id
  WHERE p.estado = 'completado'
    AND p.km_camion > 0
    AND (s.n < 5 OR p.km_camion <= s.p90 * 1.15)
  ORDER BY p.maquinaria_id, p.fecha DESC, p.created_at DESC
)
UPDATE maquinarias m
SET km_acumulados = u.km_camion
FROM ultimos u
WHERE m.id = u.maquinaria_id;

-- 3) Trigger: rechaza saltos absurdos (>1.5x el acumulado actual)
CREATE OR REPLACE FUNCTION public.sync_horas_km_from_parte()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_horas numeric;
  v_horas_actuales numeric;
  v_km_actuales numeric;
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

    SELECT horas_acumuladas, km_acumulados
      INTO v_horas_actuales, v_km_actuales
    FROM maquinarias WHERE id = NEW.maquinaria_id;

    -- Sobrescribe horas/km del parte salvo: valor 0, o salto absurdo (>1.5x del acumulado actual)
    UPDATE maquinarias SET
      horas_acumuladas = CASE
        WHEN COALESCE(NEW.horometro_fin, 0) <= 0 THEN horas_acumuladas
        WHEN COALESCE(v_horas_actuales, 0) > 0
             AND NEW.horometro_fin > v_horas_actuales * 1.5 THEN horas_acumuladas
        ELSE NEW.horometro_fin
      END,
      km_acumulados = CASE
        WHEN COALESCE(NEW.km_camion, 0) <= 0 THEN km_acumulados
        WHEN COALESCE(v_km_actuales, 0) > 0
             AND NEW.km_camion > v_km_actuales * 1.5 THEN km_acumulados
        ELSE NEW.km_camion
      END
    WHERE id = NEW.maquinaria_id;

  END IF;

  RETURN NEW;
END;
$function$;
