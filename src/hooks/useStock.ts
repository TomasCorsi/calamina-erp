import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
  const [items, setItems] = useState<StockItemDB[]>([]);
  const [movimientos, setMovimientos] = useState<MovimientoWithRelations[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchItems = async () => {
    setLoading(true);
    const { data, error } = await supabase
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
    const { data, error } = await supabase
      .from("movimientos_stock")
      .select(`
        *,
        item:stock_items(nombre, codigo),
        obra:obras(nombre),
        responsable:personal(nombre, apellido)
      `)
      .order("fecha", { ascending: false })
      .limit(100);

    if (error) {
      console.error("Error fetching movimientos:", error);
    } else {
      setMovimientos(data || []);
    }
  };

  const createItem = async (item: StockItemForm) => {
    const { data, error } = await supabase
      .from("stock_items")
      .insert([item])
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
    const { error } = await supabase
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
    const { error } = await supabase
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
    // First, create the movement
    const { data, error } = await supabase
      .from("movimientos_stock")
      .insert([mov])
      .select()
      .single();

    if (error) {
      console.error("Error creating movimiento:", error);
      toast.error("Error al registrar movimiento");
      return null;
    }

    // Update the stock item
    const { error: updateError } = await supabase
      .from("stock_items")
      .update({ stock_actual: mov.stock_nuevo })
      .eq("id", mov.item_id);

    if (updateError) {
      console.error("Error updating stock:", updateError);
      toast.error("Error al actualizar stock");
    }

    toast.success("Movimiento registrado correctamente");
    await fetchItems();
    await fetchMovimientos();
    return data;
  };

  useEffect(() => {
    fetchItems();
    fetchMovimientos();
  }, []);

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
