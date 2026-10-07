import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabaseV2 as supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

const db = supabase as any;

// ---- Types ----

export type TipoCertificado = "obra" | "servicio" | "mixto";

export interface CertificadoConcepto {
  id: string;
  obra_id: string;
  nombre: string;
  unidad: string;
  precio_unitario: number;
  activo: boolean;
  orden: number;
  categoria: string;
  cantidad_total: number;
  etapa: string | null;
  tipo: 'obra' | 'servicio';
  created_at: string;
  updated_at: string;
}

export interface ConceptoForm {
  obra_id: string;
  nombre: string;
  unidad: string;
  precio_unitario: number;
  activo?: boolean;
  orden?: number;
  categoria?: string;
  cantidad_total?: number;
  etapa?: string | null;
  tipo?: 'obra' | 'servicio';
}

export type EstadoCertificado = "borrador" | "emitido" | "cobrado";

export type MetodoPago = "transferencia" | "cheque" | "efectivo" | "echeq" | "deposito" | "otro";

export const METODOS_PAGO: { value: MetodoPago; label: string }[] = [
  { value: "transferencia", label: "Transferencia" },
  { value: "cheque", label: "Cheque" },
  { value: "echeq", label: "eCheq" },
  { value: "deposito", label: "Depósito" },
  { value: "efectivo", label: "Efectivo" },
  { value: "otro", label: "Otro" },
];

export interface CertificadoPago {
  id: string;
  certificado_id: string;
  fecha: string;
  monto: number;
  descripcion: string | null;
  metodo: MetodoPago | null;
  referencia: string | null;
  banco: string | null;
  comprobante_url: string | null;
  created_at: string;
}

export type EstadoEfectivo = "borrador" | "emitido" | "parcial" | "cobrado" | "vencido";

export const ESTADO_EFECTIVO_LABEL: Record<EstadoEfectivo, string> = {
  borrador: "Borrador",
  emitido: "Emitido",
  parcial: "Cobro parcial",
  cobrado: "Cobrado",
  vencido: "Vencido",
};

export const ESTADO_EFECTIVO_COLOR: Record<EstadoEfectivo, string> = {
  borrador: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400",
  emitido: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  parcial: "bg-orange-500/15 text-orange-700 dark:text-orange-400",
  cobrado: "bg-green-500/15 text-green-700 dark:text-green-400",
  vencido: "bg-red-500/15 text-red-700 dark:text-red-400",
};

export function getEstadoEfectivo(
  cert: { estado: EstadoCertificado; total: number; fecha_emision: string | null },
  pagado: number,
  diasVencimiento = 30
): EstadoEfectivo {
  if (cert.estado === "borrador") return "borrador";
  if (pagado >= cert.total && cert.total > 0) return "cobrado";
  if (pagado > 0) return "parcial";
  if (cert.fecha_emision) {
    const dias = Math.floor((Date.now() - new Date(cert.fecha_emision).getTime()) / 86400000);
    if (dias > diasVencimiento) return "vencido";
  }
  return "emitido";
}



export interface Certificado {
  id: string;
  obra_id: string;
  numero: string;
  periodo: string;
  estado: EstadoCertificado;
  fecha_emision: string | null;
  fecha_certificado: string;
  subtotal: number;
  iva: number;
  total: number;
  observaciones: string | null;
  tipo: TipoCertificado;
  anticipo_porcentaje: number;
  incluir_iva: boolean;
  created_at: string;
  updated_at: string;
}

export interface CertificadoItem {
  id: string;
  certificado_id: string;
  concepto_id: string | null;
  descripcion: string;
  unidad: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  etapa: string | null;
  seccion: string | null;
  observaciones: string | null;
  created_at: string;
}

export interface CertificadoItemForm {
  concepto_id: string | null;
  descripcion: string;
  unidad: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  categoria: string;
  etapa: string | null;
  cantidad_total: number;
  seccion?: string | null;
  observaciones?: string;
}

// ---- Categories ----

export const CATEGORIAS_CERTIFICADO = [
  "Alquiler de Maquinas",
  "Ejecución de obra",
  "Materiales",
  "Transporte",
  "Servicios",
  "General",
];

// ---- Predefined concepts ----

