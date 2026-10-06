import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabaseV2 as supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

const db = supabase as any;

export interface ClienteDB {
  id: string;
  nombre: string;
  cuit: string | null;
  direccion: string | null;
  localidad: string | null;
  telefono: string | null;
  email: string | null;
  contacto: string | null;
  observaciones: string | null;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export interface ClienteForm {
  nombre: string;
  cuit?: string;
  direccion?: string;
  localidad?: string;
  telefono?: string;
  email?: string;
  contacto?: string;
  observaciones?: string;
  activo?: boolean;
}

const fetchClientesFromDB = async (): Promise<ClienteDB[]> => {
  const { data, error } = await db
    .from("clientes")
    .select("*")
    .order("nombre", { ascending: true });

  if (error) throw error;
  return data || [];
};

export function useClientes() {
  const queryClient = useQueryClient();
  const { membership } = useAuth();
  const companyId = membership?.company_id;

  const {
    data: clientes = [],
    isLoading: loading,
    refetch: fetchClientes,
  } = useQuery({
    queryKey: ["clientes", companyId],
    queryFn: fetchClientesFromDB,
    enabled: Boolean(companyId),
  });

  const createMutation = useMutation({
    mutationFn: async (cliente: ClienteForm) => {
      if (!companyId) throw new Error("No hay empresa activa");
      const insertData = {
        company_id: companyId,
        nombre: cliente.nombre,
        cuit: cliente.cuit || null,
        direccion: cliente.direccion || null,
        localidad: cliente.localidad || null,
        telefono: cliente.telefono || null,
        email: cliente.email || null,
        contacto: cliente.contacto || null,
        observaciones: cliente.observaciones || null,
      };

      const { data, error } = await db
        .from("clientes")
        .insert([insertData])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Cliente creado correctamente");
      queryClient.invalidateQueries({ queryKey: ["clientes"] });
    },
    onError: (error) => {
      console.error("Error creating cliente:", error);
      toast.error("Error al crear cliente");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, cliente }: { id: string; cliente: Partial<ClienteForm> }) => {
      const { error } = await db
        .from("clientes")
        .update(cliente)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Cliente actualizado correctamente");
      queryClient.invalidateQueries({ queryKey: ["clientes"] });
    },
    onError: (error) => {
      console.error("Error updating cliente:", error);
      toast.error("Error al actualizar cliente");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db
        .from("clientes")
        .update({ activo: false })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Cliente desactivado correctamente");
      queryClient.invalidateQueries({ queryKey: ["clientes"] });
    },
    onError: (error) => {
      console.error("Error deleting cliente:", error);
      toast.error("Error al eliminar cliente");
    },
  });

  return {
    clientes,
    loading,
    fetchClientes,
    createCliente: async (cliente: ClienteForm) => {
      try {
        return await createMutation.mutateAsync(cliente);
      } catch {
        return null;
      }
    },
    updateCliente: async (id: string, cliente: Partial<ClienteForm>) => {
      try {
        await updateMutation.mutateAsync({ id, cliente });
        return true;
      } catch {
        return false;
      }
    },
    deleteCliente: async (id: string) => {
      try {
        await deleteMutation.mutateAsync(id);
        return true;
      } catch {
        return false;
      }
    },
  };
}
