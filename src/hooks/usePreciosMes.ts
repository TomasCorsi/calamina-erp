import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

const db = supabase as any;

export type ProductoPrecio = "combustible" | "grasa" | "aceite" | "uria";

export interface PrecioProductoMes {
  id: string;
  anio: number;
  mes: number;
  producto: string;
  precio_unitario: number;
  created_at: string;
  updated_at: string;
}

export type PreciosMesMap = Record<string, number | undefined>;

export function usePreciosMes(anio: number, mes: number | undefined) {
  const queryClient = useQueryClient();
  const { membership } = useAuth();
  const companyId = membership?.company_id;

  const { data: precios = [], isLoading } = useQuery({
    queryKey: ["precios_productos_mes", anio, mes],
    queryFn: async () => {
      if (!mes) return [];
      const { data, error } = await db
        .from("precios_productos_mes" as any)
        .select("*")
        .eq("anio", anio)
        .eq("mes", mes);
      if (error) throw error;
      return (data || []) as unknown as PrecioProductoMes[];
    },
    enabled: !!mes && !!companyId,
  });

  // Index by producto for fast lookup
  const preciosPorProducto: PreciosMesMap = {};
  for (const p of precios) {
    preciosPorProducto[p.producto] = p.precio_unitario;
  }

  const upsertMutation = useMutation({
    mutationFn: async ({
      producto,
      precio,
    }: {
      producto: string;
      precio: number;
    }) => {
      if (!mes) throw new Error("Mes no seleccionado");
      if (!companyId) throw new Error("No hay empresa activa");
      const { error } = await db
        .from("precios_productos_mes" as any)
        .upsert(
          {
            company_id: companyId,
            anio,
            mes,
            producto,
            precio_unitario: precio,
          },
          { onConflict: "company_id,anio,mes,producto" }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["precios_productos_mes", anio, mes],
      });
      toast.success("Precio guardado");
    },
    onError: (err: Error) => {
      toast.error("Error al guardar precio: " + err.message);
    },
  });

  return {
    precios,
    preciosPorProducto,
    isLoading,
    upsertPrecio: upsertMutation.mutate,
    isSaving: upsertMutation.isPending,
  };
}

export function usePreciosTodos(anio: number) {
  const { membership } = useAuth();
  const { data: precios = [] } = useQuery({
    queryKey: ["precios_productos_mes_todos", anio],
    queryFn: async () => {
      const { data, error } = await db
        .from("precios_productos_mes" as any)
        .select("*")
        .eq("anio", anio);
      if (error) throw error;
      return (data || []) as unknown as PrecioProductoMes[];
    },
    enabled: Boolean(membership?.company_id),
  });

  // Mapa indexado por "mes-producto" → precio
  const preciosPorMesProducto: Record<string, number> = {};
  for (const p of precios) {
    preciosPorMesProducto[`${p.mes}-${p.producto}`] = p.precio_unitario;
  }

  return { preciosPorMesProducto };
}
