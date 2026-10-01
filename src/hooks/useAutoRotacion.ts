import { useCallback, useEffect, useRef, useState } from "react";

interface Options {
  /** Cantidad de posiciones del ciclo */
  total: number;
  /** Milisegundos por posición */
  intervalo?: number;
  /** Activa la rotación */
  enabled?: boolean;
  /** Pausa temporal (ms) tras actividad del usuario */
  pausaActividad?: number;
  onTick?: (indice: number) => void;
}

/**
 * Temporizador de rotación automática con progreso 0-1 y pausa por actividad.
 */
export function useAutoRotacion({
  total,
  intervalo = 20000,
  enabled = true,
  pausaActividad = 30000,
  onTick,
}: Options) {
  const [indice, setIndice] = useState(0);
  const [progreso, setProgreso] = useState(0);
  const [pausado, setPausado] = useState(false);
  const [actividad, setActividad] = useState(false);
  const inicioRef = useRef<number>(Date.now());
  const onTickRef = useRef(onTick);
  onTickRef.current = onTick;

  const activo = enabled && !pausado && !actividad && total > 1;

  const reiniciar = useCallback(() => {
    inicioRef.current = Date.now();
    setProgreso(0);
  }, []);

  const avanzar = useCallback(
    (delta: number) => {
      setIndice((i) => {
        const next = (i + delta + total) % total;
        onTickRef.current?.(next);
        return next;
      });
      reiniciar();
    },
    [total, reiniciar]
  );

  const irA = useCallback(
    (i: number) => {
      setIndice(i);
      onTickRef.current?.(i);
      reiniciar();
    },
    [reiniciar]
  );

  // Tick de progreso / avance
  useEffect(() => {
    if (!activo) {
      setProgreso(0);
      inicioRef.current = Date.now();
      return;
    }
    const id = setInterval(() => {
      const t = (Date.now() - inicioRef.current) / intervalo;
      if (t >= 1) {
        inicioRef.current = Date.now();
        setProgreso(0);
        setIndice((i) => {
          const next = (i + 1) % total;
          onTickRef.current?.(next);
          return next;
        });
      } else {
        setProgreso(t);
      }
    }, 200);
    return () => clearInterval(id);
  }, [activo, intervalo, total]);

  // Pausa por actividad del usuario
  useEffect(() => {
    if (!enabled) return;
    let timeout: ReturnType<typeof setTimeout> | null = null;
    const marcar = () => {
      setActividad(true);
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(() => setActividad(false), pausaActividad);
    };
    const eventos: (keyof WindowEventMap)[] = ["mousemove", "keydown", "touchstart", "wheel"];
    eventos.forEach((e) => window.addEventListener(e, marcar, { passive: true }));
    return () => {
      if (timeout) clearTimeout(timeout);
      eventos.forEach((e) => window.removeEventListener(e, marcar));
    };
  }, [enabled, pausaActividad]);

  return {
    indice,
    progreso,
    pausado,
    activo,
    enPausaPorActividad: actividad,
    togglePausa: () => setPausado((p) => !p),
    avanzar,
    irA,
    reiniciar,
  };
}
