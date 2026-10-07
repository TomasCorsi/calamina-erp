import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { supabaseV2 as supabase } from "@/integrations/supabase/client";

export type TipoMaquinaria =
  | "cargadora" | "compactador" | "retroexcavadora" | "minicargadora"
  | "motoniveladora" | "topador" | "pala_retro" | "batea" | "acoplado"
  | "camion" | "carreton" | "cisterna" | "tanque_cisterna"
  | "tanque_regador_tractor" | "soplador" | "zanjeadora" | "rastra"
  | "tractor" | "rastra_grosspal" | "auto" | "camioneta" | "grupo_electrogeno";

export type EstadoMaquinaria = "operativa" | "mantenimiento" | "inactiva" | "en_uso";

export interface MaquinariaDB {
  id: string;
  codigo: string;
  nombre: string;
  tipo: TipoMaquinaria;
  marca: string;
  anio: number;
  patente: string | null;
  estado: EstadoMaquinaria;
  horas_acumuladas: number;
  km_acumulados: number;
  operador_asignado_id: string | null;
  obra_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface MaquinariaWithRelations extends MaquinariaDB {
  operador?: { nombre: string; apellido: string } | null;
  obra?: { nombre: string } | null;
}

export interface MaquinariaForm {
  codigo?: string;
  nombre?: string;
  tipo?: TipoMaquinaria;
  marca?: string;
  anio?: number;
  patente?: string;
  estado?: EstadoMaquinaria;
  horas_acumuladas?: number;
  km_acumulados?: number;
  operador_asignado_id?: string;
  obra_id?: string;
}

const SELECT = `
  id, codigo, nombre, tipo, marca, anio, patente, estado,
  horas_acumuladas, km_acumulados, operador_asignado_id, obra_id,
  created_at, updated_at,
  operador:personal!maquinarias_operador_company_fkey(first_name,last_name),
  obra:obras!maquinarias_obra_company_fkey(nombre)
`;

function optionalText(value: unknown): string | null {
  const text = typeof value === "string" ? value.trim() : "";
  return text || null;
}

function normalizeWrite(maq: Partial<MaquinariaForm>, partial = false): Record<string, unknown> {
  const has = (key: keyof MaquinariaForm) => Object.prototype.hasOwnProperty.call(maq, key);
  const payload: Record<string, unknown> = {
    codigo: typeof maq.codigo === "string" ? maq.codigo.trim() : undefined,
    nombre: typeof maq.nombre === "string" ? maq.nombre.trim() : undefined,
    tipo: maq.tipo,
    marca: optionalText(maq.marca),
    anio: maq.anio ? Number(maq.anio) : null,
    patente: optionalText(maq.patente)?.toUpperCase() ?? null,
    estado: maq.estado,
    horas_acumuladas: maq.horas_acumuladas == null ? undefined : Number(maq.horas_acumuladas),
    km_acumulados: maq.km_acumulados == null ? undefined : Number(maq.km_acumulados),
    operador_asignado_id: maq.operador_asignado_id || null,
    obra_id: maq.obra_id || null,
  };

  for (const key of Object.keys(payload) as Array<keyof MaquinariaForm>) {
    if (payload[key] === undefined || (partial && !has(key))) delete payload[key];
  }
  return payload;
}

function mapMaquinaria(row: Record<string, unknown>): MaquinariaWithRelations {
  const operator = row.operador as { first_name?: string; last_name?: string } | null;
  return {
    ...(row as unknown as MaquinariaDB),
    marca: row.marca == null ? "" : String(row.marca),
    anio: row.anio == null ? 0 : Number(row.anio),
    horas_acumuladas: Number(row.horas_acumuladas ?? 0),
    km_acumulados: Number(row.km_acumulados ?? 0),
    operador: operator ? { nombre: operator.first_name ?? "", apellido: operator.last_name ?? "" } : null,
  };
}

export function useMaquinarias(enabled = true) {
  const queryClient = useQueryClient();
  const { membership, hasPermission } = useAuth();
  const companyId = membership?.company_id;

  const query = useQuery({
    queryKey: ["maquinarias-v2", companyId],
    enabled: Boolean(enabled && companyId && hasPermission("maquinarias.view")),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("maquinarias")
        .select(SELECT)
        .eq("company_id", companyId!)
        .order("nombre");
      if (error) throw error;
      return (data ?? []).map((row) => mapMaquinaria(row as Record<string, unknown>));
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["maquinarias-v2"] }),
      queryClient.invalidateQueries({ queryKey: ["parte-diario-catalogs-v2"] }),
      queryClient.invalidateQueries({ queryKey: ["remitos-catalogs-v2"] }),
    ]);
  };

  const createMutation = useMutation({
    mutationFn: async (maq: MaquinariaForm) => {
      if (!companyId) throw new Error("No hay empresa activa");
      const { data, error } = await supabase
        .from("maquinarias")
        .insert({ company_id: companyId, ...normalizeWrite(maq) })
        .select(SELECT)
        .single();
      if (error) throw error;
      return mapMaquinaria(data as Record<string, unknown>);
    },
    onSuccess: async () => { toast.success("Maquinaria creada correctamente"); await invalidate(); },
    onError: () => toast.error("Error al crear maquinaria"),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, maq }: { id: string; maq: Partial<MaquinariaForm> }) => {
      if (!companyId) throw new Error("No hay empresa activa");
      const { data, error } = await supabase
        .from("maquinarias")
        .update(normalizeWrite(maq, true))
        .eq("id", id)
        .eq("company_id", companyId)
        .select("id")
        .single();
      if (error) throw error;
      if (!data) throw new Error("Maquinaria no encontrada");
    },
    onSuccess: async () => { toast.success("Maquinaria actualizada correctamente"); await invalidate(); },
    onError: () => toast.error("Error al actualizar maquinaria"),
  });

  const batchSave = async (changes: {
    created: MaquinariaForm[];
    updated: { id: string; data: Partial<MaquinariaForm> }[];
    deleted: string[];
  }) => {
    if (changes.deleted.length > 0) throw new Error("La baja se realiza cambiando el estado a Inactiva");
    for (const maquinaria of changes.created) await createMutation.mutateAsync(maquinaria);
    for (const item of changes.updated) await updateMutation.mutateAsync({ id: item.id, maq: item.data });
  };

  return {
    maquinarias: query.data ?? [],
    loading: query.isLoading,
    fetchMaquinarias: query.refetch,
    createMaquinaria: async (maq: MaquinariaForm) => {
      try { return await createMutation.mutateAsync(maq); } catch { return null; }
    },
    updateMaquinaria: async (id: string, maq: Partial<MaquinariaForm>) => {
      try { await updateMutation.mutateAsync({ id, maq }); return true; } catch { return false; }
    },
    deleteMaquinaria: async () => {
      toast.error("Para dar de baja una maquinaria, cambie su estado a Inactiva");
      return false;
    },
    batchSave,
  };
}
