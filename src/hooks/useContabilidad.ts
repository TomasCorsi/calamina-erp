import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// ============== TYPES ==============
export type CbteTipo =
  | "FA_A" | "FA_B" | "FA_C"
  | "NC_A" | "NC_B" | "NC_C"
  | "ND_A" | "ND_B" | "ND_C"
  | "RECIBO" | "TICKET"
  | "FA_CPA_A" | "FA_CPA_B" | "FA_CPA_C" | "NC_CPA" | "ND_CPA" | "OTRO";

export type CbteEstado = "borrador" | "confirmado" | "anulado" | "pagado" | "parcial";
export type CondIva = "RI" | "MT" | "EX" | "CF" | "NR";
export type CuentaTipo = "activo" | "pasivo" | "patrimonio" | "ingreso" | "egreso" | "resultado";
export type TerceroTipo = "cliente" | "proveedor" | "ambos";
export type PagoMedio = "efectivo" | "transferencia" | "cheque" | "tarjeta" | "deposito" | "otro";

export interface ContabEmpresa {
  id: string;
  cuit: string;
  razon_social: string;
  nombre_fantasia: string | null;
  condicion_iva: CondIva;
  iibb: string | null;
  inicio_actividades: string | null;
  domicilio_fiscal: string | null;
  localidad: string | null;
  provincia: string | null;
  cp: string | null;
  telefono: string | null;
  email: string | null;
  logo_url: string | null;
  pie_factura: string | null;
  activa: boolean;
}

export interface ContabCuenta {
  id: string;
  codigo: string;
  nombre: string;
  tipo: CuentaTipo;
  parent_id: string | null;
  imputable: boolean;
  activa: boolean;
}

export interface ContabTercero {
  id: string;
  tipo: TerceroTipo;
  cuit: string | null;
  razon_social: string;
  condicion_iva: CondIva;
  domicilio: string | null;
  localidad: string | null;
  provincia: string | null;
  cp: string | null;
  telefono: string | null;
  email: string | null;
  cbu: string | null;
  banco: string | null;
  numero_cuenta: string | null;
  notas: string | null;
  activo: boolean;
}

export interface ContabCbteItem {
  id: string;
  comprobante_id: string;
  orden: number;
  descripcion: string;
  cuenta_id: string | null;
  cantidad: number;
  precio_unit: number;
  neto: number;
  alicuota_iva: number;
  iva: number;
  obra_id: string | null;
  maquinaria_id: string | null;
}

export interface ContabComprobante {
  id: string;
  empresa_id: string | null;
  tipo: CbteTipo;
  letra: string | null;
  punto_venta: number;
  numero: number;
  fecha: string;
  fecha_vto: string | null;
  tercero_id: string | null;
  neto_21: number; iva_21: number;
  neto_105: number; iva_105: number;
  neto_27: number; iva_27: number;
  neto_0: number;
  exento: number;
  no_gravado: number;
  perc_iva: number;
  perc_iibb: number;
  perc_otras: number;
  total: number;
  moneda: string;
  cotizacion: number;
  obra_id: string | null;
  maquinaria_id: string | null;
  estado: CbteEstado;
  es_venta: boolean;
  observaciones: string | null;
  asiento_id: string | null;
  confirmado_at: string | null;
  created_at: string;
  tercero?: { razon_social: string; cuit: string | null } | null;
  obra?: { nombre: string } | null;
  maquinaria?: { nombre: string | null; codigo: string | null } | null;
}

export interface ContabPago {
  id: string;
  comprobante_id: string | null;
  tercero_id: string | null;
  es_cobro: boolean;
  fecha: string;
  medio: PagoMedio;
  monto: number;
  cuenta_id: string | null;
  referencia: string | null;
  observaciones: string | null;
  obra_id: string | null;
  maquinaria_id: string | null;
  asiento_id: string | null;
  tercero?: { razon_social: string } | null;
  comprobante?: { tipo: CbteTipo; punto_venta: number; numero: number } | null;
}

