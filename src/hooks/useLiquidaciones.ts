import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabaseV2 as supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

export type LiquidacionPeriodo = "quincena_1" | "quincena_2" | "mes";
export type LiquidacionEstado = "borrador" | "cerrada" | "pagada";
export type LiquidacionModalidad = "mensual" | "quincenal" | "ambas";

export interface LiquidacionItem {
  id: string;
  liquidacion_id: string;
  personal_id: string;
  bruto_blanco: number;
  bruto_negro: number;
  dias_falta: number;
  dias_licencia: number;
  horas_extras_50: number;
  horas_extras_100: number;
  importe_he: number;
  presentismo: number;
  adelantos: number;
  cuota_prestamo: number;
  otros_descuentos: number;
  otros_adicionales: number;
  neto_blanco: number;
  neto_negro: number;
  neto_total: number;
  monto_banco: number;
  monto_efectivo: number;
  embargo: boolean;
  cbu_snapshot: string | null;
  banco_snapshot: string | null;
  numero_cuenta_snapshot: string | null;
  pagado: boolean;
  pagado_at: string | null;
  observaciones: string | null;
  personal?: {
    id: string;
    nombre: string;
    apellido: string;
    legajo: string | null;
    dni: string | null;
  };
}

export interface Liquidacion {
  id: string;
  periodo: LiquidacionPeriodo;
  mes: number;
  anio: number;
  estado: LiquidacionEstado;
  fecha_pago: string | null;
  total_blanco: number;
  total_negro: number;
  total_banco: number;
  total_efectivo: number;
  total_neto: number;
  observaciones: string | null;
  cerrada_at: string | null;
  pagada_at: string | null;
  created_at: string;
}

export interface ConfigPersonal {
  id: string;
  personal_id: string;
  modalidad: LiquidacionModalidad;
  sueldo_blanco: number;
  sueldo_negro: number;
  monto_banco_fijo: number;
  resto_efectivo: boolean;
  presentismo_monto: number;
  presentismo_porcentaje: number;
  embargo: boolean;
  embargo_nota: string | null;
  cbu: string | null;
  banco: string | null;
  numero_cuenta: string | null;
}

export const useLiquidaciones = () => {
  return useQuery({
    queryKey: ["liquidaciones"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("liquidaciones")
        .select("*")
        .order("anio", { ascending: false })
        .order("mes", { ascending: false })
        .order("periodo", { ascending: true });
      if (error) throw error;
      return (data || []) as Liquidacion[];
    },
  });
};

export const useLiquidacion = (id: string | null) => {
  return useQuery({
    queryKey: ["liquidacion", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("liquidaciones")
        .select("*")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data as Liquidacion | null;
    },
  });
};

export const useLiquidacionItems = (liquidacionId: string | null) => {
  return useQuery({
    queryKey: ["liquidacion_items", liquidacionId],
    enabled: !!liquidacionId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("liquidacion_items")
        .select("*, personal:personal!liquidacion_items_personal_company_fkey(id, first_name, last_name, internal_code, dni)")
        .eq("liquidacion_id", liquidacionId!);
      if (error) throw error;
      return ((data || []) as Array<any>).map((row) => ({
        ...row,
        personal: row.personal ? { id: row.personal.id, nombre: row.personal.first_name, apellido: row.personal.last_name, legajo: row.personal.internal_code, dni: row.personal.dni } : null,
      })) as LiquidacionItem[];
    },
  });
};

export const useConfigPersonal = () => {
  const { membership, user, hasPermission } = useAuth();
  return useQuery({
    queryKey: ["liquidacion_config_personal", membership?.company_id, user?.id],
    enabled: Boolean(membership?.company_id && user?.id && hasPermission("rrhh.payroll")),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("liquidacion_config_personal")
        .select("*");
      if (error) throw error;
      return (data || []) as ConfigPersonal[];
    },
  });
};

export const useUpsertConfigPersonal = () => {
  const qc = useQueryClient();
  const { membership } = useAuth();
  return useMutation({
    mutationFn: async (cfg: Partial<ConfigPersonal> & { personal_id: string }) => {
      const { data, error } = await supabase
        .from("liquidacion_config_personal")
        .upsert({ ...cfg, company_id: membership?.company_id }, { onConflict: "company_id,personal_id" })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["liquidacion_config_personal"] });
      toast.success("Configuración guardada");
    },
    onError: (e: any) => toast.error(e.message || "Error guardando"),
  });
};