export const CONCEPTOS_ESTANDAR: { nombre: string; unidad: string; categoria: string }[] = [
  { nombre: "Horas Retroexcavadora", unidad: "HR", categoria: "Alquiler de Maquinas" },
  { nombre: "Horas Cargadora", unidad: "HR", categoria: "Alquiler de Maquinas" },
  { nombre: "Horas Topador", unidad: "HR", categoria: "Alquiler de Maquinas" },
  { nombre: "Horas Motoniveladora", unidad: "HR", categoria: "Alquiler de Maquinas" },
  { nombre: "Alquiler Máquina por día", unidad: "DIA", categoria: "Alquiler de Maquinas" },
  { nombre: "Gasoil", unidad: "LT", categoria: "Servicios" },
  { nombre: "Tosca", unidad: "M3", categoria: "Materiales" },
  { nombre: "Tierra", unidad: "M3", categoria: "Materiales" },
  { nombre: "Cascote", unidad: "M3", categoria: "Materiales" },
  { nombre: "Piedra", unidad: "M3", categoria: "Materiales" },
  { nombre: "Fresado", unidad: "M3", categoria: "Materiales" },
  { nombre: "Suelo Cemento", unidad: "M3", categoria: "Materiales" },
  { nombre: "Cunetas", unidad: "ML", categoria: "Servicios" },
  { nombre: "Viajes", unidad: "VJ", categoria: "Transporte" },
];

// ---- Acumulados helper ----

export interface AcumuladoConcepto {
  concepto_id: string;
  cantidad_anterior: number;
  avance_anterior: number;
}

export async function fetchAcumulados(
  obraId: string,
  periodoActual: string,
  excludeCertId?: string
): Promise<AcumuladoConcepto[]> {
  // Get all certificados of type 'obra' or 'mixto' for this obra with periodo < periodoActual
  const { data: certs, error } = await supabase
    .from("certificados")
    .select("id, periodo")
    .eq("obra_id", obraId)
    .in("tipo", ["obra", "mixto"])
    .lt("periodo", periodoActual);

  if (error || !certs || certs.length === 0) return [];

  const certIds = certs
    .filter((c) => !excludeCertId || c.id !== excludeCertId)
    .map((c) => c.id);

  if (certIds.length === 0) return [];

  const { data: items, error: itemsError } = await supabase
    .from("certificado_items")
    .select("concepto_id, cantidad, precio_unitario")
    .in("certificado_id", certIds);

  if (itemsError || !items) return [];

  // Aggregate by concepto_id
  const map = new Map<string, { cantidad: number; avance: number }>();
  items.forEach((item) => {
    if (!item.concepto_id) return;
    const existing = map.get(item.concepto_id) || { cantidad: 0, avance: 0 };
    existing.cantidad += item.cantidad;
    existing.avance += item.cantidad * item.precio_unitario;
    map.set(item.concepto_id, existing);
  });

  return [...map.entries()].map(([concepto_id, { cantidad, avance }]) => ({
    concepto_id,
    cantidad_anterior: cantidad,
    avance_anterior: avance,
  }));
}

// ---- Hook ----

