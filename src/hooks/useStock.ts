import { useState, useEffect } from "react";
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

export function useStock() {
  const { membership } = useAuth();
  const companyId = membership?.company_id;
  const [items, setItems] = useState<StockItemDB[]>([]);
  const [movimientos, setMovimientos] = useState<MovimientoWithRelations[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchItems = async () => {
    setLoading(true);
    if (!companyId) { setLoading(false); return; }
    const { data, error } = await db
      .from("stock_items")
      .select("*")
      .order("nombre");

    if (error) {
      console.error("Error fetching stock items:", error);
      toast.error("Error al cargar inventario");
    } else {
      setItems(data || []);
    }
    setLoading(false);
  };

  const fetchMovimientos = async () => {
    if (!companyId) return;
    const { data, error } = await db
      .from("movimientos_stock")
      .select(`
        *,
        item:stock_items(nombre, codigo),
        obra:obras(nombre),
        responsable:personal!movimientos_stock_responsable_company_fkey(first_name, last_name)
      `)
      .order("fecha", { ascending: false })
      .limit(100);

    if (error) {
      console.error("Error fetching movimientos:", error);
    } else {
      setMovimientos((data || []).map((row: any) => ({
        ...row,
        responsable: row.responsable ? { nombre: row.responsable.first_name, apellido: row.responsable.last_name } : null,
      })));
    }
  };

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
    await fetchItems();
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
    await fetchItems();
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
    await fetchItems();
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
    await fetchItems();
    await fetchMovimientos();
    return data;
  };

  useEffect(() => {
    fetchItems();
    fetchMovimientos();
  }, [companyId]);

  return {
    items,
    movimientos,
    loading,
    fetchItems,
    fetchMovimientos,
    createItem,
    updateItem,
    deleteItem,
    createMovimiento,
  };
}