export interface ContabAsiento {
  id: string;
  numero: number;
  fecha: string;
  descripcion: string;
  origen: string | null;
  total_debe: number;
  total_haber: number;
  created_at: string;
}

export interface ContabAsientoLinea {
  id: string;
  asiento_id: string;
  orden: number;
  cuenta_id: string | null;
  descripcion: string | null;
  debe: number;
  haber: number;
  obra_id: string | null;
  maquinaria_id: string | null;
  cuenta?: { codigo: string; nombre: string } | null;
  obra?: { nombre: string } | null;
  maquinaria?: { nombre: string | null; codigo: string | null } | null;
}

// ============== EMPRESA ==============
export const useContabEmpresa = () =>
  useQuery({
    queryKey: ["contab_empresa"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("contab_empresa").select("*").order("created_at").limit(1);
      if (error) throw error;
      return (data?.[0] ?? null) as ContabEmpresa | null;
    },
  });

export const useSaveContabEmpresa = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (e: Partial<ContabEmpresa>) => {
      const payload = { ...e };
      if (payload.id) {
        const { error } = await (supabase as any).from("contab_empresa").update(payload).eq("id", payload.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from("contab_empresa").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contab_empresa"] });
      toast.success("Empresa guardada");
    },
    onError: (e: any) => toast.error(e.message),
  });
};

// ============== PLAN DE CUENTAS ==============
export const useContabPlanCuentas = () =>
  useQuery({
    queryKey: ["contab_plan_cuentas"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("contab_plan_cuentas").select("*").order("codigo");
      if (error) throw error;
      return (data ?? []) as ContabCuenta[];
    },
  });

export const useSaveCuenta = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (c: Partial<ContabCuenta>) => {
      if (c.id) {
        const { error } = await (supabase as any).from("contab_plan_cuentas").update(c).eq("id", c.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from("contab_plan_cuentas").insert(c);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contab_plan_cuentas"] });
      toast.success("Cuenta guardada");
    },
    onError: (e: any) => toast.error(e.message),
  });
};

export const useDeleteCuenta = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("contab_plan_cuentas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contab_plan_cuentas"] });
      toast.success("Cuenta eliminada");
    },
    onError: (e: any) => toast.error(e.message),
  });
};

// ============== TERCEROS ==============
export const useContabTerceros = () =>
  useQuery({
    queryKey: ["contab_terceros"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("contab_terceros").select("*").order("razon_social");
      if (error) throw error;
      return (data ?? []) as ContabTercero[];
    },
  });

export const useSaveTercero = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (t: Partial<ContabTercero>) => {
      const payload: any = { ...t };
      ["cuit","domicilio","localidad","provincia","cp","telefono","email","cbu","banco","numero_cuenta","notas"].forEach((k) => {
        if (payload[k] === "") payload[k] = null;
      });
      if (payload.id) {
        const { error } = await (supabase as any).from("contab_terceros").update(payload).eq("id", payload.id);
        if (error) throw error;
        return payload.id as string;
      } else {
        const { data, error } = await (supabase as any).from("contab_terceros").insert(payload).select("id").single();
        if (error) throw error;
        return data.id as string;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contab_terceros"] });
      toast.success("Tercero guardado");
    },
    onError: (e: any) => toast.error(e.message),
  });
};

export const useDeleteTercero = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("contab_terceros").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contab_terceros"] });
      toast.success("Tercero eliminado");
    },
    onError: (e: any) => toast.error(e.message),
  });
};

