import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type EstadoCotizacion = "borrador" | "enviada" | "aprobada" | "rechazada" | "vencida";

export interface CotizacionDB {
  id: string;
  numero: string;
  obra_id: string | null;
  descripcion: string;
  estado: EstadoCotizacion;
  fecha_creacion: string;
  fecha_vencimiento: string;
  responsable: string;
  subtotal: number;
  iva: number;
  total: number;
  notas: string | null;
  moneda?: string;
  anticipo_tipo?: string;
  anticipo_valor?: number;
  anticipo_monto?: number;
  created_at: string;
  updated_at: string;
}

export interface CotizacionCategoriaDB {
  id: string;
  cotizacion_id: string;
  numero: number;
  nombre: string;
  orden: number;
  created_at: string;
}

export interface CotizacionItemDB {
  id: string;
  cotizacion_id: string;
  categoria_id: string | null;
  numero: string | null;
  descripcion: string;
  unidad: string;
  cantidad: number;
  cantidad_m2: number;
  altura_promedio: number;
  cantidad_m3: number;
  precio_unitario: number;
  subtotal: number;
  total: number;
  created_at: string;
}

export interface CotizacionAnticipoDB {
  id: string;
  cotizacion_id: string;
  descripcion: string;
  tipo: string; // 'porcentaje' | 'monto'
  valor: number;
  monto: number;
  orden: number;
}

export interface CotizacionAnticipoForm {
  descripcion: string;
  tipo: string; // 'porcentaje' | 'monto'
  valor: number;
  monto: number;
}

export interface CotizacionWithRelations extends CotizacionDB {
  obra?: { nombre: string };
  items?: CotizacionItemDB[];
  categorias?: CotizacionCategoriaDB[];
  anticipos?: CotizacionAnticipoDB[];
}


export interface CotizacionForm {
  numero: string;
  obra_id?: string;
  descripcion: string;
  estado: EstadoCotizacion;
  fecha_creacion: string;
  fecha_vencimiento: string;
  responsable: string;
  subtotal: number;
  iva: number;
  total: number;
  notas?: string;
  moneda?: string;
  anticipo_tipo?: string;
  anticipo_valor?: number;
  anticipo_monto?: number;
}

export interface CotizacionCategoriaForm {
  numero: number;
  nombre: string;
  orden: number;
}

export interface CotizacionItemForm {
  categoria_id?: string;
  categoria_index?: number; // For temporary tracking before saving
  numero: string;
  descripcion: string;
  unidad: string;
  cantidad: number;
  cantidad_m2: number;
  altura_promedio: number;
  cantidad_m3: number;
  precio_unitario: number;
  subtotal: number;
  total: number;
}

// Available units
export const UNIDADES = [
  { value: "m²", label: "M²" },
  { value: "m³", label: "M³" },
  { value: "tn", label: "TN" },
  { value: "hr", label: "HR" },
  { value: "gl", label: "GL" },
  { value: "un", label: "UN" },
  { value: "ml", label: "ML" },
  { value: "kg", label: "KG" },
];

// Calculate M3 from M2 and height
export function calcularM3(cantidadM2: number, alturaPromedio: number): number {
  return cantidadM2 * alturaPromedio;
}

// Calculate item total based on unit
export function calcularTotalItem(item: CotizacionItemForm): number {
  // If unit is M³, use cantidad_m3 directly (manual input)
  if (item.unidad === "m³") {
    return (item.cantidad_m3 || 0) * item.precio_unitario;
  }
  
  // If there's a height value, calculate using M3 (M2 × Altura = M3)
  if (item.altura_promedio > 0 && item.cantidad_m2 > 0) {
    const m3 = item.cantidad_m2 * item.altura_promedio;
    return m3 * item.precio_unitario;
  }
  
  // For all other units - use cantidad_m2 as the quantity field
  // (since M2 column is being repurposed as the general quantity input)
  if (item.cantidad_m2 > 0) {
    return item.cantidad_m2 * item.precio_unitario;
  }
  
  // Fallback to cantidad
  return item.cantidad * item.precio_unitario;
}

// Calculate subtotal for an item (same as total for now)
export function calcularSubtotalItem(item: CotizacionItemForm): number {
  return calcularTotalItem(item);
}

