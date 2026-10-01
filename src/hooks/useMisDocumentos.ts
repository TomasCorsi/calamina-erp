import { useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useEmpleadoProfile } from "@/hooks/useEmpleadoProfile";
import { toast } from "sonner";
import type { EmpleadoDocumento } from "./useEmpleadoDocumentos";

const BUCKET = "empleado-documentos";

export function useMisDocumentos() {
  const { user, role, loading: authLoading } = useAuth();
  const { empleado, loading: empleadoLoading } = useEmpleadoProfile();
  const qc = useQueryClient();
  const seenIdsRef = useRef<Set<string>>(new Set());
  const initializedRef = useRef(false);
  const loginAlertShownRef = useRef(false);

  const personalId = empleado?.id ?? null;
  const canQueryOwnDocsWithoutProfile = !!user?.id && role !== "admin";

  const list = useQuery({
    queryKey: ["mis_documentos", user?.id, personalId, role],
    enabled: !authLoading && !empleadoLoading && !!user?.id && (!!personalId || canQueryOwnDocsWithoutProfile),
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchInterval: 60_000,
    staleTime: 0,
    retry: 2,
    queryFn: async () => {
      if (!personalId && !canQueryOwnDocsWithoutProfile) return [];

      let query = supabase
        .from("empleado_documentos")
        .select("*")
        .order("created_at", { ascending: false });

      // Si el perfil operativo todavía no hidrató en la PWA, consultamos sin filtro:
      // RLS limita el resultado a los documentos propios del usuario autenticado.
      if (personalId) {
        query = query.eq("personal_id", personalId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as EmpleadoDocumento[];
    },
  });

  const docs = list.data || [];

  const pendientesCount = docs.filter(
    (d) => !d.visto_at || (d.tipo === "recibo_sueldo" && !d.firmado_at)
  ).length;

  // Toast en realtime: notificar documentos nuevos detectados después de la primera carga
  useEffect(() => {
    if (!list.data) return;
    if (!initializedRef.current) {
      list.data.forEach((d) => seenIdsRef.current.add(d.id));
      initializedRef.current = true;
      return;
    }
    list.data.forEach((d) => {
      if (!seenIdsRef.current.has(d.id)) {
        seenIdsRef.current.add(d.id);
        const desc =
          d.tipo === "recibo_sueldo"
            ? "Tenés un recibo de sueldo para ver y firmar"
            : "Tenés un estudio médico para revisar";
        toast.success(d.titulo || "Nuevo documento disponible", {
          description: desc,
          duration: 8000,
        });
      }
    });
  }, [list.data]);

  // Aviso al iniciar sesión / abrir la app: si hay pendientes, un toast con dedupe por set de IDs
  useEffect(() => {
    if (!user?.id || !list.data || loginAlertShownRef.current) return;
    const pendientes = list.data.filter(
      (d) => !d.visto_at || (d.tipo === "recibo_sueldo" && !d.firmado_at)
    );
    if (pendientes.length === 0) return;

    const key = `docs_login_alert_${user.id}`;
    const idsKey = pendientes.map((d) => d.id).sort().join(",");
    const prev = (() => {
      try { return localStorage.getItem(key); } catch { return null; }
    })();

    if (prev !== idsKey) {
      const hasRecibo = pendientes.some((d) => d.tipo === "recibo_sueldo");
      const hasEstudio = pendientes.some((d) => d.tipo === "estudio_medico");
      let description = "";
      if (hasRecibo && hasEstudio) description = "Tenés recibos y estudios médicos para revisar";
      else if (hasRecibo) description = pendientes.length > 1
        ? `Tenés ${pendientes.length} recibos para ver y firmar`
        : "Tenés un recibo de sueldo para ver y firmar";
      else description = pendientes.length > 1
        ? `Tenés ${pendientes.length} estudios médicos para revisar`
        : "Tenés un estudio médico para revisar";

      toast.message("Documentos pendientes", {
        description,
        duration: 10000,
      });
      try { localStorage.setItem(key, idsKey); } catch { void 0; }
    }
    loginAlertShownRef.current = true;
  }, [user?.id, list.data]);

  // Realtime
  useEffect(() => {
    if (!personalId) return;

    const channel = supabase
      .channel(`empleado_documentos:${personalId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "empleado_documentos",
          filter: `personal_id=eq.${personalId}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: ["mis_documentos"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [personalId, qc]);

  const markVisto = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("empleado_documentos")
        .update({ visto_at: new Date().toISOString() })
        .eq("id", id)
        .is("visto_at", null);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["mis_documentos"] }),
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Error al marcar como visto"),
  });

  const firmar = useMutation({
    mutationFn: async (args: { id: string; firma_data_url: string }) => {
      let ip: string | null = null;
      try {
        const r = await fetch("https://api.ipify.org?format=json");
        const j = await r.json();
        ip = j?.ip || null;
      } catch { void 0; }
      const { error } = await supabase
        .from("empleado_documentos")
        .update({
          firma_data_url: args.firma_data_url,
          firmado_at: new Date().toISOString(),
          firmado_ip: ip,
          visto_at: new Date().toISOString(),
        })
        .eq("id", args.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mis_documentos"] });
      toast.success("Recibo firmado");
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Error al firmar"),
  });

  const getDownloadUrl = async (doc: EmpleadoDocumento) => {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(doc.storage_path, 300);
    if (error) throw error;
    return data.signedUrl;
  };

  return {
    documentos: docs,
    pendientesCount,
    isLoading: list.isLoading,
    markVisto: markVisto.mutate,
    firmar: firmar.mutateAsync,
    isSigning: firmar.isPending,
    getDownloadUrl,
  };
}
