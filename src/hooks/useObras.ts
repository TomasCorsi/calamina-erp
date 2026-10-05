import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { supabaseV2 as supabase } from "@/integrations/supabase/client";

export type EstadoObra = "activa" | "pendiente" | "finalizada" | "pausada";

export interface ObraDB {
  id: string;
  nombre: string;
  numero: string | null;
  ubicacion: string | null;
  descripcion: string | null;
  estado: EstadoObra;
  fecha_inicio: string | null;
  fecha_fin_estimada: string | null;
  responsable_id: string | null;
  cliente_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ObraCliente {
  id: string;
  nombre: string;
  cuit: string | null;
  direccion: string | null;
  localidad: string | null;
  telefono: string | null;
  email: string | null;
  activo: boolean;
}

export interface ObraResponsable {
  id: string;
  nombre: string;
  apellido: string;
  activo: boolean;
}

export interface ObraWithRelations extends ObraDB {
  responsable?: Pick<ObraResponsable, "nombre" | "apellido"> | null;
  cliente?: Omit<ObraCliente, "activo"> | null;
}

export interface ObraForm {
  nombre: string;
  numero?: string;
  ubicacion?: string;
  descripcion?: string;
  estado: EstadoObra;
  fecha_inicio?: string;
  fecha_fin_estimada?: string;
  responsable_id?: string;
  cliente_id?: string;
}

type ObrasQueryData = {
  obras: ObraWithRelations[];
  personal: ObraResponsable[];
  clientes: ObraCliente[];
};

function optionalText(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

async function fetchObrasFromV2(companyId: string): Promise<ObrasQueryData> {
  const [obrasResult, personalResult, clientesResult] = await Promise.all([
    supabase
      .from("obras")
      .select("id, nombre, numero, ubicacion, descripcion, estado, fecha_inicio, fecha_fin_estimada, responsable_id, cliente_id, created_at, updated_at")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false }),
    supabase
      .from("personal")
      .select("id, first_name, last_name, status")
      .eq("company_id", companyId)
      .order("last_name"),
    supabase
      .from("clientes")
      .select("id, nombre, cuit, direccion, localidad, telefono, email, activo")
      .eq("company_id", companyId)
      .order("nombre"),
  ]);

  if (obrasResult.error) throw obrasResult.error;
  if (personalResult.error) throw personalResult.error;
  if (clientesResult.error) throw clientesResult.error;

  const personal = (personalResult.data ?? []).map((row) => ({
    id: String(row.id),
    nombre: String(row.first_name),
    apellido: String(row.last_name),
    activo: row.status === "active",
  }));
  const clientes = (clientesResult.data ?? []).map((row) => ({
    id: String(row.id),
    nombre: String(row.nombre),
    cuit: row.cuit == null ? null : String(row.cuit),
    direccion: row.direccion == null ? null : String(row.direccion),
    localidad: row.localidad == null ? null : String(row.localidad),
    telefono: row.telefono == null ? null : String(row.telefono),
    email: row.email == null ? null : String(row.email),
    activo: Boolean(row.activo),
  }));
  const personalById = new Map(personal.map((row) => [row.id, row]));
  const clientesById = new Map(clientes.map((row) => [row.id, row]));

  const obras = (obrasResult.data ?? []).map((row) => {
    const responsable = row.responsable_id == null
      ? null
      : personalById.get(String(row.responsable_id));
    const cliente = row.cliente_id == null
      ? null
      : clientesById.get(String(row.cliente_id));

    return {
      id: String(row.id),
      nombre: String(row.nombre),
      numero: row.numero == null ? null : String(row.numero),
      ubicacion: row.ubicacion == null ? null : String(row.ubicacion),
      descripcion: row.descripcion == null ? null : String(row.descripcion),
      estado: row.estado as EstadoObra,
      fecha_inicio: row.fecha_inicio == null ? null : String(row.fecha_inicio),
      fecha_fin_estimada: row.fecha_fin_estimada == null ? null : String(row.fecha_fin_estimada),
      responsable_id: row.responsable_id == null ? null : String(row.responsable_id),
      cliente_id: row.cliente_id == null ? null : String(row.cliente_id),
      created_at: String(row.created_at),
      updated_at: String(row.updated_at),
      responsable: responsable ? { nombre: responsable.nombre, apellido: responsable.apellido } : null,
      cliente: cliente ? {
        id: cliente.id,
        nombre: cliente.nombre,
        cuit: cliente.cuit,
        direccion: cliente.direccion,
        localidad: cliente.localidad,
        telefono: cliente.telefono,
        email: cliente.email,
      } : null,
    } satisfies ObraWithRelations;
  });

