import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface AvanceConcepto {
  id: string;
  nombre: string;
  unidad: string;
  categoria: string;
  precioUnitario: number;
  cantidadTotal: number;
  cantidadCertificada: number;
  montoCertificado: number;
  avance: number; // 0-100
  sinPlan: boolean; // no tiene cantidad total cargada
}

export interface AvanceCategoria {
  categoria: string;
  avance: number;
  montoContratado: number;
  montoCertificado: number;
  conceptos: AvanceConcepto[];
}

export interface CertificadoResumen {
  id: string;
  numero: string;
  periodo: string | null;
  fecha: string | null;
  estado: string;
  total: number;
  pagado: number;
  saldo: number;
}

export interface MesCobro {
  mes: string; // yyyy-MM
  label: string;
  certificado: number;
  cobrado: number;
}

export interface AvanceObra {
  conceptos: AvanceConcepto[];
  categorias: AvanceCategoria[];
  avanceGeneral: number;
  montoContratado: number;
  montoCertificado: number;
  certificados: CertificadoResumen[];
  totalCertificado: number;
  totalCobrado: number;
  saldoPendiente: number;
  porcentajeCobrado: number;
  serieMensual: MesCobro[];
}

const num = (v: unknown) => (typeof v === "number" ? v : Number(v) || 0);

const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const labelMes = (ym: string) => {
  const [a, m] = ym.split("-");
  return `${MESES[Number(m) - 1] || m} ${a.slice(2)}`;
};

const vacio: AvanceObra = {
  conceptos: [],
  categorias: [],
  avanceGeneral: 0,
  montoContratado: 0,
  montoCertificado: 0,
  certificados: [],
  totalCertificado: 0,
  totalCobrado: 0,
  saldoPendiente: 0,
  porcentajeCobrado: 0,
  serieMensual: [],
};

