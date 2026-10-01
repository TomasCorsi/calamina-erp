import { useCallback, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays } from "date-fns";

const STORAGE_KEY = "tablero_obras_seleccionadas";
export const MAX_OBRAS = 12;
/** Cantidad de obras que se sugieren automáticamente la primera vez */
export const MAX_SUGERIDAS = 3;

function readStored(): string[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.every((x) => typeof x === "string")) {
      return parsed.slice(0, MAX_OBRAS);
    }
    return null;
  } catch {
    return null;
  }
}

/** Obras activas con mayor actividad reciente (últimos 7 días) */
const fetchObrasSugeridas = async (): Promise<string[]> => {
  const desde = format(subDays(new Date(), 7), "yyyy-MM-dd");

  const [obrasRes, partesRes, remitosRes] = await Promise.all([
    supabase.from("obras").select("id, created_at").eq("estado", "activa"),
    supabase.from("partes_diarios").select("obra_id").gte("fecha", desde),
    supabase.from("remitos").select("obra_id").gte("fecha", desde),
  ]);

  const activas = (obrasRes.data || []) as { id: string; created_at: string }[];
  const activasSet = new Set(activas.map((o) => o.id));
  const score: Record<string, number> = {};

  for (const r of (partesRes.data || []) as { obra_id: string | null }[]) {
    if (r.obra_id && activasSet.has(r.obra_id)) score[r.obra_id] = (score[r.obra_id] || 0) + 1;
  }
  for (const r of (remitosRes.data || []) as { obra_id: string | null }[]) {
    if (r.obra_id && activasSet.has(r.obra_id)) score[r.obra_id] = (score[r.obra_id] || 0) + 1;
  }

  const ordenadas = [...activas].sort((a, b) => {
    const diff = (score[b.id] || 0) - (score[a.id] || 0);
    if (diff !== 0) return diff;
    return (b.created_at || "").localeCompare(a.created_at || "");
  });

  return ordenadas.slice(0, MAX_SUGERIDAS).map((o) => o.id);
};

export function useObrasSeleccionadas() {
  const [obraIds, setObraIds] = useState<string[]>(() => readStored() || []);
  const [hasSelection, setHasSelection] = useState<boolean>(() => readStored() !== null);

  const { data: sugeridas, isLoading: loadingSugeridas } = useQuery({
    queryKey: ["tablero", "obras-sugeridas"],
    queryFn: fetchObrasSugeridas,
    enabled: !hasSelection,
    staleTime: 5 * 60 * 1000,
  });

  // Aplica sugerencias solo si el usuario aún no eligió nada (sin persistirlas)
  useEffect(() => {
    if (!hasSelection && sugeridas && sugeridas.length > 0 && obraIds.length === 0) {
      setObraIds(sugeridas);
    }
  }, [hasSelection, sugeridas, obraIds.length]);

  const guardar = useCallback((ids: string[]) => {
    const limitados = ids.slice(0, MAX_OBRAS);
    setObraIds(limitados);
    setHasSelection(true);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(limitados));
    } catch {
      /* ignore */
    }
  }, []);

  const quitar = useCallback(
    (id: string) => {
      guardar(obraIds.filter((o) => o !== id));
    },
    [obraIds, guardar]
  );

  const limpiar = useCallback(() => {
    setHasSelection(false);
    setObraIds([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  return {
    obraIds,
    guardar,
    quitar,
    limpiar,
    hasSelection,
    loading: !hasSelection && loadingSugeridas,
  };
}