// ============== COMPROBANTES ==============
export const useContabComprobantes = (filters?: { esVenta?: boolean; desde?: string; hasta?: string }) =>
  useQuery({
    queryKey: ["contab_comprobantes", filters],
    queryFn: async () => {
      let q = (supabase as any)
        .from("contab_comprobantes")
        .select("*, tercero:contab_terceros(razon_social,cuit), obra:obras(nombre), maquinaria:maquinarias(nombre,codigo)")
        .order("fecha", { ascending: false })
        .order("created_at", { ascending: false });
      if (filters?.esVenta !== undefined) q = q.eq("es_venta", filters.esVenta);
      if (filters?.desde) q = q.gte("fecha", filters.desde);
      if (filters?.hasta) q = q.lte("fecha", filters.hasta);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as ContabComprobante[];
    },
  });

export const useContabComprobanteItems = (cbteId: string | null) =>
  useQuery({
    queryKey: ["contab_cbte_items", cbteId],
    enabled: !!cbteId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("contab_comprobante_items")
        .select("*")
        .eq("comprobante_id", cbteId)
        .order("orden");
      if (error) throw error;
      return (data ?? []) as ContabCbteItem[];
    },
  });

export const useSaveComprobante = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { cbte: Partial<ContabComprobante>; items: Partial<ContabCbteItem>[] }) => {
      const { cbte, items } = params;
      const payload: any = { ...cbte };
      ["fecha_vto","tercero_id","obra_id","maquinaria_id","observaciones","empresa_id","letra"].forEach((k) => {
        if (payload[k] === "") payload[k] = null;
      });
      let id = payload.id;
      if (id) {
        const { error } = await (supabase as any).from("contab_comprobantes").update(payload).eq("id", id);
        if (error) throw error;
        await (supabase as any).from("contab_comprobante_items").delete().eq("comprobante_id", id);
      } else {
        const { data: ud } = await supabase.auth.getUser();
        payload.created_by = ud?.user?.id ?? null;
        const { data, error } = await (supabase as any).from("contab_comprobantes").insert(payload).select("id").single();
        if (error) throw error;
        id = data.id;
      }
      if (items.length > 0) {
        const rows = items.map((it, idx) => {
          const r: any = { ...it, comprobante_id: id, orden: idx + 1 };
          ["cuenta_id","obra_id","maquinaria_id"].forEach((k) => { if (r[k] === "") r[k] = null; });
          delete r.id;
          return r;
        });
        const { error } = await (supabase as any).from("contab_comprobante_items").insert(rows);
        if (error) throw error;
      }
      return id as string;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contab_comprobantes"] });
      qc.invalidateQueries({ queryKey: ["contab_cbte_items"] });
      toast.success("Comprobante guardado");
    },
    onError: (e: any) => toast.error(e.message),
  });
};

export const useConfirmarComprobante = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (cbteId: string) => {
      const { data, error } = await (supabase as any).rpc("contab_generar_asiento_cbte", { _cbte_id: cbteId });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contab_comprobantes"] });
      qc.invalidateQueries({ queryKey: ["contab_asientos"] });
      toast.success("Comprobante confirmado y asiento generado");
    },
    onError: (e: any) => toast.error(e.message),
  });
};

export const useAnularComprobante = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (cbteId: string) => {
      const { error } = await (supabase as any)
        .from("contab_comprobantes")
        .update({ estado: "anulado", anulado_at: new Date().toISOString() })
        .eq("id", cbteId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contab_comprobantes"] });
      toast.success("Comprobante anulado");
    },
    onError: (e: any) => toast.error(e.message),
  });
};

export const useDeleteComprobante = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (cbteId: string) => {
      const { error } = await (supabase as any).from("contab_comprobantes").delete().eq("id", cbteId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contab_comprobantes"] });
      toast.success("Comprobante eliminado");
    },
    onError: (e: any) => toast.error(e.message),
  });
};

// ============== PAGOS ==============
export const useContabPagos = (filters?: { esCobro?: boolean }) =>
  useQuery({
    queryKey: ["contab_pagos", filters],
    queryFn: async () => {
      let q = (supabase as any)
        .from("contab_pagos")
        .select("*, tercero:contab_terceros(razon_social), comprobante:contab_comprobantes(tipo,punto_venta,numero)")
        .order("fecha", { ascending: false });
      if (filters?.esCobro !== undefined) q = q.eq("es_cobro", filters.esCobro);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as ContabPago[];
    },
  });

