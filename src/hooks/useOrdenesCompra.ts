import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type EstadoOrdenCompra = "borrador" | "emitida" | "recibida" | "cancelada";
export type MonedaOrdenCompra = "ARS" | "USD";

export interface OrdenCompraItemDB {
  id: string;
  orden_id: string;
  articulo: string | null;
  descripcion: string;
  unidad: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  orden: number;
  created_at: string;
}

export interface OrdenCompraItemForm {
  id?: string;
  articulo?: string | null;
  descripcion: string;
  unidad: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  orden: number;
}

export interface OrdenCompraDB {
  id: string;
  numero: string;
  numero_factura: string | null;
  fecha: string;
  proveedor_id: string | null;
  obra_id: string | null;
  maquinaria_id: string | null;
  sector: string | null;
  estado: EstadoOrdenCompra;
  incluir_iva: boolean;
  iva_porcentaje: number;
  percepcion_iva: number;
  percepcion_iibb: number;
  moneda: MonedaOrdenCompra;
  subtotal: number;
  iva: number;
  total: number;
  condiciones_pago: string | null;
  fecha_entrega_estimada: string | null;
  observaciones: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrdenCompraWithRelations extends OrdenCompraDB {
  proveedor?: {
    id: string;
    nombre: string;
    cuit: string | null;
    direccion: string | null;
    localidad: string | null;
    telefono: string | null;
    email: string | null;
    contacto: string | null;
  } | null;
  obra?: { id: string; nombre: string; numero: string | null } | null;
  maquinaria?: { id: string; codigo: string | null; nombre: string | null; patente: string | null; tipo: string } | null;
  items?: OrdenCompraItemDB[];
}

export interface OrdenCompraForm {
  numero?: string;
  numero_factura?: string;
  fecha: string;
  proveedor_id: string;
  obra_id?: string | null;
  maquinaria_id?: string | null;
  sector?: string | null;
  estado: EstadoOrdenCompra;
  incluir_iva: boolean;
  iva_porcentaje: number;
  percepcion_iva: number;
  percepcion_iibb: number;
  moneda: MonedaOrdenCompra;
  condiciones_pago?: string;
  fecha_entrega_estimada?: string;
  observaciones?: string;
  items: OrdenCompraItemForm[];
}

const fetchOrdenes = async (): Promise<OrdenCompraWithRelations[]> => {
  const { data, error } = await supabase
    .from("ordenes_compra")
    .select(`
      *,
      proveedor:proveedores(id, nombre, cuit, direccion, localidad, telefono, email, contacto),
      obra:obras(id, nombre, numero),
      maquinaria:maquinarias(id, codigo, nombre, patente, tipo),
      items:orden_compra_items(*)
    `)
    .order("fecha", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data as any) || [];
};

function calcTotales(
  items: OrdenCompraItemForm[],
  incluirIva: boolean,
  ivaPct: number,
  percIva: number,
  percIibb: number,
) {
  const subtotal = items.reduce(
    (sum, it) => sum + (Number(it.cantidad) || 0) * (Number(it.precio_unitario) || 0),
    0,
  );
  const iva = incluirIva ? subtotal * ((Number(ivaPct) || 0) / 100) : 0;
  const total = subtotal + iva + (Number(percIva) || 0) + (Number(percIibb) || 0);
  return { subtotal, iva, total };
}

function buildPayload(form: OrdenCompraForm, includeNumero = false) {
  const { subtotal, iva, total } = calcTotales(
    form.items,
    form.incluir_iva,
    form.iva_porcentaje,
    form.percepcion_iva,
    form.percepcion_iibb,
  );
  const payload: any = {
    fecha: form.fecha,
    proveedor_id: form.proveedor_id || null,
    obra_id: form.obra_id || null,
    maquinaria_id: form.maquinaria_id || null,
    sector: form.sector?.trim() || null,
    estado: form.estado,
    incluir_iva: form.incluir_iva,
    iva_porcentaje: Number(form.iva_porcentaje) || 0,
    percepcion_iva: Number(form.percepcion_iva) || 0,
    percepcion_iibb: Number(form.percepcion_iibb) || 0,
    moneda: form.moneda || "ARS",
    subtotal,
    iva,
    total,
    condiciones_pago: form.condiciones_pago?.trim() || null,
    fecha_entrega_estimada: form.fecha_entrega_estimada || null,
    observaciones: form.observaciones?.trim() || null,
    numero_factura: form.numero_factura?.trim() || null,
  };
  if (includeNumero && form.numero?.trim()) {
    payload.numero = form.numero.trim();
  }
  return payload;
}

export function useOrdenesCompra() {
  const queryClient = useQueryClient();

  const { data: ordenes = [], isLoading: loading, refetch } = useQuery({
    queryKey: ["ordenes_compra"],
    queryFn: fetchOrdenes,
  });

  const createMutation = useMutation({
    mutationFn: async (form: OrdenCompraForm) => {
      const { data: orden, error } = await supabase
        .from("ordenes_compra")
        .insert([{ numero: "", ...buildPayload(form) }])
        .select()
        .single();
      if (error) throw error;

      if (form.items.length > 0) {
        const itemsToInsert = form.items.map((it, idx) => ({
          orden_id: orden.id,
          articulo: it.articulo?.trim() || null,
          descripcion: it.descripcion,
          unidad: it.unidad || "un",
          cantidad: Number(it.cantidad) || 0,
          precio_unitario: Number(it.precio_unitario) || 0,
          subtotal: (Number(it.cantidad) || 0) * (Number(it.precio_unitario) || 0),
          orden: idx,
        }));
        const { error: itemsErr } = await supabase.from("orden_compra_items").insert(itemsToInsert);
        if (itemsErr) throw itemsErr;
      }
      return orden;
    },
    onSuccess: () => {
      toast.success("Orden de compra creada");
      queryClient.invalidateQueries({ queryKey: ["ordenes_compra"] });
    },
    onError: (e) => {
      console.error(e);
      toast.error("Error al crear orden de compra");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, form }: { id: string; form: OrdenCompraForm }) => {
      const { error } = await supabase
        .from("ordenes_compra")
        .update(buildPayload(form, true))
        .eq("id", id);
      if (error) throw error;


      const { error: delErr } = await supabase.from("orden_compra_items").delete().eq("orden_id", id);
      if (delErr) throw delErr;

      if (form.items.length > 0) {
        const itemsToInsert = form.items.map((it, idx) => ({
          orden_id: id,
          articulo: it.articulo?.trim() || null,
          descripcion: it.descripcion,
          unidad: it.unidad || "un",
          cantidad: Number(it.cantidad) || 0,
          precio_unitario: Number(it.precio_unitario) || 0,
          subtotal: (Number(it.cantidad) || 0) * (Number(it.precio_unitario) || 0),
          orden: idx,
        }));
        const { error: insErr } = await supabase.from("orden_compra_items").insert(itemsToInsert);
        if (insErr) throw insErr;
      }
    },
    onSuccess: () => {
      toast.success("Orden actualizada");
      queryClient.invalidateQueries({ queryKey: ["ordenes_compra"] });
    },
    onError: (e) => {
      console.error(e);
      toast.error("Error al actualizar orden");
    },
  });