export function useCertificados(obraId?: string) {
  const queryClient = useQueryClient();
  const { membership } = useAuth();
  const companyId = membership?.company_id;

  // Conceptos for selected obra
  const { data: conceptos = [], isLoading: loadingConceptos } = useQuery({
    queryKey: ["certificado_conceptos", obraId],
    queryFn: async () => {
      if (!obraId) return [];
      const { data, error } = await supabase
        .from("certificado_conceptos")
        .select("*")
        .eq("obra_id", obraId)
        .order("orden", { ascending: true });
      if (error) throw error;
      return (data as any[]).map((d) => ({
        ...d,
        categoria: d.categoria || "General",
        cantidad_total: d.cantidad_total || 0,
        etapa: d.etapa || null,
        tipo: (d.tipo === 'obra' ? 'obra' : 'servicio') as 'obra' | 'servicio',
      })) as CertificadoConcepto[];
    },
    enabled: !!obraId && !!companyId,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  // Certificados for selected obra
  const { data: certificados = [], isLoading: loadingCertificados } = useQuery({
    queryKey: ["certificados", obraId],
    queryFn: async () => {
      if (!obraId) return [];
      const { data, error } = await supabase
        .from("certificados")
        .select("*, pagos:certificado_pagos(*)")
        .eq("obra_id", obraId)
        .order("periodo", { ascending: false });
      if (error) throw error;
      return (data as any[]).map((d) => ({
        ...d,
        tipo: d.tipo || "servicio",
        anticipo_porcentaje: d.anticipo_porcentaje || 0,
        incluir_iva: d.incluir_iva !== false,
      })) as Certificado[];
    },
    enabled: !!obraId && !!companyId,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  // Items for a specific certificado — cached per certId
  const fetchItems = (certificadoId: string): Promise<CertificadoItem[]> =>
    queryClient.fetchQuery({
      queryKey: ["certificado_items", certificadoId],
      queryFn: async () => {
        const { data, error } = await supabase
          .from("certificado_items")
          .select("*")
          .eq("certificado_id", certificadoId)
          .order("created_at", { ascending: true });
        if (error) throw error;
        return (data as any[]).map((d) => ({
          ...d,
          etapa: d.etapa || null,
          seccion: d.seccion || null,
        })) as CertificadoItem[];
      },
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
    });

  // Acumulados — cached per (obra, periodo, excludeCertId)
  const fetchAcumuladosCached = (
    obraIdArg: string,
    periodoActual: string,
    excludeCertId?: string,
  ): Promise<AcumuladoConcepto[]> =>
    queryClient.fetchQuery({
      queryKey: ["certificado_acumulados", obraIdArg, periodoActual, excludeCertId || null],
      queryFn: () => fetchAcumulados(obraIdArg, periodoActual, excludeCertId),
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
    });

  // ---- Concepto mutations ----

  const createConcepto = useMutation({
    mutationFn: async (concepto: ConceptoForm) => {
      if (!companyId) throw new Error("No hay empresa activa");
      const { data, error } = await db
        .from("certificado_conceptos")
        .insert([{ company_id: companyId, ...concepto }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Concepto agregado");
      queryClient.invalidateQueries({ queryKey: ["certificado_conceptos", obraId] });
    },
    onError: () => toast.error("Error al agregar concepto"),
  });

  const updateConcepto = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ConceptoForm> & { id: string }) => {
      const { error } = await supabase
        .from("certificado_conceptos")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Concepto actualizado");
      queryClient.invalidateQueries({ queryKey: ["certificado_conceptos", obraId] });
    },
    onError: () => toast.error("Error al actualizar concepto"),
  });

  const deleteConcepto = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("certificado_conceptos")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Concepto eliminado");
      queryClient.invalidateQueries({ queryKey: ["certificado_conceptos", obraId] });
    },
    onError: () => toast.error("Error al eliminar concepto"),
  });

  // ---- Certificado mutations ----

  const createCertificado = useMutation({
    mutationFn: async ({
      periodo,
      items,
      observaciones,
      tipo = "servicio",
      anticipo_porcentaje = 0,
      incluir_iva = true,
      numero: customNumero,
      fecha_certificado,
    }: {
      periodo: string;
      items: CertificadoItemForm[];
      observaciones?: string;
      tipo?: TipoCertificado;
      anticipo_porcentaje?: number;
      incluir_iva?: boolean;
      numero?: string;
      fecha_certificado?: string;
    }) => {
      if (!obraId) throw new Error("No obra selected");

      // Use custom numero or auto-generate
      const numero = customNumero?.trim() || (() => {
        const count = certificados.filter((c) => c.obra_id === obraId).length;
        return `CERT-${String(count + 1).padStart(3, "0")}`;
      })();

      const { data, error } = await db.schema("api").rpc("save_certificate", {
        p_certificate: {
          obra_id: obraId,
          numero,
          periodo,
          observaciones: observaciones || null,
          tipo,
          anticipo_porcentaje,
          incluir_iva,
          ...(fecha_certificado ? { fecha_certificado } : {}),
        },
        p_items: items,
        p_id: null,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Certificado creado");
      queryClient.invalidateQueries({ queryKey: ["certificados", obraId] });
      queryClient.invalidateQueries({ queryKey: ["certificado_acumulados", obraId] });
    },
    onError: (e) => {
      console.error(e);
      toast.error("Error al crear certificado");
    },
  });

  const updateCertificadoEstado = useMutation({
    mutationFn: async ({
      id,
      estado,
      fecha_emision,
    }: {
      id: string;
      estado: EstadoCertificado;
      fecha_emision?: string;
    }) => {
      const updates: Record<string, unknown> = { estado };
      if (fecha_emision) updates.fecha_emision = fecha_emision;
      const { error } = await supabase
        .from("certificados")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Estado actualizado");
      queryClient.invalidateQueries({ queryKey: ["certificados", obraId] });
    },
    onError: () => toast.error("Error al actualizar estado"),
  });

  const updateCertificado = useMutation({
    mutationFn: async ({
      id,
      periodo,
      items,
      observaciones,
      tipo,
      anticipo_porcentaje,
      numero,
      incluir_iva,
      fecha_certificado,
    }: {
      id: string;
      periodo: string;
      items: CertificadoItemForm[];
      observaciones?: string;
      tipo?: TipoCertificado;
      anticipo_porcentaje?: number;
      numero?: string;
      incluir_iva?: boolean;
      fecha_certificado?: string;
    }) => {
      if (!obraId) throw new Error("No obra selected");
      const { error } = await db.schema("api").rpc("save_certificate", {
        p_certificate: {
          obra_id: obraId,
          periodo,
          observaciones: observaciones || null,
          tipo,
          anticipo_porcentaje,
          numero,
          incluir_iva,
          fecha_certificado,
        },
        p_items: items,
        p_id: id,
      });
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      toast.success("Certificado actualizado");
      queryClient.invalidateQueries({ queryKey: ["certificados", obraId] });
      queryClient.invalidateQueries({ queryKey: ["certificado_items", vars.id] });
      queryClient.invalidateQueries({ queryKey: ["certificado_acumulados", obraId] });
    },
    onError: (e) => {
      console.error(e);
      toast.error("Error al actualizar certificado");
    },
  });

  const deleteCertificado = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("certificados")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, id) => {
      toast.success("Certificado eliminado");
      queryClient.invalidateQueries({ queryKey: ["certificados", obraId] });
      queryClient.invalidateQueries({ queryKey: ["certificado_items", id] });
      queryClient.invalidateQueries({ queryKey: ["certificado_acumulados", obraId] });
    },
    onError: () => toast.error("Error al eliminar certificado"),
  });

  // ---- Reorder etapas by updating orden on conceptos ----
  const reorderEtapas = async (etapaOrder: { etapa: string; orden: number }[]) => {
    if (!obraId) return;
    // For each etapa, update all conceptos belonging to it with the new base orden
    const updates = etapaOrder.flatMap(({ etapa, orden }) => {
      return conceptos
        .filter((c) => (c.etapa || "Sin etapa") === etapa)
        .map((c, idx) => ({
          id: c.id,
          orden: orden * 1000 + idx, // multiply to leave room for intra-etapa ordering
        }));
    });

    for (const { id, orden } of updates) {
      const { error } = await supabase
        .from("certificado_conceptos")
        .update({ orden })
        .eq("id", id);
      if (error) throw error;
    }

    toast.success("Orden de etapas actualizado");
    queryClient.invalidateQueries({ queryKey: ["certificado_conceptos", obraId] });
  };

  // ---- Pagos per obra (all certificados) ----
  const allPagos = useMemo(
    () => certificados.flatMap((certificado) => {
      const pagos = (certificado as Certificado & { pagos?: CertificadoPago[] }).pagos ?? [];
      return pagos;
    }).sort((a, b) => b.fecha.localeCompare(a.fecha)),
    [certificados],
  );
  const loadingPagos = loadingCertificados;

  const fetchPagos = (certificadoId: string): Promise<CertificadoPago[]> =>
    queryClient.fetchQuery({
      queryKey: ["certificado_pagos_cert", certificadoId],
      queryFn: async () => {
        const { data, error } = await supabase
          .from("certificado_pagos")
          .select("*")
          .eq("certificado_id", certificadoId)
          .order("fecha", { ascending: true });
        if (error) throw error;
        return data as CertificadoPago[];
      },
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
    });

  // Storage de comprobantes queda diferido: el flujo principal no depende de archivos.
  const uploadComprobante = async (_file: File, _certId: string): Promise<string> => {
    throw new Error("Los comprobantes adjuntos todavía no están habilitados en v2");
  };

  const getComprobanteSignedUrl = async (_path: string): Promise<string | null> => null;

  // ---- Helper: auto-update certificado.estado based on pagos ----
  const syncCertificadoEstado = async (certificadoId: string) => {
    const { data: cert } = await supabase
      .from("certificados")
      .select("id, total, estado, fecha_emision")
      .eq("id", certificadoId)
      .single();
    if (!cert) return;
    const { data: pagos } = await supabase
      .from("certificado_pagos")
      .select("monto")
      .eq("certificado_id", certificadoId);
    const totalPagado = (pagos || []).reduce((s, p) => s + Number(p.monto), 0);
    const updates: Record<string, unknown> = {};
    if (totalPagado >= Number(cert.total) && cert.total > 0) {
      if (cert.estado !== "cobrado") updates.estado = "cobrado";
      if (!cert.fecha_emision) updates.fecha_emision = new Date().toISOString().slice(0, 10);
    } else if (totalPagado > 0 && cert.estado === "borrador") {
      updates.estado = "emitido";
      if (!cert.fecha_emision) updates.fecha_emision = new Date().toISOString().slice(0, 10);
    } else if (totalPagado < Number(cert.total) && cert.estado === "cobrado") {
      updates.estado = "emitido";
    }
    if (Object.keys(updates).length > 0) {
      await supabase.from("certificados").update(updates).eq("id", certificadoId);
    }
  };

  type PagoInput = {
    certificado_id: string;
    fecha: string;
    monto: number;
    descripcion?: string | null;
    metodo?: MetodoPago | null;
    referencia?: string | null;
    banco?: string | null;
    comprobante?: File | null;
  };

  const createPago = useMutation({
    mutationFn: async (pago: PagoInput) => {
      // Validate: pago + already paid must not exceed total
      const { data: cert } = await supabase
        .from("certificados")
        .select("total")
        .eq("id", pago.certificado_id)
        .single();
      const { data: existing } = await supabase
        .from("certificado_pagos")
        .select("monto")
        .eq("certificado_id", pago.certificado_id);
      const yaPagado = (existing || []).reduce((s, p) => s + Number(p.monto), 0);
      if (cert && yaPagado + Number(pago.monto) > Number(cert.total) + 0.01) {
        throw new Error(`El pago excede el saldo pendiente (${(Number(cert.total) - yaPagado).toFixed(2)})`);
      }

      let comprobante_url: string | null = null;
      if (pago.comprobante) {
        comprobante_url = await uploadComprobante(pago.comprobante, pago.certificado_id);
      }

      if (!companyId) throw new Error("No hay empresa activa");
      const { data, error } = await db
        .from("certificado_pagos")
        .insert([{
          company_id: companyId,
          certificado_id: pago.certificado_id,
          fecha: pago.fecha,
          monto: pago.monto,
          descripcion: pago.descripcion || null,
          metodo: pago.metodo || null,
          referencia: pago.referencia || null,
          banco: pago.banco || null,
          comprobante_url,
        }])
        .select()
        .single();
      if (error) throw error;
      await syncCertificadoEstado(pago.certificado_id);
      return data;
    },
    onSuccess: (_, vars) => {
      toast.success("Pago registrado");
      queryClient.invalidateQueries({ queryKey: ["certificado_pagos", obraId] });
      queryClient.invalidateQueries({ queryKey: ["certificado_pagos_cert", vars.certificado_id] });
      queryClient.invalidateQueries({ queryKey: ["certificados", obraId] });
    },
    onError: (e: any) => toast.error(e?.message || "Error al registrar pago"),
  });

  const updatePago = useMutation({
    mutationFn: async ({ id, certificado_id, ...pago }: PagoInput & { id: string }) => {
      let comprobante_url: string | undefined;
      if (pago.comprobante) {
        comprobante_url = await uploadComprobante(pago.comprobante, certificado_id);
      }
      const updates: Record<string, unknown> = {
        fecha: pago.fecha,
        monto: pago.monto,
        descripcion: pago.descripcion || null,
        metodo: pago.metodo || null,
        referencia: pago.referencia || null,
        banco: pago.banco || null,
      };
      if (comprobante_url !== undefined) updates.comprobante_url = comprobante_url;
      const { error } = await supabase
        .from("certificado_pagos")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
      await syncCertificadoEstado(certificado_id);
    },
    onSuccess: (_, vars) => {
      toast.success("Pago actualizado");
      queryClient.invalidateQueries({ queryKey: ["certificado_pagos", obraId] });
      queryClient.invalidateQueries({ queryKey: ["certificado_pagos_cert", vars.certificado_id] });
      queryClient.invalidateQueries({ queryKey: ["certificados", obraId] });
    },
    onError: (e: any) => toast.error(e?.message || "Error al actualizar pago"),
  });

  const deletePago = useMutation({
    mutationFn: async ({ id, certificado_id }: { id: string; certificado_id: string }) => {
      const { error } = await supabase
        .from("certificado_pagos")
        .delete()
        .eq("id", id);
      if (error) throw error;
      await syncCertificadoEstado(certificado_id);
    },
    onSuccess: (_, vars) => {
      toast.success("Pago eliminado");
      queryClient.invalidateQueries({ queryKey: ["certificado_pagos", obraId] });
      queryClient.invalidateQueries({ queryKey: ["certificado_pagos_cert", vars.certificado_id] });
      queryClient.invalidateQueries({ queryKey: ["certificados", obraId] });
    },
    onError: () => toast.error("Error al eliminar pago"),
  });

  // Helper: total pagado por certificado
  const getPagadoByCert = (certId: string) =>
    allPagos.filter((p) => p.certificado_id === certId).reduce((s, p) => s + p.monto, 0);

  // Bulk import conceptos
  const bulkInsertConceptos = useMutation({
    mutationFn: async (rows: ConceptoForm[]) => {
      if (!obraId) throw new Error("No obra selected");
      if (!companyId) throw new Error("No hay empresa activa");
      const payload = rows.map((r, i) => ({
        ...r,
        company_id: companyId,
        obra_id: obraId,
        orden: (r.orden ?? conceptos.length) + i,
      }));
      const { error } = await supabase.from("certificado_conceptos").insert(payload);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      toast.success(`${vars.length} conceptos importados`);
      queryClient.invalidateQueries({ queryKey: ["certificado_conceptos", obraId] });
    },
    onError: (e: any) => {
      console.error(e);
      toast.error("Error al importar conceptos");
    },
  });

  // Bulk update price by % on a list of concepto ids
  const bulkAdjustPrices = useMutation({
    mutationFn: async ({ ids, percent }: { ids: string[]; percent: number }) => {
      const factor = 1 + percent / 100;
      const targets = conceptos.filter((c) => ids.includes(c.id));
      for (const c of targets) {
        const newPrice = Math.round(c.precio_unitario * factor * 100) / 100;
        const { error } = await supabase
          .from("certificado_conceptos")
          .update({ precio_unitario: newPrice })
          .eq("id", c.id);
        if (error) throw error;
      }
    },
    onSuccess: (_, vars) => {
      toast.success(`${vars.ids.length} precios ajustados`);
      queryClient.invalidateQueries({ queryKey: ["certificado_conceptos", obraId] });
    },
    onError: () => toast.error("Error al ajustar precios"),
  });

  return {
    conceptos,
    loadingConceptos,
    certificados,
    loadingCertificados,
    fetchItems,
    fetchAcumuladosCached,
    createConcepto: createConcepto.mutateAsync,
    updateConcepto: updateConcepto.mutateAsync,
    deleteConcepto: deleteConcepto.mutateAsync,
    createCertificado: createCertificado.mutateAsync,
    updateCertificado: updateCertificado.mutateAsync,
    updateCertificadoEstado: updateCertificadoEstado.mutateAsync,
    deleteCertificado: deleteCertificado.mutateAsync,
    reorderEtapas,
    allPagos,
    loadingPagos,
    fetchPagos,
    createPago: createPago.mutateAsync,
    updatePago: updatePago.mutateAsync,
    deletePago: deletePago.mutateAsync,
    getComprobanteSignedUrl,
    getPagadoByCert,
    bulkInsertConceptos: bulkInsertConceptos.mutateAsync,
    bulkAdjustPrices: bulkAdjustPrices.mutateAsync,
  };
}