  return { obras, personal, clientes };
}

export function useObras() {
  const queryClient = useQueryClient();
  const { membership } = useAuth();
  const companyId = membership?.company_id;

  const {
    data = { obras: [], personal: [], clientes: [] },
    isLoading: loading,
    refetch: fetchObras,
  } = useQuery({
    queryKey: ["obras", companyId],
    queryFn: () => fetchObrasFromV2(companyId!),
    enabled: Boolean(companyId),
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const createMutation = useMutation({
    mutationFn: async (obra: ObraForm) => {
      if (!companyId) throw new Error("No hay una empresa activa");
      const { data: created, error } = await supabase
        .from("obras")
        .insert({
          company_id: companyId,
          nombre: obra.nombre.trim(),
          numero: optionalText(obra.numero),
          estado: obra.estado,
          ubicacion: optionalText(obra.ubicacion),
          descripcion: optionalText(obra.descripcion),
          fecha_inicio: obra.fecha_inicio || null,
          fecha_fin_estimada: obra.fecha_fin_estimada || null,
          responsable_id: obra.responsable_id || null,
          cliente_id: obra.cliente_id || null,
        })
        .select("id")
        .single();
      if (error) throw error;
      return created;
    },
    onSuccess: () => {
      toast.success("Obra creada correctamente");
      void queryClient.invalidateQueries({ queryKey: ["obras", companyId] });
    },
    onError: (error) => {
      console.error("Error creating obra:", error);
      toast.error("Error al crear obra");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, obra }: { id: string; obra: Partial<ObraForm> }) => {
      if (!companyId) throw new Error("No hay una empresa activa");
      const { error } = await supabase
        .from("obras")
        .update({
          nombre: obra.nombre?.trim(),
          numero: optionalText(obra.numero),
          estado: obra.estado,
          ubicacion: optionalText(obra.ubicacion),
          descripcion: optionalText(obra.descripcion),
          fecha_inicio: obra.fecha_inicio || null,
          fecha_fin_estimada: obra.fecha_fin_estimada || null,
          responsable_id: obra.responsable_id || null,
          cliente_id: obra.cliente_id || null,
        })
        .eq("id", id)
        .eq("company_id", companyId)
        .select("id")
        .single();
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Obra actualizada correctamente");
      void queryClient.invalidateQueries({ queryKey: ["obras", companyId] });
    },
    onError: (error) => {
      console.error("Error updating obra:", error);
      toast.error("Error al actualizar obra");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!companyId) throw new Error("No hay una empresa activa");
      const { error } = await supabase
        .from("obras")
        .delete()
        .eq("id", id)
        .eq("company_id", companyId)
        .select("id")
        .single();
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Obra eliminada correctamente");
      void queryClient.invalidateQueries({ queryKey: ["obras", companyId] });
    },
    onError: (error) => {
      console.error("Error deleting obra:", error);
      toast.error("Error al eliminar obra");
    },
  });

  return {
    ...data,
    loading,
    fetchObras,
    createObra: async (obra: ObraForm) => {
      try {
        return await createMutation.mutateAsync(obra);
      } catch {
        return null;
      }
    },
    updateObra: async (id: string, obra: Partial<ObraForm>) => {
      try {
        await updateMutation.mutateAsync({ id, obra });
        return true;
      } catch {
        return false;
      }
    },
    deleteObra: async (id: string) => {
      try {
        await deleteMutation.mutateAsync(id);
        return true;
      } catch {
        return false;
      }
    },
  };
}