export const useSavePago = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: Partial<ContabPago>) => {
      const payload: any = { ...p };
      ["comprobante_id","tercero_id","cuenta_id","referencia","observaciones","obra_id","maquinaria_id"].forEach((k) => {
        if (payload[k] === "") payload[k] = null;
      });
      const { data: ud } = await supabase.auth.getUser();
      let id = payload.id;
      if (!id) {
        payload.created_by = ud?.user?.id ?? null;
        const { data, error } = await (supabase as any).from("contab_pagos").insert(payload).select("id").single();
        if (error) throw error;
        id = data.id;
        // Generar asiento
        const { error: rpcErr } = await (supabase as any).rpc("contab_generar_asiento_pago", { _pago_id: id });
        if (rpcErr) throw rpcErr;
      } else {
        const { error } = await (supabase as any).from("contab_pagos").update(payload).eq("id", id);
        if (error) throw error;
      }
      return id as string;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contab_pagos"] });
      qc.invalidateQueries({ queryKey: ["contab_comprobantes"] });
      qc.invalidateQueries({ queryKey: ["contab_asientos"] });
      toast.success("Movimiento registrado");
    },
    onError: (e: any) => toast.error(e.message),
  });
};

export const useDeletePago = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("contab_pagos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contab_pagos"] });
      qc.invalidateQueries({ queryKey: ["contab_comprobantes"] });
      toast.success("Eliminado");
    },
    onError: (e: any) => toast.error(e.message),
  });
};

// ============== ASIENTOS ==============
export const useContabAsientos = () =>
  useQuery({
    queryKey: ["contab_asientos"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("contab_asientos")
        .select("*")
        .order("fecha", { ascending: false })
        .order("numero", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ContabAsiento[];
    },
  });

export const useContabAsientoLineas = (asientoId: string | null) =>
  useQuery({
    queryKey: ["contab_asiento_lineas", asientoId],
    enabled: !!asientoId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("contab_asiento_lineas")
        .select("*, cuenta:contab_plan_cuentas(codigo,nombre), obra:obras(nombre), maquinaria:maquinarias(nombre,codigo)")
        .eq("asiento_id", asientoId)
        .order("orden");
      if (error) throw error;
      return (data ?? []) as ContabAsientoLinea[];
    },
  });

// ============== REPORTES ==============
export const useIvaMes = (anio: number, mes: number, esVenta: boolean) =>
  useQuery({
    queryKey: ["contab_iva_mes", anio, mes, esVenta],
    queryFn: async () => {
      const desde = `${anio}-${String(mes).padStart(2, "0")}-01`;
      const hastaD = new Date(anio, mes, 0).getDate();
      const hasta = `${anio}-${String(mes).padStart(2, "0")}-${String(hastaD).padStart(2, "0")}`;
      const { data, error } = await (supabase as any)
        .from("contab_comprobantes")
        .select("*, tercero:contab_terceros(razon_social,cuit,condicion_iva)")
        .eq("es_venta", esVenta)
        .neq("estado", "anulado")
        .gte("fecha", desde)
        .lte("fecha", hasta)
        .order("fecha");
      if (error) throw error;
      return (data ?? []) as ContabComprobante[];
    },
  });

export const useMayorCuenta = (cuentaId: string | null, desde: string, hasta: string) =>
  useQuery({
    queryKey: ["contab_mayor", cuentaId, desde, hasta],
    enabled: !!cuentaId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("contab_asiento_lineas")
        .select("*, asiento:contab_asientos!inner(fecha,descripcion,numero), obra:obras(nombre), maquinaria:maquinarias(nombre,codigo)")
        .eq("cuenta_id", cuentaId)
        .gte("asiento.fecha", desde)
        .lte("asiento.fecha", hasta);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
