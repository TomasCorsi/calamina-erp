import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const TABLAS = [
  "partes_diarios",
  "remitos",
  "cargas_combustible_repartidor",
  "otros_gastos",
  "mantenimientos",
  "maquinarias",
] as const;

/**
 * Escucha los cambios en vivo de las tablas que alimentan el tablero e invalida
 * las queries con un debounce para no recargar decenas de veces seguidas.
 */
export function useTableroRealtime(enabled = true) {
  const queryClient = useQueryClient();
  const [conectado, setConectado] = useState(false);
  const [ultimoCambio, setUltimoCambio] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const invalidar = () => {
      setUltimoCambio(Date.now());
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["tablero-obras"] });
        queryClient.invalidateQueries({ queryKey: ["tablero-series"] });
      }, 2000);
    };

    let channel = supabase.channel("tablero-obras-realtime");
    TABLAS.forEach((table) => {
      channel = channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        invalidar
      );
    });

    channel.subscribe((status) => {
      setConectado(status === "SUBSCRIBED");
    });

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      supabase.removeChannel(channel);
      setConectado(false);
    };
  }, [enabled, queryClient]);

  return { conectado, ultimoCambio };
}
