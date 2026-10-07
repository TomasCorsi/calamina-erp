import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

const db = supabase as any;

export type CategoriaStock = "material" | "repuesto" | "herramienta" | "consumible";
export type TipoMovimientoStock = "entrada" | "salida" | "ajuste";

export interface StockItemDB {
  id: string;
  codigo: string;
  nombre: string;
  categoria: CategoriaStock;
  unidad: string;
  stock_actual: number;
  stock_minimo: number;
  stock_maximo: number | null;
  ubicacion: string;
  precio_unitario: number;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export interface MovimientoStockDB {
  id: string;
  fecha: string;
  item_id: string;
  tipo: TipoMovimientoStock;
  cantidad: number;
  stock_anterior: number;
  stock_nuevo: number;
  obra_id: string | null;
  motivo: string;
  responsable_id: string;
  comprobante: string | null;
  observaciones: string | null;
  created_at: string;
}

export interface MovimientoWithRelations extends MovimientoStockDB {
  item?: { nombre: string; codigo: string };
  obra?: { nombre: string };
  responsable?: { nombre: string; apellido: string };
}

export interface StockItemForm {
  codigo: string;
  nombre: string;
  categoria: CategoriaStock;
  unidad: string;
  stock_actual: number;
  stock_minimo: number;
  stock_maximo?: number;
  ubicacion: string;
  precio_unitario: number;
  activo: boolean;
}

export interface MovimientoStockForm {
  fecha: string;
  item_id: string;
  tipo: TipoMovimientoStock;
  cantidad: number;
  stock_anterior: number;
  stock_nuevo: number;
  obra_id?: string;
  motivo: string;
  responsable_id: string;
  comprobante?: string;
  observaciones?: string;
}

export function useStock(loadMovimientos = false) {
  const { membership } = useAuth();
  const companyId = membership?.company_id;
  const queryClient = useQueryClient();

  const itemsQuery = useQuery({
    queryKey: ["stock-items-v2", companyId],
    enabled: Boolean(companyId),
    queryFn: async () => {
    const { data, error } = await db
      .from("stock_items")
      .select("id,codigo,nombre,categoria,unidad,stock_actual,stock_minimo,stock_maximo,ubicacion,precio_unitario,activo,created_at,updated_at")
      .eq("company_id", companyId)
      .order("nombre");
      if (error) throw error;
      return (data ?? []) as StockItemDB[];
    },
  });

  const movimientosQuery = useQuery({
    queryKey: ["stock-movimientos-v2", companyId],
    enabled: Boolean(companyId && loadMovimientos),
    queryFn: async () => {
    const { data, error } = await db
      .from("movimientos_stock")
      .select(`
        id,fecha,item_id,tipo,cantidad,stock_anterior,stock_nuevo,obra_id,motivo,responsable_id,comprobante,observaciones,created_at,
        item:stock_items(nombre, codigo),
        obra:obras(nombre),
        responsable:personal!movimientos_stock_responsable_company_fkey(first_name, last_name)
      `)
      .eq("company_id", companyId)
      .order("fecha", { ascending: false })
      .limit(100);
      if (error) throw error;
      return (data || []).map((row: any) => ({
        ...row,
        responsable: row.responsable ? { nombre: row.responsable.first_name, apellido: row.responsable.last_name } : null,
      })) as MovimientoWithRelations[];
    },
  });

  const fetchItems = async () => { await itemsQuery.refetch(); };
  const fetchMovimientos = async () => { await movimientosQuery.refetch(); };

  const createItem = async (item: StockItemForm) => {
    if (!companyId) return null;
    const { data, error } = await db
      .from("stock_items")
      .insert([{ company_id: companyId, ...item }])
      .select()
      .single();

    if (error) {
      console.error("Error creating stock item:", error);
      toast.error("Error al crear ítem");
      return null;
    }

    toast.success("Ítem creado correctamente");
    await queryClient.invalidateQueries({ queryKey: ["stock-items-v2", companyId] });
    return data;
  };

  const updateItem = async (id: string, item: Partial<StockItemForm>) => {
    const { error } = await db
      .from("stock_items")
      .update(item)
      .eq("id", id);

    if (error) {
      console.error("Error updating stock item:", error);
      toast.error("Error al actualizar ítem");
      return false;
    }

    toast.success("Ítem actualizado correctamente");
    await queryClient.invalidateQueries({ queryKey: ["stock-items-v2", companyId] });
    return true;
  };

  const deleteItem = async (id: string) => {
    const { error } = await db
      .from("stock_items")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting stock item:", error);
      toast.error("Error al eliminar ítem");
      return false;
    }

    toast.success("Ítem eliminado correctamente");
    await queryClient.invalidateQueries({ queryKey: ["stock-items-v2", companyId] });
    return true;
  };

  const createMovimiento = async (mov: MovimientoStockForm) => {
    const { data, error } = await db.schema("api").rpc("create_stock_movement", {
      p_fecha: mov.fecha,
      p_item_id: mov.item_id,
      p_tipo: mov.tipo,
      p_cantidad: mov.cantidad,
      p_obra_id: mov.obra_id || null,
      p_motivo: mov.motivo,
      p_responsable_id: mov.responsable_id,
      p_comprobante: mov.comprobante || null,
      p_observaciones: mov.observaciones || null,
    });

    if (error) {
      console.error("Error creating movimiento:", error);
      toast.error("Error al registrar movimiento");
      return null;
    }

    toast.success("Movimiento registrado correctamente");
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["stock-items-v2", companyId] }),
      queryClient.invalidateQueries({ queryKey: ["stock-movimientos-v2", companyId] }),
    ]);
    return data;
  };

  return {
    items: itemsQuery.data ?? [],
    movimientos: movimientosQuery.data ?? [],
    loading: itemsQuery.isLoading,
    fetchItems,
    fetchMovimientos,
    createItem,
    updateItem,
    deleteItem,
    createMovimiento,
  };
}