  const updateEstadoMutation = useMutation({
    mutationFn: async ({ id, estado }: { id: string; estado: EstadoOrdenCompra }) => {
      const { error } = await supabase.from("ordenes_compra").update({ estado }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Estado actualizado");
      queryClient.invalidateQueries({ queryKey: ["ordenes_compra"] });
    },
    onError: (e) => {
      console.error(e);
      toast.error("Error al cambiar estado");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ordenes_compra").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Orden eliminada");
      queryClient.invalidateQueries({ queryKey: ["ordenes_compra"] });
    },
    onError: (e) => {
      console.error(e);
      toast.error("Error al eliminar orden");
    },
  });

  return {
    ordenes,
    loading,
    refetch,
    createOrden: async (form: OrdenCompraForm) => {
      try { return await createMutation.mutateAsync(form); } catch { return null; }
    },
    updateOrden: async (id: string, form: OrdenCompraForm) => {
      try { await updateMutation.mutateAsync({ id, form }); return true; } catch { return false; }
    },
    updateEstado: async (id: string, estado: EstadoOrdenCompra) => {
      try { await updateEstadoMutation.mutateAsync({ id, estado }); return true; } catch { return false; }
    },
    deleteOrden: async (id: string) => {
      try { await deleteMutation.mutateAsync(id); return true; } catch { return false; }
    },
  };
}
