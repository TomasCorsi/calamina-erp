import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ReporteObraParams {
  obraId: string | null;
  fechaDesde?: string; // YYYY-MM-DD
  fechaHasta?: string; // YYYY-MM-DD
}

export interface PersonalRow {
  personal_id: string;
  nombre: string;
  rol: string | null;
  dias: number;
  horas: number;
  viajes: number;
  ausencias: number;
  costoEstimado: number;
}

export interface HorasMaquinaRow {
  maquinaria_id: string;
  codigo: string | null;
  nombre: string | null;
  patente: string | null;
  tipo: string | null;
  dias: number;
  horas: number;
  operadores: number;
}

export interface MaquinariaUsadaRow {
  maquinaria_id: string;
  codigo: string | null;
  nombre: string | null;
  patente: string | null;
  tipo: string | null;
  horas: number;
}

export interface CombustibleRow {
  maquinaria_id: string | null;
  codigo: string | null;
  nombre: string | null;
  patente: string | null;
  litros: number;
  costo: number;
  cargas: number;
}

export interface RemitoRow {
  material: string;
  tipo: string;
  remitos: number;
  viajes: number;
  cantidad: number;
  unidad: string;
  total: number;
}

export interface OrdenCompraRow {
  id: string;
  numero: string;
  fecha: string;
  proveedor: string;
  descripcion: string;
  total: number;
  estado: string;
}

export interface OtrosGastosRow {
  categoria: string;
  sector: string | null;
  items: number;
  monto: number;
}

export interface ReporteObraData {
  obra: {
    id: string;
    nombre: string;
    numero: string | null;
    estado: string;
    ubicacion: string | null;
    fecha_inicio: string | null;
    fecha_fin_estimada: string | null;
    cliente: string | null;
  } | null;
  esCantera: boolean;
  personal: PersonalRow[];
  horasMaquina: HorasMaquinaRow[];
  maquinarias: MaquinariaUsadaRow[];
  combustible: CombustibleRow[];
  remitos: RemitoRow[];
  ordenesCompra: OrdenCompraRow[];
  otrosGastos: OtrosGastosRow[];
  cotizado: number;
  totales: {
    personalDias: number;
    personalHoras: number;
    personalCosto: number;
    horasMaquinaTotal: number;
    combustibleLitros: number;
    combustibleCosto: number;
    remitosTotal: number;
    ordenesCompraTotal: number;
    otrosGastosTotal: number;
    gastosTotal: number;
    ingresosRemitos: number;
    balance: number;
    rentabilidad: number;
  };
}

const between = <T extends { fecha?: string | null }>(rows: T[], desde?: string, hasta?: string) => {
  if (!desde && !hasta) return rows;
  return rows.filter((r) => {
    const f = r.fecha;
    if (!f) return false;
    if (desde && f < desde) return false;
    if (hasta && f > hasta) return false;
    return true;
  });
};

async function fetchAll<T>(builder: any): Promise<T[]> {
  // Single fetch with high limit; for huge obras you could paginate.
  const { data, error } = await builder.range(0, 9999);
  if (error) throw error;
  return (data as T[]) || [];
}