export const useCreateLiquidacion = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { periodo: LiquidacionPeriodo; mes: number; anio: number }) => {
      const { data: id, error } = await supabase.schema("api").rpc("create_payroll", {
        p_periodo: input.periodo, p_mes: input.mes, p_anio: input.anio,
      });
      if (error) throw error;
      const { data: liq, error: loadError } = await supabase.from("liquidaciones").select("*").eq("id", String(id)).single();
      if (loadError) throw loadError;
      return liq as Liquidacion;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["liquidaciones"] });
      toast.success("Liquidación creada");
    },
    onError: (e: any) => toast.error(e.message || "Error creando liquidación"),
  });
};

export const useUpdateLiquidacionItem = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch, liquidacionId }: { id: string; patch: Partial<LiquidacionItem>; liquidacionId: string }) => {
      const { error } = await supabase.from("liquidacion_items").update(patch).eq("id", id);
      if (error) throw error;
      return { liquidacionId };
    },
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["liquidacion_items", r.liquidacionId] });
    },
    onError: (e: any) => toast.error(e.message || "Error actualizando"),
  });
};

export const useUpdateLiquidacion = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Liquidacion> }) => {
      const { error } = await supabase.from("liquidaciones").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["liquidaciones"] });
      qc.invalidateQueries({ queryKey: ["liquidacion", vars.id] });
    },
    onError: (e: any) => toast.error(e.message || "Error actualizando"),
  });
};

export const useDeleteLiquidacion = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("liquidaciones").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["liquidaciones"] });
      toast.success("Liquidación eliminada");
    },
    onError: (e: any) => toast.error(e.message || "Error eliminando"),
  });
};

// Adelantos
export interface Adelanto {
  id: string;
  personal_id: string;
  fecha: string;
  monto: number;
  motivo: string | null;
  estado: "pendiente" | "aplicado" | "cancelado";
  liquidacion_id: string | null;
  aplicado_at: string | null;
}

export const useAdelantos = () => {
  return useQuery({
    queryKey: ["adelantos_personal"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("adelantos_personal")
        .select("*, personal:personal!adelantos_personal_company_fkey(id, first_name, last_name, internal_code)")
        .order("fecha", { ascending: false });
      if (error) throw error;
      return ((data || []) as any[]).map((row) => ({ ...row, personal: row.personal ? { id: row.personal.id, nombre: row.personal.first_name, apellido: row.personal.last_name, legajo: row.personal.internal_code } : null }));
    },
  });
};

export const useCreateAdelanto = () => {
  const qc = useQueryClient();
  const { membership } = useAuth();
  return useMutation({
    mutationFn: async (input: { personal_id: string; fecha: string; monto: number; motivo?: string }) => {
      const { error } = await supabase.from("adelantos_personal").insert({ ...input, company_id: membership?.company_id });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["adelantos_personal"] });
      toast.success("Adelanto registrado");
    },
    onError: (e: any) => toast.error(e.message || "Error"),
  });
};

export const useDeleteAdelanto = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("adelantos_personal").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["adelantos_personal"] });
      toast.success("Eliminado");
    },
  });
};

// Préstamos
export interface Prestamo {
  id: string;
  personal_id: string;
  fecha: string;
  monto_total: number;
  cantidad_cuotas: number;
  monto_cuota: number;
  motivo: string | null;
  estado: "activo" | "saldado" | "cancelado";
}

export const usePrestamos = () => {
  return useQuery({
    queryKey: ["prestamos_personal"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prestamos_personal")
        .select("*, personal:personal!prestamos_personal_company_fkey(id, first_name, last_name, internal_code), prestamo_cuotas(*)")
        .order("fecha", { ascending: false });
      if (error) throw error;
      return ((data || []) as any[]).map((row) => ({ ...row, personal: row.personal ? { id: row.personal.id, nombre: row.personal.first_name, apellido: row.personal.last_name, legajo: row.personal.internal_code } : null }));
    },
  });
};

export const useCreatePrestamo = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { personal_id: string; fecha: string; monto_total: number; cantidad_cuotas: number; motivo?: string }) => {
      const { error } = await supabase.schema("api").rpc("create_personal_loan", {
        p_personal_id: input.personal_id, p_fecha: input.fecha, p_monto_total: input.monto_total,
        p_cantidad_cuotas: input.cantidad_cuotas, p_motivo: input.motivo || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["prestamos_personal"] });
      toast.success("Préstamo creado");
    },
    onError: (e: any) => toast.error(e.message || "Error"),
  });
};

export const useDeletePrestamo = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("prestamos_personal").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["prestamos_personal"] });
      toast.success("Eliminado");
    },
  });
};
