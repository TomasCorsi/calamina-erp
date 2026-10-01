import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface SueldoDB {
  id: string;
  personal_id: string | null;
  legajo: string;
  nombre: string | null;
  apellido: string | null;
  puesto: string | null;
  sueldo_blanco: number;
  sueldo_negro: number;
  modalidad_pago: string;
  periodo: string;
  created_at: string;
  updated_at: string;
}

export type SueldoInsert = Omit<SueldoDB, "id" | "created_at" | "updated_at">;

export function useSueldos(periodo: string) {
  const queryClient = useQueryClient();

  const { data: sueldos = [], isLoading } = useQuery({
    queryKey: ["sueldos", periodo],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sueldos")
        .select("*")
        .eq("periodo", periodo)
        .order("nombre", { ascending: true });
      if (error) throw error;
      return data as SueldoDB[];
    },
    enabled: !!periodo,
  });

  const upsertSueldos = useMutation({
    mutationFn: async (rows: SueldoInsert[]) => {
      const { error: delError } = await supabase
        .from("sueldos")
        .delete()
        .eq("periodo", rows[0]?.periodo || periodo);
      if (delError) throw delError;
      for (let i = 0; i < rows.length; i += 500) {
        const batch = rows.slice(i, i + 500);
        const { error } = await supabase.from("sueldos").insert(batch);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sueldos", periodo] });
      toast.success("Sueldos importados correctamente");
    },
    onError: (err: Error) => toast.error("Error al importar sueldos: " + err.message),
  });

  const deletePeriodo = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("sueldos").delete().eq("periodo", periodo);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sueldos", periodo] });
      toast.success("Período eliminado");
    },
    onError: (err: Error) => toast.error("Error: " + err.message),
  });

  const updateSueldo = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<SueldoDB> }) => {
      const { error } = await supabase.from("sueldos").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sueldos", periodo] });
    },
    onError: (err: Error) => toast.error("Error al actualizar: " + err.message),
  });

  const deleteSueldo = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("sueldos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sueldos", periodo] });
      toast.success("Registro eliminado");
    },
    onError: (err: Error) => toast.error("Error: " + err.message),
  });

  const replicateToMonths = useMutation({
    mutationFn: async ({
      targetPeriodos,
      overwrite,
    }: {
      targetPeriodos: string[];
      overwrite: boolean;
    }) => {
      if (sueldos.length === 0) throw new Error("No hay sueldos en el período actual");
      const baseRows: SueldoInsert[] = sueldos.map((s) => ({
        personal_id: s.personal_id,
        legajo: s.legajo,
        nombre: s.nombre,
        apellido: s.apellido,
        puesto: s.puesto,
        sueldo_blanco: Number(s.sueldo_blanco),
        sueldo_negro: Number(s.sueldo_negro),
        modalidad_pago: s.modalidad_pago,
        periodo: "",
      }));

      for (const p of targetPeriodos) {
        if (overwrite) {
          const { error: delErr } = await supabase.from("sueldos").delete().eq("periodo", p);
          if (delErr) throw delErr;
        } else {
          const { data: existing } = await supabase
            .from("sueldos")
            .select("id")
            .eq("periodo", p)
            .limit(1);
          if (existing && existing.length > 0) continue;
        }
        const rows = baseRows.map((r) => ({ ...r, periodo: p }));
        for (let i = 0; i < rows.length; i += 500) {
          const batch = rows.slice(i, i + 500);
          const { error } = await supabase.from("sueldos").insert(batch);
          if (error) throw error;
        }
      }
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["sueldos"] });
      toast.success(`Replicado a ${vars.targetPeriodos.length} mes(es)`);
    },
    onError: (err: Error) => toast.error("Error al replicar: " + err.message),
  });

  const applyIncrease = useMutation({
    mutationFn: async ({
      updates,
      targetPeriodos,
    }: {
      updates: { legajo: string; sueldo_blanco?: number; sueldo_negro?: number }[];
      targetPeriodos: string[];
    }) => {
      let count = 0;
      for (const p of targetPeriodos) {
        for (const u of updates) {
          const patch: Record<string, number> = {};
          if (typeof u.sueldo_blanco === "number") patch.sueldo_blanco = u.sueldo_blanco;
          if (typeof u.sueldo_negro === "number") patch.sueldo_negro = u.sueldo_negro;
          if (Object.keys(patch).length === 0) continue;
          const { error, count: c } = await supabase
            .from("sueldos")
            .update(patch, { count: "exact" })
            .eq("periodo", p)
            .eq("legajo", u.legajo);
          if (error) throw error;
          count += c || 0;
        }
      }
      return count;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["sueldos"] });
      toast.success(`${count} registros actualizados`);
    },
    onError: (err: Error) => toast.error("Error al aplicar aumento: " + err.message),
  });

  return {
    sueldos,
    isLoading,
    upsertSueldos,
    deletePeriodo,
    updateSueldo,
    deleteSueldo,
    replicateToMonths,
    applyIncrease,
  };
}
