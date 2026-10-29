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
  numero: number | null;
  fecha: string;
  descripcion: string;
  origen: string | null;
  total_debe: number;
  total_haber: number;
  created_at: string;
  status: "draft" | "posted" | "reversed";
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
      const { data, error } = await (supabase as any).from("contab_empresa").select("*").limit(1);
      if (error) throw error;
      return (data?.[0] ?? null) as ContabEmpresa | null;
    },
  });

export const useSaveContabEmpresa = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (e: Partial<ContabEmpresa>) => {
      const { error } = await (supabase as any).schema("api").rpc("save_accounting_company", { p_data: e });
      if (error) throw error;
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
      const { error } = await (supabase as any).schema("api").rpc("save_accounting_account", { p_data: c });
      if (error) throw error;
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
      const { error } = await (supabase as any).schema("api").rpc("deactivate_accounting_account", { p_id: id });
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
      const { data, error } = await (supabase as any).schema("api").rpc("save_accounting_party", { p_data: t });
      if (error) throw error;
      return data as string;
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
      const { error } = await (supabase as any).schema("api").rpc("deactivate_accounting_party", { p_id: id });
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
        .select("*")
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
      const { data, error } = await (supabase as any).schema("api").rpc("save_accounting_document", { p_document: params.cbte, p_lines: params.items });
      if (error) throw error;
      return data as string;
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
      const { data: row, error: readError } = await (supabase as any).from("contab_comprobantes").select("es_venta").eq("id", cbteId).single();
      if (readError) throw readError;
      const { data, error } = await (supabase as any).schema("api").rpc("post_accounting_document", { p_document_id: cbteId, p_sale: row.es_venta });
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
      const { data: row, error: readError } = await (supabase as any).from("contab_comprobantes").select("es_venta").eq("id", cbteId).single();
      if (readError) throw readError;
      const { error } = await (supabase as any).schema("api").rpc("reverse_accounting_document", { p_document_id: cbteId, p_sale: row.es_venta, p_reason: "Anulacion solicitada desde Contabilidad" });
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
      const { data: row, error: readError } = await (supabase as any).from("contab_comprobantes").select("es_venta").eq("id", cbteId).single();
      if (readError) throw readError;
      const { error } = await (supabase as any).schema("api").rpc("delete_accounting_draft", { p_document_id: cbteId, p_sale: row.es_venta });
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
        .select("*")
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
    mutationFn: async (p: Partial<ContabPago> & { treasury_account_id?: string | null; allocations?: { document_id: string; amount: number }[] }) => {
      const { allocations = [], ...transaction } = p;
      const { data, error } = await (supabase as any).schema("api").rpc("record_treasury_settlement", {
        p_data: transaction,
        p_allocations: allocations,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contab_pagos"] });
      qc.invalidateQueries({ queryKey: ["contab_comprobantes"] });
      qc.invalidateQueries({ queryKey: ["contab_asientos"] });
      qc.invalidateQueries({ queryKey: ["accounting_open_items"] });
      qc.invalidateQueries({ queryKey: ["accounting_summary"] });
      qc.invalidateQueries({ queryKey: ["treasury_balances"] });
      toast.success("Movimiento registrado");
    },
    onError: (e: any) => toast.error(e.message),
  });
};

export const useDeletePago = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).schema("api").rpc("reverse_treasury_transaction", { p_transaction_id: id, p_reason: "Reversion solicitada desde Contabilidad" });
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
        .select("*")
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
        .select("*")
        .eq("es_venta", esVenta)
        .neq("estado", "anulado")
        .neq("estado", "borrador")
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
        .from("contab_mayor_lineas")
        .select("*")
        .eq("cuenta_id", cuentaId)
        .gte("asiento_fecha", desde)
        .lte("asiento_fecha", hasta);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

export const useSaveJournal = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ entry, lines }: { entry: Record<string, unknown>; lines: Record<string, unknown>[] }) => {
      const { data, error } = await (supabase as any).schema("api").rpc("save_journal_draft", { p_entry: entry, p_lines: lines });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["contab_asientos"] }); toast.success("Asiento borrador guardado"); },
    onError: (e: any) => toast.error(e.message),
  });
};

export const usePostJournal = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => { const { error } = await (supabase as any).schema("api").rpc("post_journal_entry", { p_entry_id: id }); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["contab_asientos"] }); toast.success("Asiento confirmado"); },
    onError: (e: any) => toast.error(e.message),
  });
};

export const useReverseJournal = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => { const { error } = await (supabase as any).schema("api").rpc("reverse_journal_entry", { p_entry_id: id, p_reason: reason }); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["contab_asientos"] }); toast.success("Asiento revertido"); },
    onError: (e: any) => toast.error(e.message),
  });
};

export type AccountingDimensionRow = {
  month: string;
  account_code: string;
  account_name: string;
  account_type: "asset" | "liability" | "equity" | "revenue" | "cost" | "expense";
  obra_id: string | null;
  obra_name: string | null;
  maquinaria_id: string | null;
  maquinaria_name: string | null;
  debit: number;
  credit: number;
  net: number;
};

export const useAccountingDimensionReport = (
  from: string,
  to: string,
  obraId: string | null = null,
  maquinariaId: string | null = null,
) => useQuery({
  queryKey: ["accounting_dimension_report", from, to, obraId, maquinariaId],
  queryFn: async () => {
    const { data, error } = await (supabase as any).schema("api").rpc("accounting_dimension_report", {
      p_from: from,
      p_to: to,
      p_obra_id: obraId,
      p_maquinaria_id: maquinariaId,
    });
    if (error) throw error;
    return (data ?? []) as AccountingDimensionRow[];
  },
});

