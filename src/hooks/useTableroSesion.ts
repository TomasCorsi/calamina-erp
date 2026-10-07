import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import type { MetricaSerie } from "@/hooks/useTableroSeries";
import { useAuth } from "@/hooks/useAuth";

const db = supabase as any;

export interface TableroSesion {
  id: string;
  nombre: string;
  obra_ids: string[];
  obra_activa: string | null;
  metrica: MetricaSerie;
  mes: string;
  rotacion_activa: boolean;
  rotacion_segundos: number;
  refresh_token: number;
  tv_ping_at: string | null;
  updated_at: string;
}

const LOCAL_KEY = "tablero_sesion_id";

function normalizar(row: any): TableroSesion {
  return {
    id: row.id,
    nombre: row.nombre,
    obra_ids: (row.obra_ids || []) as string[],
    obra_activa: row.obra_activa,
    metrica: (row.metrica || "m3") as MetricaSerie,
    mes: row.mes || format(new Date(), "yyyy-MM"),
    rotacion_activa: !!row.rotacion_activa,
    rotacion_segundos: row.rotacion_segundos || 20,
    refresh_token: row.refresh_token || 0,
    tv_ping_at: row.tv_ping_at,
    updated_at: row.updated_at,
  };
}

/**
 * Sesión compartida del tablero: el control (PC o celular) escribe y la TV
 * sincroniza los cambios mediante polling local.
 */
export function useTableroSesion(opciones?: { esTV?: boolean }) {
  const esTV = !!opciones?.esTV;
  const { membership } = useAuth();
  const companyId = membership?.company_id ?? null;
  const [sesion, setSesion] = useState<TableroSesion | null>(null);
  const [loading, setLoading] = useState(true);
  const conectado = false;
  const idRef = useRef<string | null>(null);

  // Carga (o crea) la sesión
  useEffect(() => {
    let cancelado = false;
    (async () => {
      if (!companyId) {
        setLoading(false);
        return;
      }
      const guardada = localStorage.getItem(`${LOCAL_KEY}:${companyId}`);
      let row: any = null;

      if (guardada) {
        const { data } = await db
          .from("tablero_sesiones")
          .select("*")
          .eq("id", guardada)
          .eq("company_id", companyId)
          .maybeSingle();
        row = data;
      }
      if (!row) {
        const { data } = await db
          .from("tablero_sesiones")
          .select("*")
          .eq("company_id", companyId)
          .order("created_at", { ascending: true })
          .limit(1);
        row = data?.[0] || null;
      }
      if (!row) {
        const { data, error } = await db
          .from("tablero_sesiones")
          .insert({ company_id: companyId, nombre: "Tablero TV" })
          .select("*")
          .maybeSingle();
        row = data;
        if (error?.code === "23505") {
          const retry = await db
            .from("tablero_sesiones")
            .select("*")
            .eq("company_id", companyId)
            .maybeSingle();
          row = retry.data;
        }
      }
      if (cancelado || !row) {
        if (!cancelado) setLoading(false);
        return;
      }
      idRef.current = row.id;
      try {
        localStorage.setItem(`${LOCAL_KEY}:${companyId}`, row.id);
      } catch {
        /* ignore */
      }
      setSesion(normalizar(row));
      setLoading(false);
    })();
    return () => {
      cancelado = true;
    };
  }, [companyId]);

  // Realtime está deshabilitado en el entorno local; el polling mantiene
  // sincronizados el control y la pantalla TV sin abrir un canal adicional.
  useEffect(() => {
    if (!sesion?.id) return;
    let active = true;
    const sync = async () => {
      const { data } = await db.from("tablero_sesiones").select("*").eq("id", sesion.id).maybeSingle();
      if (active && data) setSesion(normalizar(data));
    };
    const timer = window.setInterval(() => void sync(), 5000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [sesion?.id]);

  const actualizar = useCallback(
    async (cambios: Partial<Omit<TableroSesion, "id" | "updated_at">>) => {
      const id = idRef.current;
      if (!id) return;
      setSesion((prev) => (prev ? { ...prev, ...cambios } as TableroSesion : prev));
      await db.from("tablero_sesiones").update(cambios as any).eq("id", id);
    },
    []
  );

  // La TV avisa que está viva cada 30s
  useEffect(() => {
    if (!esTV || !sesion?.id) return;
    const ping = () =>
      db
        .from("tablero_sesiones")
        .update({ tv_ping_at: new Date().toISOString() })
        .eq("id", sesion.id);
    ping();
    const t = setInterval(ping, 30000);
    return () => clearInterval(t);
  }, [esTV, sesion?.id]);

  return { sesion, loading, conectado, actualizar };
}
