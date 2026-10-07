import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabaseV2 as supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

export interface EntregaEPP {
  id: string;
  personal_id: string;
  fecha: string;
  created_at: string;
  updated_at: string;
}

export interface EntregaEPPItem {
  id: string;
  entrega_id: string;
  producto: string;
  tipo_modelo: string;
  marca: string;
  posee_certificacion: boolean;
  cantidad: number;
  created_at: string;
}

export interface EntregaEPPItemForm {
  producto: string;
  tipo_modelo: string;
  marca: string;
  posee_certificacion: boolean;
  cantidad: number;
}

export const DEFAULT_EPP_ITEMS: EntregaEPPItemForm[] = [
  { producto: "Pantalón", tipo_modelo: "Grafa", marca: "", posee_certificacion: true, cantidad: 2 },
  { producto: "Zapato de Seguridad", tipo_modelo: "Botín c/puntera", marca: "", posee_certificacion: true, cantidad: 1 },
  { producto: "Protector Auditivo", tipo_modelo: "Endoaural", marca: "", posee_certificacion: true, cantidad: 1 },
  { producto: "Casco", tipo_modelo: "Con arnés", marca: "", posee_certificacion: true, cantidad: 1 },
  { producto: "Anteojos de Seguridad", tipo_modelo: "Transparentes", marca: "", posee_certificacion: true, cantidad: 1 },
  { producto: "Remera", tipo_modelo: "Manga corta", marca: "", posee_certificacion: true, cantidad: 2 },
  { producto: "Buzo / Campera", tipo_modelo: "Abrigo", marca: "", posee_certificacion: true, cantidad: 1 },
  { producto: "Guantes", tipo_modelo: "Descarne", marca: "", posee_certificacion: true, cantidad: 1 },
];

export function useEntregasEPP(personalId?: string) {
  const queryClient = useQueryClient();
  const { membership } = useAuth();
  const companyId = membership?.company_id;

  const { data: entregas = [], isLoading } = useQuery({
    queryKey: ["entregas-epp", companyId, personalId],
    queryFn: async () => {
      if (!personalId) return [];
      const { data, error } = await supabase
        .from("entregas_epp")
        .select("*")
        .eq("personal_id", personalId)
        .order("fecha", { ascending: false });
      if (error) throw error;
      return data as EntregaEPP[];
    },
    enabled: !!companyId && !!personalId,
  });

  const createEntrega = useMutation({
    mutationFn: async ({ personalId, fecha, items }: { personalId: string; fecha: string; items: EntregaEPPItemForm[] }) => {
      const { data: entregaId, error } = await supabase.schema("api").rpc("create_epp_delivery", {
        p_personal_id: personalId,
        p_fecha: fecha,
        p_items: items.filter((item) => item.producto.trim()),
      });
      if (error) throw error;
      return { id: String(entregaId), personal_id: personalId, fecha } as EntregaEPP;
    },
    onSuccess: () => {
      toast.success("Entrega de EPP registrada");
      queryClient.invalidateQueries({ queryKey: ["entregas-epp"] });
    },
    onError: (e: any) => {
      toast.error("Error al registrar entrega: " + e.message);
    },
  });

  const fetchItems = async (entregaId: string): Promise<EntregaEPPItem[]> => {
    const { data, error } = await supabase
      .from("entrega_epp_items")
      .select("*")
      .eq("entrega_id", entregaId)
      .order("created_at");
    if (error) throw error;
    return data as EntregaEPPItem[];
  };

  const deleteEntrega = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("entregas_epp").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Entrega eliminada");
      queryClient.invalidateQueries({ queryKey: ["entregas-epp"] });
    },
    onError: () => toast.error("Error al eliminar entrega"),
  });

  return {
    entregas,
    isLoading,
    createEntrega: createEntrega.mutateAsync,
    isCreating: createEntrega.isPending,
    fetchItems,
    deleteEntrega: deleteEntrega.mutateAsync,
  };
}