async function fetchAvance(obraId: string): Promise<AvanceObra> {
  const [conceptosRes, certRes] = await Promise.all([
    supabase
      .from("certificado_conceptos")
      .select("id, nombre, unidad, categoria, precio_unitario, cantidad_total, activo, orden")
      .eq("obra_id", obraId)
      .order("orden"),
    supabase
      .from("certificados")
      .select("id, numero, periodo, estado, total, fecha_certificado, fecha_emision")
      .eq("obra_id", obraId)
      .order("fecha_emision"),
  ]);

  const conceptosDb = (conceptosRes.data || []) as any[];
  const certs = (certRes.data || []) as any[];
  const certIds = certs.map((c) => c.id);

  let items: any[] = [];
  let pagos: any[] = [];
  if (certIds.length > 0) {
    const [itemsRes, pagosRes] = await Promise.all([
      supabase
        .from("certificado_items")
        .select("certificado_id, concepto_id, descripcion, unidad, cantidad, subtotal, precio_unitario")
        .in("certificado_id", certIds),
      supabase.from("certificado_pagos").select("certificado_id, fecha, monto").in("certificado_id", certIds),
    ]);
    items = (itemsRes.data || []) as any[];
    pagos = (pagosRes.data || []) as any[];
  }

  // Avance por concepto del plan
  const conceptos: AvanceConcepto[] = conceptosDb.map((c) => {
    const propios = items.filter((i) => i.concepto_id === c.id);
    const cantidadCertificada = propios.reduce((s, i) => s + num(i.cantidad), 0);
    const montoCertificado = propios.reduce((s, i) => s + num(i.subtotal), 0);
    const cantidadTotal = num(c.cantidad_total);
    return {
      id: c.id,
      nombre: c.nombre,
      unidad: c.unidad || "",
      categoria: c.categoria || "General",
      precioUnitario: num(c.precio_unitario),
      cantidadTotal,
      cantidadCertificada,
      montoCertificado,
      avance: cantidadTotal > 0 ? Math.min(100, (cantidadCertificada / cantidadTotal) * 100) : 0,
      sinPlan: cantidadTotal <= 0,
    };
  });

  // Ítems certificados que no están asociados a un concepto del plan
  const sueltos: Record<string, AvanceConcepto> = {};
  items
    .filter((i) => !i.concepto_id)
    .forEach((i) => {
      const key = (i.descripcion || "Sin descripción").trim().toLowerCase();
      if (!sueltos[key]) {
        sueltos[key] = {
          id: `libre-${key}`,
          nombre: (i.descripcion || "Sin descripción").trim(),
          unidad: i.unidad || "",
          categoria: "Sin plan de obra",
          precioUnitario: num(i.precio_unitario),
          cantidadTotal: 0,
          cantidadCertificada: 0,
          montoCertificado: 0,
          avance: 0,
          sinPlan: true,
        };
      }
      sueltos[key].cantidadCertificada += num(i.cantidad);
      sueltos[key].montoCertificado += num(i.subtotal);
    });

  const todos = [...conceptos, ...Object.values(sueltos)];

  // Agrupación por categoría
  const mapCat: Record<string, AvanceConcepto[]> = {};
  todos.forEach((c) => {
    (mapCat[c.categoria] ||= []).push(c);
  });
  const categorias: AvanceCategoria[] = Object.entries(mapCat).map(([categoria, lista]) => {
    const contratado = lista.reduce((s, c) => s + c.cantidadTotal * c.precioUnitario, 0);
    const certificado = lista.reduce(
      (s, c) => s + Math.min(c.montoCertificado, c.cantidadTotal * c.precioUnitario || c.montoCertificado),
      0
    );
    return {
      categoria,
      conceptos: lista,
      montoContratado: contratado,
      montoCertificado: lista.reduce((s, c) => s + c.montoCertificado, 0),
      avance: contratado > 0 ? Math.min(100, (certificado / contratado) * 100) : 0,
    };
  });

  const montoContratado = todos.reduce((s, c) => s + c.cantidadTotal * c.precioUnitario, 0);
  const avanceBase = todos.reduce(
    (s, c) => s + Math.min(c.cantidadCertificada, c.cantidadTotal) * c.precioUnitario,
    0
  );
  const montoCertificado = todos.reduce((s, c) => s + c.montoCertificado, 0);
  const avanceGeneral = montoContratado > 0 ? Math.min(100, (avanceBase / montoContratado) * 100) : 0;

  // Certificados con sus pagos
  const pagosPorCert: Record<string, number> = {};
  pagos.forEach((p) => {
    pagosPorCert[p.certificado_id] = (pagosPorCert[p.certificado_id] || 0) + num(p.monto);
  });

  const certificados: CertificadoResumen[] = certs.map((c) => {
    const total = num(c.total);
    const pagado = pagosPorCert[c.id] || 0;
    return {
      id: c.id,
      numero: c.numero,
      periodo: c.periodo,
      fecha: c.fecha_certificado || c.fecha_emision,
      estado: c.estado,
      total,
      pagado,
      saldo: total - pagado,
    };
  });

  // Serie mensual: certificado vs cobrado
  const meses: Record<string, MesCobro> = {};
  const tocar = (ym: string) => (meses[ym] ||= { mes: ym, label: labelMes(ym), certificado: 0, cobrado: 0 });
  certs.forEach((c) => {
    const f = (c.fecha_certificado || c.fecha_emision || "").slice(0, 7);
    if (f) tocar(f).certificado += num(c.total);
  });
  pagos.forEach((p) => {
    const f = (p.fecha || "").slice(0, 7);
    if (f) tocar(f).cobrado += num(p.monto);
  });
  const serieMensual = Object.values(meses).sort((a, b) => a.mes.localeCompare(b.mes));

  const totalCertificado = certificados.reduce((s, c) => s + c.total, 0);
  const totalCobrado = certificados.reduce((s, c) => s + c.pagado, 0);

  return {
    conceptos: todos,
    categorias,
    avanceGeneral,
    montoContratado,
    montoCertificado,
    certificados,
    totalCertificado,
    totalCobrado,
    saldoPendiente: totalCertificado - totalCobrado,
    porcentajeCobrado: totalCertificado > 0 ? (totalCobrado / totalCertificado) * 100 : 0,
    serieMensual,
  };
}

export function useAvanceObra(obraId?: string) {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["avance-obra", obraId],
    queryFn: () => fetchAvance(obraId!),
    enabled: !!obraId,
    staleTime: 5 * 60 * 1000,
  });

  const setCantidadTotal = useMutation({
    mutationFn: async ({ conceptoId, cantidad }: { conceptoId: string; cantidad: number }) => {
      const { error } = await supabase
        .from("certificado_conceptos")
        .update({ cantidad_total: cantidad })
        .eq("id", conceptoId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["avance-obra", obraId] });
      qc.invalidateQueries({ queryKey: ["certificado-conceptos"] });
      toast.success("Cantidad total actualizada");
    },
    onError: (e: any) => toast.error(e.message || "No se pudo guardar"),
  });

  return { avance: data || vacio, loading: isLoading, setCantidadTotal };
}