export function useReporteObra({ obraId, fechaDesde, fechaHasta }: ReporteObraParams) {
  return useQuery({
    queryKey: ["reporte-obra", obraId, fechaDesde, fechaHasta],
    enabled: !!obraId,
    queryFn: async (): Promise<ReporteObraData> => {
      if (!obraId) throw new Error("Obra requerida");

      // Obra + cliente (fetch first to detect cantera for remitos query)
      const obraRes = await supabase
        .from("obras")
        .select("id, nombre, numero, estado, ubicacion, fecha_inicio, fecha_fin_estimada, cliente_id")
        .eq("id", obraId)
        .maybeSingle();

      if (obraRes.error) throw obraRes.error;

      // Detect cantera early to ampliar query de remitos
      const normalizeName = (s: string) =>
        (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
      const obraNombreNorm = normalizeName(obraRes.data?.nombre || "");
      const esCantera =
        obraNombreNorm.includes("cantera san vicente") ||
        obraNombreNorm.includes("canteras del gaucho") ||
        obraNombreNorm.includes("cantera del gaucho");

      // Pattern para matchear remitos por campo "desde"
      let canteraDesdePattern: string | null = null;
      if (esCantera) {
        if (obraNombreNorm.includes("san vicente")) canteraDesdePattern = "%san vicente%";
        else if (obraNombreNorm.includes("gaucho")) canteraDesdePattern = "%gaucho%";
      }

      // Remitos: query A por obra_id; si es cantera, query B adicional por `desde ilike`.
      const remitosByObraQuery = supabase.from("remitos").select("*").eq("obra_id", obraId);
      const remitosByDesdeQuery = canteraDesdePattern
        ? supabase.from("remitos").select("*").ilike("desde", canteraDesdePattern)
        : null;

      const [
        partesAll,
        horasMaqAll,
        maquinariasAll,
        personalAll,
        combAll,
        combRepAll,
        preciosAll,
        remitosByObra,
        remitosByDesde,
        ordenesAll,
        otrosAll,
        cotsAll,
      ] = await Promise.all([
        fetchAll<any>(supabase.from("partes_diarios").select("*").eq("obra_id", obraId)),
        fetchAll<any>(supabase.from("horas_maquina").select("*").eq("obra_id", obraId)),
        fetchAll<any>(supabase.from("maquinarias").select("id, codigo, nombre, patente, tipo")),
        fetchAll<any>(supabase.from("personal").select("id, nombre, apellido, rol, sueldo, sueldo_negro")),
        Promise.resolve([] as any[]),
        fetchAll<any>(supabase.from("cargas_combustible_repartidor").select("*").eq("obra_id", obraId)),
        fetchAll<any>(supabase.from("precios_productos_mes" as any).select("*")),
        fetchAll<any>(remitosByObraQuery),
        remitosByDesdeQuery ? fetchAll<any>(remitosByDesdeQuery) : Promise.resolve([] as any[]),
        fetchAll<any>(
          supabase
            .from("ordenes_compra")
            .select("*, proveedor:proveedores(nombre), items:orden_compra_items(descripcion)")
            .eq("obra_id", obraId)
        ),
        fetchAll<any>(supabase.from("otros_gastos").select("*").eq("obra_id", obraId)),
        fetchAll<any>(
          supabase.from("cotizaciones").select("id, total, estado, fecha_creacion, obra_id").eq("obra_id", obraId)
        ),
      ]);

      // Merge remitos deduplicando por id
      const remitosMap = new Map<string, any>();
      [...(remitosByObra || []), ...(remitosByDesde || [])].forEach((r: any) => {
        if (r?.id) remitosMap.set(r.id, r);
      });
      const remitosAll = Array.from(remitosMap.values());

      let clienteNombre: string | null = null;
      if (obraRes.data?.cliente_id) {
        const { data: cli } = await supabase
          .from("clientes")
          .select("nombre")
          .eq("id", obraRes.data.cliente_id)
          .maybeSingle();
        clienteNombre = cli?.nombre || null;
      }

      // Maps
      const maqMap = new Map<string, any>();
      maquinariasAll.forEach((m: any) => maqMap.set(m.id, m));
      const perMap = new Map<string, any>();
      personalAll.forEach((p: any) => perMap.set(p.id, p));

      // Filter by date
      const partes = between(partesAll, fechaDesde, fechaHasta).filter((p: any) => p.estado === "completado");
      const horasMaq = between(horasMaqAll, fechaDesde, fechaHasta);
      const cargas = between(combAll, fechaDesde, fechaHasta);
      const cargasRep = between(combRepAll, fechaDesde, fechaHasta);
      const remitos = between(remitosAll, fechaDesde, fechaHasta);
      const ordenes = between(ordenesAll, fechaDesde, fechaHasta);
      const otros = between(otrosAll, fechaDesde, fechaHasta);
      const cots = cotsAll.filter((c: any) => {
        if (c.estado !== "aprobada") return false;
        const f = c.fecha_creacion;
        if (!f) return true;
        if (fechaDesde && f < fechaDesde) return false;
        if (fechaHasta && f > fechaHasta) return false;
        return true;
      });

      // (esCantera ya fue detectado arriba)

      // ---- Personal ----
      const persMap = new Map<string, PersonalRow>();
      partes.forEach((p: any) => {
        const id = p.personal_id;
        if (!id) return;
        const per = perMap.get(id);
        const nombre = per ? `${per.apellido || ""} ${per.nombre || ""}`.trim() : "(sin datos)";
        const cur: PersonalRow =
          persMap.get(id) ||
          { personal_id: id, nombre, rol: per?.rol || null, dias: 0, horas: 0, viajes: 0, ausencias: 0, costoEstimado: 0 };
        cur.dias += 1;
        let horas = 0;
        if (p.hora_entrada && p.hora_salida) {
          const [eh, em] = String(p.hora_entrada).split(":").map(Number);
          const [sh, sm] = String(p.hora_salida).split(":").map(Number);
          horas = Math.max(0, sh + sm / 60 - (eh + em / 60));
        }
        cur.horas += horas;
        cur.viajes += p.cantidad_viajes || 0;
        cur.ausencias += Array.isArray(p.ausencias) ? p.ausencias.length : 0;
        persMap.set(id, cur);
      });
      // Estimate cost per person: (sueldo + sueldo_negro) / 22 * días
      persMap.forEach((row, id) => {
        const per = perMap.get(id);
        const sueldoTotal = (Number(per?.sueldo) || 0) + (Number(per?.sueldo_negro) || 0);
        const jornal = sueldoTotal > 0 ? sueldoTotal / 22 : 0;
        row.costoEstimado = jornal * row.dias;
      });
      const personal = Array.from(persMap.values()).sort((a, b) => a.nombre.localeCompare(b.nombre));

      // ---- Horas Máquina ----
      const horasMap = new Map<string, HorasMaquinaRow & { opSet: Set<string>; diasSet: Set<string> }>();
      const useHM = horasMaq.length > 0 ? horasMaq : null;
      if (useHM) {
        useHM.forEach((h: any) => {
          const id = h.maquinaria_id;
          if (!id) return;
          const m = maqMap.get(id);
          const cur =
            horasMap.get(id) ||
            {
              maquinaria_id: id,
              codigo: m?.codigo || null,
              nombre: m?.nombre || null,
              patente: m?.patente || null,
              tipo: m?.tipo || null,
              dias: 0,
              horas: 0,
              operadores: 0,
              opSet: new Set<string>(),
              diasSet: new Set<string>(),
            };
          cur.horas += Number(h.horas_trabajadas) || 0;
          if (h.fecha) cur.diasSet.add(h.fecha);
          if (h.operador_id) cur.opSet.add(h.operador_id);
          horasMap.set(id, cur);
        });
      } else {
        // Fallback from partes
        partes.forEach((p: any) => {
          const id = p.maquinaria_id;
          if (!id) return;
          const m = maqMap.get(id);
          const cur =
            horasMap.get(id) ||
            {
              maquinaria_id: id,
              codigo: m?.codigo || null,
              nombre: m?.nombre || null,
              patente: m?.patente || null,
              tipo: m?.tipo || null,
              dias: 0,
              horas: 0,
              operadores: 0,
              opSet: new Set<string>(),
              diasSet: new Set<string>(),
            };
          const horas = Math.max(0, (Number(p.horometro_fin) || 0) - (Number(p.horometro_inicio) || 0));
          cur.horas += horas;
          if (p.fecha) cur.diasSet.add(p.fecha);
          if (p.personal_id) cur.opSet.add(p.personal_id);
          horasMap.set(id, cur);
        });
      }
      const horasMaquina: HorasMaquinaRow[] = Array.from(horasMap.values())
        .map((r) => ({ ...r, dias: r.diasSet.size, operadores: r.opSet.size }))
        .sort((a, b) => (b.horas || 0) - (a.horas || 0));

      // ---- Maquinarias usadas (unión) ----
      const maqUsadasSet = new Map<string, MaquinariaUsadaRow>();
      const pushMaq = (id?: string | null, horas = 0) => {
        if (!id) return;
        const m = maqMap.get(id);
        const cur =
          maqUsadasSet.get(id) ||
          { maquinaria_id: id, codigo: m?.codigo || null, nombre: m?.nombre || null, patente: m?.patente || null, tipo: m?.tipo || null, horas: 0 };
        cur.horas += horas;
        maqUsadasSet.set(id, cur);
      };
      horasMaquina.forEach((h) => pushMaq(h.maquinaria_id, h.horas));
      partes.forEach((p: any) => pushMaq(p.maquinaria_id, 0));
      cargas.forEach((c: any) => pushMaq(c.maquinaria_id, 0));
      cargasRep.forEach((c: any) => pushMaq(c.maquinaria_id, 0));
      remitos.forEach((r: any) => pushMaq(r.maquinaria_id, 0));
      const maquinarias = Array.from(maqUsadasSet.values()).sort((a, b) =>
        (a.codigo || a.nombre || "").localeCompare(b.codigo || b.nombre || "")
      );

      // ---- Combustible ----
      const preciosIdx = new Map<string, number>();
      preciosAll.forEach((p: any) => {
        preciosIdx.set(`${p.anio}-${p.mes}-${p.producto}`, Number(p.precio_unitario) || 0);
      });
      const precioFor = (producto: string, fecha: string): number => {
        if (!fecha) return 0;
        const d = new Date(fecha);
        const anio = d.getUTCFullYear();
        const mes = d.getUTCMonth() + 1;
        const k = `${anio}-${mes}-${producto}`;
        if (preciosIdx.has(k)) return preciosIdx.get(k)!;
        // fallback: most recent earlier
        let best = 0;
        let bestKey = "";
        preciosAll.forEach((p: any) => {
          if (p.producto !== producto) return;
          const pk = `${p.anio}-${String(p.mes).padStart(2, "0")}`;
          const target = `${anio}-${String(mes).padStart(2, "0")}`;
          if (pk <= target && pk > bestKey) {
            bestKey = pk;
            best = Number(p.precio_unitario) || 0;
          }
        });
        return best;
      };

      const combMap = new Map<string, CombustibleRow>();
      const pushComb = (maqId: string | null, litros: number, costo: number) => {
        const key = maqId || "__sin_maq__";
        const m = maqId ? maqMap.get(maqId) : null;
        const cur =
          combMap.get(key) ||
          {
            maquinaria_id: maqId,
            codigo: m?.codigo || null,
            nombre: m?.nombre || (maqId ? null : "Sin maquinaria"),
            patente: m?.patente || null,
            litros: 0,
            costo: 0,
            cargas: 0,
          };
        cur.litros += litros;
        cur.costo += costo;
        cur.cargas += 1;
        combMap.set(key, cur);
      };
      cargas.forEach((c: any) => {
        pushComb(c.maquinaria_id, Number(c.litros) || 0, Number(c.costo_total) || 0);
      });
      cargasRep.forEach((c: any) => {
        const litros = Number(c.litros) || 0;
        const producto = c.tipo_producto || "combustible";
        const precio = precioFor(producto, c.fecha);
        pushComb(c.maquinaria_id, litros, litros * precio);
      });
      const combustible = Array.from(combMap.values()).sort((a, b) => (b.costo || 0) - (a.costo || 0));

      // ---- Remitos ----
      const remMap = new Map<string, RemitoRow>();
      remitos.forEach((r: any) => {
        const key = `${r.tipo_material || "(Sin tipo)"}|${r.material || ""}`;
        const cur =
          remMap.get(key) ||
          {
            material: r.material || "",
            tipo: r.tipo_material || "(Sin tipo)",
            remitos: 0,
            viajes: 0,
            cantidad: 0,
            unidad: r.unidad || "",
            total: 0,
          };
        cur.remitos += 1;
        cur.viajes += r.cantidad_viajes || 1;
        cur.cantidad += Number(r.cantidad) || 0;
        cur.total += Number(r.precio_total) || 0;
        if (!cur.unidad && r.unidad) cur.unidad = r.unidad;
        remMap.set(key, cur);
      });
      const remitosAgrup = Array.from(remMap.values()).sort((a, b) => (b.total || 0) - (a.total || 0));

      // ---- Órdenes de compra ----
      const ordenesCompra: OrdenCompraRow[] = ordenes
        .map((o: any) => ({
          id: o.id,
          numero: o.numero,
          fecha: o.fecha,
          proveedor: o.proveedor?.nombre || "",
          descripcion: (o.items || []).map((i: any) => i.descripcion).filter(Boolean).join(", ").slice(0, 200),
          total: Number(o.total) || 0,
          estado: o.estado || "",
        }))
        .sort((a, b) => (b.fecha || "").localeCompare(a.fecha || ""));

      // ---- Otros gastos ----
      const otrosMap = new Map<string, OtrosGastosRow>();
      otros.forEach((g: any) => {
        const key = `${g.categoria || "(Sin categoría)"}|${g.sector || ""}`;
        const cur =
          otrosMap.get(key) ||
          { categoria: g.categoria || "(Sin categoría)", sector: g.sector || null, items: 0, monto: 0 };
        cur.items += 1;
        cur.monto += Number(g.monto) || 0;
        otrosMap.set(key, cur);
      });
      const otrosGastos = Array.from(otrosMap.values()).sort((a, b) => (b.monto || 0) - (a.monto || 0));

      // ---- Totales ----
      const cotizado = cots.reduce((s: number, c: any) => s + (Number(c.total) || 0), 0);
      const personalDias = personal.reduce((s, p) => s + p.dias, 0);
      const personalHoras = personal.reduce((s, p) => s + p.horas, 0);
      const personalCosto = personal.reduce((s, p) => s + (p.costoEstimado || 0), 0);
      const horasMaquinaTotal = horasMaquina.reduce((s, h) => s + h.horas, 0);
      const combustibleLitros = combustible.reduce((s, c) => s + c.litros, 0);
      const combustibleCosto = combustible.reduce((s, c) => s + c.costo, 0);
      const remitosTotal = remitosAgrup.reduce((s, r) => s + r.total, 0);
      const ordenesCompraTotal = ordenesCompra.reduce((s, o) => s + o.total, 0);
      const otrosGastosTotal = otrosGastos.reduce((s, o) => s + o.monto, 0);
      const gastosTotal = esCantera
        ? combustibleCosto + ordenesCompraTotal + otrosGastosTotal + personalCosto
        : combustibleCosto + ordenesCompraTotal + otrosGastosTotal;
      const ingresosRemitos = remitosTotal;
      const referencia = esCantera ? ingresosRemitos : cotizado;
      const balance = referencia - gastosTotal;
      const rentabilidad = referencia > 0 ? (balance / referencia) * 100 : 0;

      return {
        obra: obraRes.data
          ? {
              id: obraRes.data.id,
              nombre: obraRes.data.nombre,
              numero: obraRes.data.numero,
              estado: obraRes.data.estado,
              ubicacion: obraRes.data.ubicacion,
              fecha_inicio: obraRes.data.fecha_inicio,
              fecha_fin_estimada: obraRes.data.fecha_fin_estimada,
              cliente: clienteNombre,
            }
          : null,
        esCantera,
        personal,
        horasMaquina,
        maquinarias,
        combustible,
        remitos: remitosAgrup,
        ordenesCompra,
        otrosGastos,
        cotizado,
        totales: {
          personalDias,
          personalHoras,
          personalCosto,
          horasMaquinaTotal,
          combustibleLitros,
          combustibleCosto,
          remitosTotal,
          ordenesCompraTotal,
          otrosGastosTotal,
          gastosTotal,
          ingresosRemitos,
          balance,
          rentabilidad,
        },
      };
    },
  });
}
