import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useEmpleadoProfile } from "@/hooks/useEmpleadoProfile";

export type NotificacionTipo =
  | "parte_pendiente"
  | "observacion_maquina"
  | "documento_pendiente"
  | "mantenimiento";

export interface Notificacion {
  id: string;
  tipo: NotificacionTipo;
  titulo: string;
  descripcion: string;
  fecha: string; // ISO
  url: string;
}

const todayISO = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const inDaysISO = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

export function useNotificaciones() {
  const { user, hasRole } = useAuth();
  const { empleado, isMecanico } = useEmpleadoProfile();

  const isAdmin = hasRole("admin");
  const personalId = empleado?.id ?? null;
  const userId = user?.id ?? null;
  const empleadoRol = (empleado as any)?.rol as string | undefined;
  const ROLES_EXCLUIDOS_PARTE = ["administrativo", "sereno", "topografo"];

  // 1a. Admin: lista global de empleados sin parte hoy
  const partesAdminQuery = useQuery({
    queryKey: ["notif-partes-pendientes-admin", todayISO()],
    enabled: !!userId && isAdmin,
    staleTime: 60_000,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const fecha = todayISO();
      const [empleadosRes, partesRes] = await Promise.all([
        supabase
          .from("personal_selector" as any)
          .select("id, nombre, apellido, rol")
          .eq("activo", true) as unknown as Promise<{
          data: { id: string; nombre: string | null; apellido: string | null; rol: string }[] | null;
          error: any;
        }>,
        supabase.from("partes_diarios").select("personal_id").eq("fecha", fecha),
      ]);
      if (empleadosRes.error) throw empleadosRes.error;
      if (partesRes.error) throw partesRes.error;
      const conParte = new Set((partesRes.data || []).map((p) => p.personal_id));
      return (empleadosRes.data || []).filter(
        (e) => !ROLES_EXCLUIDOS_PARTE.includes(e.rol) && !conParte.has(e.id),
      );
    },
  });

  // 1b. Resto de usuarios: solo su propio parte de hoy
  const parteMioQuery = useQuery({
    queryKey: ["notif-parte-mio", personalId, todayISO()],
    enabled:
      !!userId &&
      !isAdmin &&
      !!personalId &&
      !!empleadoRol &&
      !ROLES_EXCLUIDOS_PARTE.includes(empleadoRol),
    staleTime: 60_000,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const fecha = todayISO();
      const { data, error } = await supabase
        .from("partes_diarios")
        .select("id")
        .eq("fecha", fecha)
        .eq("personal_id", personalId as string)
        .limit(1);
      if (error) throw error;
      return (data || []).length === 0; // true => pendiente
    },
  });

  // 2. Observaciones de maquinaria sin atender (admin / mecánico / ayudante)
  const obsQuery = useQuery({
    queryKey: ["notif-observaciones-maquina"],
    enabled: !!userId && (isAdmin || isMecanico),
    staleTime: 60_000,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("observaciones_maquina_estado")
        .select("id, observacion, fecha_reporte, created_at, maquinaria_id, maquinarias(nombre, codigo, patente)")
        .eq("atendida", false)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
  });

  // 3. Documentos pendientes de firma
  //    - admin: todos los documentos sin firmar
  //    - resto: solo los propios
  const docsQuery = useQuery({
    queryKey: ["notif-documentos-pendientes", isAdmin ? "all" : personalId],
    enabled: !!userId && (isAdmin || !!personalId),
    staleTime: 60_000,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      let q = supabase
        .from("empleado_documentos")
        .select("id, titulo, tipo, created_at, personal_id, personal:personal_id(nombre, apellido)")
        .is("firmado_at", null)
        .order("created_at", { ascending: false })
        .limit(50);
      if (!isAdmin && personalId) q = q.eq("personal_id", personalId);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  // 4. Mantenimientos próximos / vencidos (admin / mecánico / ayudante)
  const mantQuery = useQuery({
    queryKey: ["notif-mantenimientos"],
    enabled: !!userId && (isAdmin || isMecanico),
    staleTime: 60_000,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const limite = inDaysISO(7);
      const { data, error } = await supabase
        .from("mantenimientos")
        .select("id, descripcion, proximo_mantenimiento, fecha, estado, maquinaria_id, maquinarias(nombre, codigo, patente)")
        .neq("estado", "completado")
        .not("proximo_mantenimiento", "is", null)
        .lte("proximo_mantenimiento", limite)
        .order("proximo_mantenimiento", { ascending: true })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
  });

  const items: Notificacion[] = useMemo(() => {
    const list: Notificacion[] = [];

    if (isAdmin) {
      for (const e of partesAdminQuery.data || []) {
        list.push({
          id: `parte:${e.id}`,
          tipo: "parte_pendiente",
          titulo: "Parte diario pendiente",
          descripcion: `${e.apellido ?? ""} ${e.nombre ?? ""}`.trim() || "Empleado sin parte",
          fecha: new Date().toISOString(),
          url: "/parte-diario",
        });
      }
    } else if (parteMioQuery.data === true) {
      list.push({
        id: `parte-mio:${personalId}:${todayISO()}`,
        tipo: "parte_pendiente",
        titulo: "Tu parte diario está pendiente",
        descripcion: "Cargá tu parte de hoy",
        fecha: new Date().toISOString(),
        url: "/parte-diario",
      });
    }

    for (const o of obsQuery.data || []) {
      const maq: any = (o as any).maquinarias;
      const nombre = maq?.nombre || maq?.codigo || maq?.patente || "Máquina";
      list.push({
        id: `obs:${o.id}`,
        tipo: "observacion_maquina",
        titulo: `Observación: ${nombre}`,
        descripcion: (o.observacion || "").slice(0, 120) || "Sin descripción",
        fecha: o.created_at || o.fecha_reporte,
        url: "/mantenimiento",
      });
    }

    for (const d of docsQuery.data || []) {
      const p: any = (d as any).personal;
      const quien = isAdmin && p ? `${p.apellido ?? ""} ${p.nombre ?? ""}`.trim() : "";
      list.push({
        id: `doc:${d.id}`,
        tipo: "documento_pendiente",
        titulo: isAdmin ? `Documento sin firmar${quien ? ` — ${quien}` : ""}` : "Documento pendiente de firma",
        descripcion: d.titulo || d.tipo || "Documento",
        fecha: d.created_at,
        url: isAdmin ? "/personal" : "/mis-documentos",
      });
    }

    for (const m of mantQuery.data || []) {
      const maq: any = (m as any).maquinarias;
      const nombre = maq?.nombre || maq?.codigo || maq?.patente || "Máquina";
      const vencido = m.proximo_mantenimiento && m.proximo_mantenimiento < todayISO();
      list.push({
        id: `mant:${m.id}`,
        tipo: "mantenimiento",
        titulo: `${vencido ? "Mantenimiento vencido" : "Mantenimiento próximo"}: ${nombre}`,
        descripcion: m.descripcion || `Programado: ${m.proximo_mantenimiento}`,
        fecha: m.proximo_mantenimiento || m.fecha,
        url: "/mantenimiento",
      });
    }

    list.sort((a, b) => (a.fecha < b.fecha ? 1 : -1));
    return list;
  }, [partesAdminQuery.data, parteMioQuery.data, obsQuery.data, docsQuery.data, mantQuery.data, isAdmin, personalId]);

  // Leídas en localStorage
  const storageKey = userId ? `notif_read_${userId}` : null;
  const [readIds, setReadIds] = useState<Set<string>>(() => {
    if (!storageKey) return new Set();
    try {
      const raw = localStorage.getItem(storageKey);
      return new Set(raw ? (JSON.parse(raw) as string[]) : []);
    } catch {
      return new Set();
    }
  });

  useEffect(() => {
    if (!storageKey) return;
    try {
      const raw = localStorage.getItem(storageKey);
      setReadIds(new Set(raw ? (JSON.parse(raw) as string[]) : []));
    } catch {}
  }, [storageKey]);

  const markAllRead = useCallback(() => {
    if (!storageKey) return;
    const allIds = items.map((i) => i.id);
    const next = new Set(allIds);
    setReadIds(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify(allIds));
    } catch {}
  }, [items, storageKey]);

  const unread = items.filter((i) => !readIds.has(i.id)).length;
  const isLoading =
    partesAdminQuery.isLoading || parteMioQuery.isLoading || obsQuery.isLoading || docsQuery.isLoading || mantQuery.isLoading;

  return { items, total: items.length, unread, readIds, markAllRead, isLoading };
}