export function useCotizaciones() {
  const [cotizaciones, setCotizaciones] = useState<CotizacionWithRelations[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCotizaciones = async () => {
    setLoading(true);
    const { data, error } = await (supabase
      .from("cotizaciones")
      .select(`
        *,
        obra:obras(nombre),
        items:cotizacion_items(*),
        categorias:cotizacion_categorias(*),
        anticipos:cotizacion_anticipos(*)

      `)
      .order("created_at", { ascending: false }) as any);

    if (error) {
      console.error("Error fetching cotizaciones:", error);
      toast.error("Error al cargar cotizaciones");
    } else {
      setCotizaciones((data || []) as CotizacionWithRelations[]);
    }
    setLoading(false);
  };

  const guardarAnticipos = async (cotizacionId: string, anticipos: CotizacionAnticipoForm[]) => {
    await supabase.from("cotizacion_anticipos").delete().eq("cotizacion_id", cotizacionId);
    const validos = (anticipos || []).filter((a) => (a.valor || 0) > 0);
    if (validos.length === 0) return;
    const { error } = await supabase.from("cotizacion_anticipos").insert(
      validos.map((a, i) => ({
        cotizacion_id: cotizacionId,
        descripcion: a.descripcion || "Anticipo",
        tipo: a.tipo,
        valor: a.valor,
        monto: a.monto,
        orden: i,
      }))
    );
    if (error) console.error("Error guardando anticipos:", error);
  };

  const createCotizacion = async (
    cot: CotizacionForm, 
    categorias: CotizacionCategoriaForm[], 
    items: CotizacionItemForm[],
    anticipos: CotizacionAnticipoForm[] = []
  ) => {

    // 1. Create the cotizacion
    const { data: cotData, error: cotError } = await supabase
      .from("cotizaciones")
      .insert([{
        numero: cot.numero || null,
        obra_id: cot.obra_id || null,
        descripcion: cot.descripcion || null,
        estado: cot.estado,
        fecha_creacion: cot.fecha_creacion || null,
        fecha_vencimiento: cot.fecha_vencimiento || null,
        responsable: cot.responsable || null,
        subtotal: cot.subtotal,
        iva: cot.iva,
        total: cot.total,
        notas: cot.notas || null,
        moneda: cot.moneda || 'ARS',
        anticipo_tipo: cot.anticipo_tipo || 'ninguno',
        anticipo_valor: cot.anticipo_valor ?? 0,
        anticipo_monto: cot.anticipo_monto ?? 0,
      } as any])
      .select()
      .single();

    if (cotError) {
      console.error("Error creating cotizacion:", cotError);
      toast.error("Error al crear cotización");
      return null;
    }

    // 2. Create categories and map their IDs
    const categoryIdMap: Record<number, string> = {};
    
    if (categorias.length > 0) {
      const categoriasWithCotId = categorias.map(cat => ({
        cotizacion_id: cotData.id,
        numero: cat.numero,
        nombre: cat.nombre,
        orden: cat.orden,
      }));

      const { data: catData, error: catError } = await supabase
        .from("cotizacion_categorias")
        .insert(categoriasWithCotId)
        .select();

      if (catError) {
        console.error("Error creating categorias:", catError);
        toast.error("Error al crear categorías");
      } else if (catData) {
        catData.forEach((cat, index) => {
          categoryIdMap[index] = cat.id;
        });
      }
    }

    // 3. Create items with category references
    if (items.length > 0) {
      const itemsWithCotId = items.map(item => ({
        cotizacion_id: cotData.id,
        categoria_id: item.categoria_index !== undefined ? categoryIdMap[item.categoria_index] : null,
        numero: item.numero,
        descripcion: item.descripcion,
        unidad: item.unidad,
        cantidad: item.cantidad,
        cantidad_m2: item.cantidad_m2,
        altura_promedio: item.altura_promedio,
        cantidad_m3: item.cantidad_m3,
        precio_unitario: item.precio_unitario,
        subtotal: item.subtotal,
        total: item.total,
      }));

      const { error: itemsError } = await supabase
        .from("cotizacion_items")
        .insert(itemsWithCotId);

      if (itemsError) {
        console.error("Error creating cotizacion items:", itemsError);
        toast.error("Error al crear ítems de cotización");
      }
    }

    // 4. Anticipos
    await guardarAnticipos(cotData.id, anticipos);

    toast.success("Cotización creada correctamente");
    await fetchCotizaciones();
    return cotData;
  };

  const updateCotizacion = async (
    id: string, 
    cot: Partial<CotizacionForm>,
    categorias?: CotizacionCategoriaForm[],
    items?: CotizacionItemForm[],
    anticipos?: CotizacionAnticipoForm[]

  ) => {
    // Update the cotizacion
    const sanitized: Record<string, any> = { ...cot };
    if (sanitized.obra_id !== undefined) sanitized.obra_id = sanitized.obra_id || null;
    if (sanitized.numero !== undefined) sanitized.numero = sanitized.numero || null;
    if (sanitized.descripcion !== undefined) sanitized.descripcion = sanitized.descripcion || null;
    if (sanitized.responsable !== undefined) sanitized.responsable = sanitized.responsable || null;
    if (sanitized.fecha_vencimiento !== undefined) sanitized.fecha_vencimiento = sanitized.fecha_vencimiento || null;
    if (sanitized.fecha_creacion !== undefined) sanitized.fecha_creacion = sanitized.fecha_creacion || null;
    
    const { error } = await supabase
      .from("cotizaciones")
      .update(sanitized as any)
      .eq("id", id);

    if (error) {
      console.error("Error updating cotizacion:", error);
      toast.error("Error al actualizar cotización");
      return false;
    }

    // If categories and items are provided, update them
    if (categorias !== undefined && items !== undefined) {
      // Delete existing categories (cascades to items)
      await supabase
        .from("cotizacion_categorias")
        .delete()
        .eq("cotizacion_id", id);

      // Delete existing items without category
      await supabase
        .from("cotizacion_items")
        .delete()
        .eq("cotizacion_id", id);

      // Create new categories and map their IDs
      const categoryIdMap: Record<number, string> = {};
      
      if (categorias.length > 0) {
        const categoriasWithCotId = categorias.map(cat => ({
          cotizacion_id: id,
          numero: cat.numero,
          nombre: cat.nombre,
          orden: cat.orden,
        }));

        const { data: catData, error: catError } = await supabase
          .from("cotizacion_categorias")
          .insert(categoriasWithCotId)
          .select();

        if (catError) {
          console.error("Error creating categorias:", catError);
        } else if (catData) {
          catData.forEach((cat, index) => {
            categoryIdMap[index] = cat.id;
          });
        }
      }

      // Create new items
      if (items.length > 0) {
        const itemsWithCotId = items.map(item => ({
          cotizacion_id: id,
          categoria_id: item.categoria_index !== undefined ? categoryIdMap[item.categoria_index] : null,
          numero: item.numero,
          descripcion: item.descripcion,
          unidad: item.unidad,
          cantidad: item.cantidad,
          cantidad_m2: item.cantidad_m2,
          altura_promedio: item.altura_promedio,
          cantidad_m3: item.cantidad_m3,
          precio_unitario: item.precio_unitario,
          subtotal: item.subtotal,
          total: item.total,
        }));

        const { error: itemsError } = await supabase
          .from("cotizacion_items")
          .insert(itemsWithCotId);

        if (itemsError) {
          console.error("Error creating cotizacion items:", itemsError);
        }
      }
    }

    if (anticipos !== undefined) {
      await guardarAnticipos(id, anticipos);
    }



    toast.success("Cotización actualizada correctamente");
    await fetchCotizaciones();
    return true;
  };

  const deleteCotizacion = async (id: string) => {
    const { error } = await supabase
      .from("cotizaciones")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting cotizacion:", error);
      toast.error("Error al eliminar cotización");
      return false;
    }

    toast.success("Cotización eliminada correctamente");
    await fetchCotizaciones();
    return true;
  };

  useEffect(() => {
    fetchCotizaciones();
  }, []);

  return {
    cotizaciones,
    loading,
    fetchCotizaciones,
    createCotizacion,
    updateCotizacion,
    deleteCotizacion,
  };
}
