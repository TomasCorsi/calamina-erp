import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabaseV2 as supabase } from "@/integrations/supabase/client";
import type { ClienteDB } from "@/hooks/useClientes";
import type { ObraWithRelations } from "@/hooks/useObras";
import type { MaquinariaWithRelations, TipoMaquinaria, EstadoMaquinaria } from "@/hooks/useMaquinarias";

type Catalogs = { obras: ObraWithRelations[]; maquinarias: MaquinariaWithRelations[]; clientes: ClienteDB[] };

export function useRemitosCatalogs() {
  const { membership, hasPermission } = useAuth();
  const companyId = membership?.company_id;
  const query = useQuery({
    queryKey: ["remitos-catalogs-v2", companyId],
    enabled: Boolean(companyId && hasPermission("remitos.view")),
    queryFn: async (): Promise<Catalogs> => {
      const [obrasResult, maquinasResult, clientesResult] = await Promise.all([
        supabase.from("obras").select("id,nombre,numero,ubicacion,descripcion,estado,fecha_inicio,fecha_fin_estimada,responsable_id,cliente_id,created_at,updated_at").eq("company_id", companyId!).order("nombre"),
        supabase.from("maquinarias").select("id,codigo,nombre,tipo,patente,estado,created_at,updated_at").eq("company_id", companyId!).order("codigo"),
        supabase.from("clientes").select("id,nombre,cuit,direccion,localidad,telefono,email,activo,created_at,updated_at").eq("company_id", companyId!).order("nombre"),
      ]);
      if (obrasResult.error) throw obrasResult.error;
      if (maquinasResult.error) throw maquinasResult.error;
      if (clientesResult.error) throw clientesResult.error;

      const clientes = (clientesResult.data ?? []).map((row) => ({
        id: String(row.id), nombre: String(row.nombre), cuit: row.cuit == null ? null : String(row.cuit),
        direccion: row.direccion == null ? null : String(row.direccion), localidad: row.localidad == null ? null : String(row.localidad),
        telefono: row.telefono == null ? null : String(row.telefono), email: row.email == null ? null : String(row.email),
        contacto: null, observaciones: null, activo: Boolean(row.activo), created_at: String(row.created_at), updated_at: String(row.updated_at),
      }));
      const clientesById = new Map(clientes.map((cliente) => [cliente.id, cliente]));
      const obras = (obrasResult.data ?? []).map((row) => ({
        ...row,
        id: String(row.id), nombre: String(row.nombre), estado: row.estado as ObraWithRelations["estado"],
        cliente: row.cliente_id ? clientesById.get(String(row.cliente_id)) ?? null : null,
        responsable: null,
      })) as ObraWithRelations[];
      const maquinarias = (maquinasResult.data ?? []).map((row) => ({
        id: String(row.id), codigo: row.codigo == null ? "" : String(row.codigo), nombre: row.nombre == null ? "" : String(row.nombre),
        tipo: row.tipo as TipoMaquinaria, marca: "", anio: 0, patente: row.patente == null ? null : String(row.patente),
        estado: row.estado as EstadoMaquinaria, horas_acumuladas: 0, km_acumulados: 0,
        operador_asignado_id: null, obra_id: null, created_at: String(row.created_at), updated_at: String(row.updated_at),
        operador: null, obra: null,
      })) satisfies MaquinariaWithRelations[];
      return { obras, maquinarias, clientes };
    },
  });

  return { ...(query.data ?? { obras: [], maquinarias: [], clientes: [] }), loading: query.isLoading, error: query.error };
}