export type AccountingSummary = {
  cash: number; banks: number; receivables: number; payables: number;
  vat_debit: number; vat_credit: number; vat_position: number;
  income: number; costs: number; result: number;
  receivables_upcoming: number; payables_upcoming: number;
  receivables_overdue: number; payables_overdue: number;
};

export type AccountingOpenItem = {
  document_id: string; party_id: string; party_name: string; source_type: string;
  source_id: string; document_kind: "charge" | "credit"; issue_date: string;
  due_date: string | null; original_amount: number; applied_amount: number;
  balance: number; status: string; days_overdue: number;
};

export type TreasuryBalance = {
  account_id: string; name: string; account_type: "cash" | "bank";
  bank_name: string | null; account_number: string | null; currency: string;
  is_active: boolean; balance: number;
};

export const useAccountingSummary = (from: string, to: string, asOf: string) =>
  useQuery({
    queryKey: ["accounting_summary", from, to, asOf],
    queryFn: async () => {
      const { data, error } = await (supabase as any).schema("api").rpc("accounting_summary", { p_from: from, p_to: to, p_as_of: asOf });
      if (error) throw error;
      return data as AccountingSummary;
    },
  });

export const useAccountingOpenItems = (kind: "payable" | "receivable", partyId: string | null = null, asOf = new Date().toISOString().slice(0, 10)) =>
  useQuery({
    queryKey: ["accounting_open_items", kind, partyId, asOf],
    queryFn: async () => {
      const { data, error } = await (supabase as any).schema("api").rpc("accounting_open_items", { p_kind: kind, p_party_id: partyId, p_as_of: asOf });
      if (error) throw error;
      return (data ?? []) as AccountingOpenItem[];
    },
  });

export const useTreasuryBalances = (asOf = new Date().toISOString().slice(0, 10)) =>
  useQuery({
    queryKey: ["treasury_balances", asOf],
    queryFn: async () => {
      const { data, error } = await (supabase as any).schema("api").rpc("treasury_balances", { p_as_of: asOf });
      if (error) throw error;
      return (data ?? []) as TreasuryBalance[];
    },
  });

export const useTrialBalance = (from: string, to: string) =>
  useQuery({
    queryKey: ["accounting_trial_balance", from, to],
    queryFn: async () => {
      const { data, error } = await (supabase as any).schema("api").rpc("accounting_trial_balance", { p_from: from, p_to: to });
      if (error) throw error;
      return (data ?? []) as Array<{ account_id: string; code: string; name: string; account_type: string; total_debit: number; total_credit: number; balance: number }>;
    },
  });

export const useAccountingLedger = (accountId: string | null, from: string, to: string) =>
  useQuery({
    queryKey: ["accounting_ledger", accountId, from, to],
    enabled: !!accountId,
    queryFn: async () => {
      const { data, error } = await (supabase as any).schema("api").rpc("accounting_ledger", { p_account_id: accountId, p_from: from, p_to: to });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

export const useVatPosition = (year: number, month: number) =>
  useQuery({
    queryKey: ["accounting_vat_position", year, month],
    queryFn: async () => {
      const { data, error } = await (supabase as any).schema("api").rpc("accounting_vat_position", { p_year: year, p_month: month });
      if (error) throw error;
      return data as { sales: any[]; purchases: any[]; vat_debit: number; vat_credit: number; position: number };
    },
  });

export const usePartyStatement = (kind: "payable" | "receivable", partyId: string | null, from: string, to: string) =>
  useQuery({
    queryKey: ["accounting_party_statement", kind, partyId, from, to],
    enabled: !!partyId,
    queryFn: async () => {
      const { data, error } = await (supabase as any).schema("api").rpc("accounting_party_statement", { p_kind: kind, p_party_id: partyId, p_from: from, p_to: to });
      if (error) throw error;
      return data ?? [];
    },
  });

export const useCreateInvoiceFromCertificate = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (certificateId: string) => {
      const { data, error } = await (supabase as any).schema("api").rpc("create_customer_invoice_from_certificate", { p_certificate_id: certificateId });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contab_comprobantes"] });
      toast.success("Factura borrador creada desde el certificado");
    },
    onError: (e: any) => toast.error(e.message),
  });
};

export const useSaveTreasuryAccount = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const { data, error } = await (supabase as any).schema("api").rpc("save_treasury_account", { p_data: payload });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["treasury_balances"] }),
    onError: (e: any) => toast.error(e.message),
  });
};

export const useTreasuryTransfer = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { from: string; to: string; date: string; amount: number; reference?: string }) => {
      const { data, error } = await (supabase as any).schema("api").rpc("record_treasury_transfer", { p_from_account: payload.from, p_to_account: payload.to, p_date: payload.date, p_amount: payload.amount, p_reference: payload.reference || null });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["treasury_balances"] }); qc.invalidateQueries({ queryKey: ["contab_pagos"] }); toast.success("Transferencia registrada"); },
    onError: (e: any) => toast.error(e.message),
  });
};

export const useSetAccountingPeriod = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ year, month, status }: { year: number; month: number; status: "open" | "closed" }) => {
      const { error } = await (supabase as any).schema("api").rpc("set_accounting_period", { p_year: year, p_month: month, p_status: status });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["accounting_periods"] }); toast.success("Período actualizado"); },
    onError: (e: any) => toast.error(e.message),
  });
};

export const useAccountingPeriods = () => useQuery({
  queryKey: ["accounting_periods"],
  queryFn: async () => {
    const { data, error } = await (supabase as any).from("accounting_periods").select("id,year,month,status,closed_at,reopened_at").order("year", { ascending: false }).order("month", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },
});
