import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
        .select("*, personal:personal_id(id, nombre, apellido, legajo, dni)")
        .eq("liquidacion_id", liquidacionId!);
      if (error) throw error;
      return (data || []) as unknown as LiquidacionItem[];
    },
  });
};

export const useConfigPersonal = () => {
  return useQuery({
    queryKey: ["liquidacion_config_personal"],
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
  return useMutation({
    mutationFn: async (cfg: Partial<ConfigPersonal> & { personal_id: string }) => {
      const { data, error } = await supabase
        .from("liquidacion_config_personal")
        .upsert(cfg, { onConflict: "personal_id" })
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
      // Create header
      const { data: liq, error } = await supabase
        .from("liquidaciones")
        .insert(input)
        .select()
        .single();
      if (error) throw error;

      // Load configs for matching modalidad
      const { data: configs, error: cfgErr } = await supabase
        .from("liquidacion_config_personal")
        .select("*, personal:personal_id(id, activo)");
      if (cfgErr) throw cfgErr;

      const wantsPeriod = (mod: LiquidacionModalidad) => {
        if (input.periodo === "mes") return mod === "mensual" || mod === "ambas";
        return mod === "quincenal" || mod === "ambas";
      };

      const items = (configs || [])
        .filter((c: any) => c.personal?.activo !== false && wantsPeriod(c.modalidad))
        .map((c: any) => {
          // Quincena = half the configured monthly base
          const factor = input.periodo === "mes" ? 1 : 0.5;
          const bruto_blanco = Number(c.sueldo_blanco || 0) * factor;
          const bruto_negro = Number(c.sueldo_negro || 0) * factor;
          const presentismo =
            (Number(c.presentismo_monto || 0) +
              ((bruto_blanco + bruto_negro) * Number(c.presentismo_porcentaje || 0)) / 100) *
            factor;
          return {
            liquidacion_id: liq.id,
            personal_id: c.personal_id,
            bruto_blanco,
            bruto_negro,
            presentismo,
            embargo: c.embargo,
            cbu_snapshot: c.cbu,
            banco_snapshot: c.banco,
            numero_cuenta_snapshot: c.numero_cuenta,
          };
        });

      if (items.length > 0) {
        const { error: itErr } = await supabase.from("liquidacion_items").insert(items);
        if (itErr) throw itErr;
      }

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
        .select("*, personal:personal_id(id, nombre, apellido, legajo)")
        .order("fecha", { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    },
  });
};

export const useCreateAdelanto = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { personal_id: string; fecha: string; monto: number; motivo?: string }) => {
      const { error } = await supabase.from("adelantos_personal").insert(input);
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
        .select("*, personal:personal_id(id, nombre, apellido, legajo), prestamo_cuotas(*)")
        .order("fecha", { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    },
  });
};

export const useCreatePrestamo = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { personal_id: string; fecha: string; monto_total: number; cantidad_cuotas: number; motivo?: string }) => {
      const monto_cuota = +(input.monto_total / input.cantidad_cuotas).toFixed(2);
      const { data: prestamo, error } = await supabase
        .from("prestamos_personal")
        .insert({ ...input, monto_cuota })
        .select()
        .single();
      if (error) throw error;
      const cuotas = Array.from({ length: input.cantidad_cuotas }).map((_, i) => ({
        prestamo_id: prestamo.id,
        numero_cuota: i + 1,
        monto: monto_cuota,
      }));
      const { error: cErr } = await supabase.from("prestamo_cuotas").insert(cuotas);
      if (cErr) throw cErr;
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
