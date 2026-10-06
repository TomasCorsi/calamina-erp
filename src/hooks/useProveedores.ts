import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabaseV2 as supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

const db = supabase as any;

export interface ProveedorDB {
  id: string;
  nombre: string;
  cuit: string | null;
  direccion: string | null;
  localidad: string | null;
  telefono: string | null;
  email: string | null;
  contacto: string | null;
  rubro: string | null;
  observaciones: string | null;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProveedorForm {
  nombre: string;
  cuit?: string;
  direccion?: string;
  localidad?: string;
  telefono?: string;
  email?: string;
  contacto?: string;
  rubro?: string;
  observaciones?: string;
  activo: boolean;
}

const fetchProveedores = async (): Promise<ProveedorDB[]> => {
  const { data, error } = await db
    .from("proveedores")
    .select("*")
    .order("nombre", { ascending: true });

  if (error) throw error;
  return data || [];
};

export function useProveedores() {
  const queryClient = useQueryClient();
  const { membership } = useAuth();
  const companyId = membership?.company_id;

  const {
    data: proveedores = [],
    isLoading: loading,
    refetch: fetchProveedoresRefetch,
  } = useQuery({
    queryKey: ["proveedores", companyId],
    queryFn: fetchProveedores,
    enabled: Boolean(companyId),
  });

  const createMutation = useMutation({
    mutationFn: async (prov: ProveedorForm) => {
      if (!companyId) throw new Error("No hay empresa activa");
      const { data, error } = await db
        .from("proveedores")
        .insert([{
          company_id: companyId,
          nombre: prov.nombre,
          cuit: prov.cuit || null,
          direccion: prov.direccion || null,
          localidad: prov.localidad || null,
          telefono: prov.telefono || null,
          email: prov.email || null,
          contacto: prov.contacto || null,
          rubro: prov.rubro || null,
          observaciones: prov.observaciones || null,
          activo: prov.activo,
        }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Proveedor creado correctamente");
      queryClient.invalidateQueries({ queryKey: ["proveedores"] });
    },
    onError: (error) => {
      console.error("Error creating proveedor:", error);
      toast.error("Error al crear proveedor");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, prov }: { id: string; prov: Partial<ProveedorForm> }) => {
      const sanitized = {
        ...prov,
        cuit: prov.cuit || null,
        direccion: prov.direccion || null,
        localidad: prov.localidad || null,
        telefono: prov.telefono || null,
        email: prov.email || null,
        contacto: prov.contacto || null,
        rubro: prov.rubro || null,
        observaciones: prov.observaciones || null,
      };
      const { error } = await db
        .from("proveedores")
        .update(sanitized)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Proveedor actualizado correctamente");
      queryClient.invalidateQueries({ queryKey: ["proveedores"] });
    },
    onError: (error) => {
      console.error("Error updating proveedor:", error);
      toast.error("Error al actualizar proveedor");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db
        .from("proveedores")
        .update({ activo: false })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Proveedor desactivado correctamente");
      queryClient.invalidateQueries({ queryKey: ["proveedores"] });
    },
    onError: (error) => {
      console.error("Error deleting proveedor:", error);
      toast.error("Error al eliminar proveedor");
    },
  });

  return {
    proveedores,
    loading,
    fetchProveedores: fetchProveedoresRefetch,
    createProveedor: async (prov: ProveedorForm) => {
      try { return await createMutation.mutateAsync(prov); } catch { return null; }
    },
    updateProveedor: async (id: string, prov: Partial<ProveedorForm>) => {
      try { await updateMutation.mutateAsync({ id, prov }); return true; } catch { return false; }
    },
    deleteProveedor: async (id: string) => {
      try { await deleteMutation.mutateAsync(id); return true; } catch { return false; }
    },
  };
}
