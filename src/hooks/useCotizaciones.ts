import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabaseV2 as supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

const db = supabase as any;

export type EstadoCotizacion = "borrador" | "enviada" | "aprobada" | "rechazada" | "vencida";
export interface CotizacionDB { id: string; numero: string; obra_id: string | null; descripcion: string; estado: EstadoCotizacion; fecha_creacion: string; fecha_vencimiento: string; responsable: string; subtotal: number; iva: number; total: number; notas: string | null; moneda?: string; anticipo_tipo?: string; anticipo_valor?: number; anticipo_monto?: number; created_at: string; updated_at: string; }
export interface CotizacionCategoriaDB { id: string; cotizacion_id: string; numero: number; nombre: string; orden: number; created_at: string; }
export interface CotizacionItemDB { id: string; cotizacion_id: string; categoria_id: string | null; numero: string | null; descripcion: string; unidad: string; cantidad: number; cantidad_m2: number; altura_promedio: number; cantidad_m3: number; precio_unitario: number; subtotal: number; total: number; created_at: string; }
export interface CotizacionAnticipoDB { id: string; cotizacion_id: string; descripcion: string; tipo: string; valor: number; monto: number; orden: number; }
export interface CotizacionAnticipoForm { descripcion: string; tipo: string; valor: number; monto: number; }
export interface CotizacionWithRelations extends CotizacionDB { obra?: { nombre: string }; items?: CotizacionItemDB[]; categorias?: CotizacionCategoriaDB[]; anticipos?: CotizacionAnticipoDB[]; }
export interface CotizacionForm { numero: string; obra_id?: string; descripcion: string; estado: EstadoCotizacion; fecha_creacion: string; fecha_vencimiento: string; responsable: string; subtotal: number; iva: number; total: number; notas?: string; moneda?: string; anticipo_tipo?: string; anticipo_valor?: number; anticipo_monto?: number; }
export interface CotizacionCategoriaForm { numero: number; nombre: string; orden: number; }
export interface CotizacionItemForm { categoria_id?: string; categoria_index?: number; numero: string; descripcion: string; unidad: string; cantidad: number; cantidad_m2: number; altura_promedio: number; cantidad_m3: number; precio_unitario: number; subtotal: number; total: number; }

export const UNIDADES = [
  { value: "m²", label: "M²" }, { value: "m³", label: "M³" }, { value: "tn", label: "TN" },
  { value: "hr", label: "HR" }, { value: "gl", label: "GL" }, { value: "un", label: "UN" },
  { value: "ml", label: "ML" }, { value: "kg", label: "KG" },
];
export function calcularM3(cantidadM2: number, alturaPromedio: number): number { return cantidadM2 * alturaPromedio; }
export function calcularTotalItem(item: CotizacionItemForm): number {
  if (item.unidad === "m³") return (item.cantidad_m3 || 0) * item.precio_unitario;
  if (item.altura_promedio > 0 && item.cantidad_m2 > 0) return item.cantidad_m2 * item.altura_promedio * item.precio_unitario;
  if (item.cantidad_m2 > 0) return item.cantidad_m2 * item.precio_unitario;
  return item.cantidad * item.precio_unitario;
}
export function calcularSubtotalItem(item: CotizacionItemForm): number { return calcularTotalItem(item); }

export function useCotizaciones() {
  const queryClient = useQueryClient();
  const { membership } = useAuth();
  const companyId = membership?.company_id;
  const query = useQuery({
    queryKey: ["cotizaciones-v2", companyId], enabled: Boolean(companyId),
    queryFn: async () => {
      const { data, error } = await db.from("cotizaciones").select(`
        *, obra:obras!cotizaciones_obra_company_fkey(nombre), items:cotizacion_items(*),
        categorias:cotizacion_categorias(*), anticipos:cotizacion_anticipos(*)
      `).eq("company_id", companyId).order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as CotizacionWithRelations[];
    },
  });
  const refresh = async () => { await queryClient.invalidateQueries({ queryKey: ["cotizaciones-v2"] }); };
  const createCotizacion = async (cot: CotizacionForm, categorias: CotizacionCategoriaForm[], items: CotizacionItemForm[], anticipos: CotizacionAnticipoForm[] = []) => {
    const { data, error } = await db.schema("api").rpc("save_quote", { p_quote: cot, p_categories: categorias, p_items: items, p_advances: anticipos.map((advance, orden) => ({ ...advance, orden })), p_id: null });
    if (error) { console.error(error); toast.error("Error al crear cotización"); return null; }
    toast.success("Cotización creada correctamente"); await refresh(); return { id: data };
  };
  const updateCotizacion = async (id: string, cot: Partial<CotizacionForm>, categorias?: CotizacionCategoriaForm[], items?: CotizacionItemForm[], anticipos?: CotizacionAnticipoForm[]) => {
    const result = categorias !== undefined && items !== undefined
      ? await db.schema("api").rpc("save_quote", { p_quote: cot, p_categories: categorias, p_items: items, p_advances: (anticipos ?? []).map((advance, orden) => ({ ...advance, orden })), p_id: id })
      : await db.from("cotizaciones").update(cot).eq("id", id).eq("company_id", companyId);
    if (result.error) { console.error(result.error); toast.error("Error al actualizar cotización"); return false; }
    toast.success("Cotización actualizada correctamente"); await refresh(); return true;
  };
  const deleteCotizacion = async (id: string) => {
    const { error } = await db.from("cotizaciones").delete().eq("id", id).eq("company_id", companyId);
    if (error) { console.error(error); toast.error("Error al eliminar cotización"); return false; }
    toast.success("Cotización eliminada correctamente"); await refresh(); return true;
  };
  return { cotizaciones: query.data ?? [], loading: query.isLoading, fetchCotizaciones: query.refetch, createCotizacion, updateCotizacion, deleteCotizacion };
}
