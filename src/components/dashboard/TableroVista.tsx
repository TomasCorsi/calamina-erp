import { useEffect, useMemo, useRef, useState } from "react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Building2 } from "lucide-react";
import { ObraDashboard } from "@/components/dashboard/ObraDashboard";
import { useTableroObras } from "@/hooks/useTableroObras";
import { useAvanceObra } from "@/hooks/useAvanceObra";
import { useTableroSeries } from "@/hooks/useTableroSeries";
import { useTableroHistorico } from "@/hooks/useTableroHistorico";
import { useTableroRealtime } from "@/hooks/useTableroRealtime";
import { TableroSesion } from "@/hooks/useTableroSesion";

interface Props {
  sesion: TableroSesion;
  tv?: boolean;
  /** Solo la pantalla de TV informa al control qué obra está mostrando */
  onObraEnPantalla?: (obraId: string) => void;
  onEstado?: (info: { conectado: boolean; actualizado: number }) => void;
}

export function TableroVista({ sesion, tv, onObraEnPantalla, onEstado }: Props) {
  const { conectado } = useTableroRealtime(true);
  const { obras, loading, dataUpdatedAt, esMesActual } = useTableroObras(
    sesion.obra_ids,
    sesion.mes,
    conectado ? 300000 : 60000
  );
  const obrasMeta = useMemo(
    () => obras.map((o) => ({ obraId: o.obraId, nombre: o.nombre })),
    [obras]
  );
  const { series, loading: loadingSeries } = useTableroSeries(
    obrasMeta,
    sesion.mes,
    conectado ? 300000 : 60000
  );
  const { historico } = useTableroHistorico(obrasMeta);

  const [indice, setIndice] = useState(0);

  // El control puede saltar a una obra puntual
  useEffect(() => {
    if (!sesion.obra_activa) return;
    const i = obras.findIndex((o) => o.obraId === sesion.obra_activa);
    if (i >= 0) setIndice(i);
  }, [sesion.obra_activa, obras]);

  // Rotación automática entre obras
  useEffect(() => {
    if (!sesion.rotacion_activa || obras.length < 2) return;
    const t = setInterval(
      () => setIndice((i) => (i + 1) % obras.length),
      Math.max(5, sesion.rotacion_segundos) * 1000
    );
    return () => clearInterval(t);
  }, [sesion.rotacion_activa, sesion.rotacion_segundos, obras.length]);

  useEffect(() => {
    if (indice >= obras.length) setIndice(0);
  }, [indice, obras.length]);

  const obra = obras[indice];
  const { avance } = useAvanceObra(obra?.obraId);
  const avisadaRef = useRef<string | null>(null);
  useEffect(() => {
    if (!obra || !onObraEnPantalla) return;
    if (avisadaRef.current === obra.obraId) return;
    avisadaRef.current = obra.obraId;
    onObraEnPantalla(obra.obraId);
  }, [obra, onObraEnPantalla]);

  useEffect(() => {
    onEstado?.({ conectado, actualizado: dataUpdatedAt });
  }, [conectado, dataUpdatedAt, onEstado]);

  const mesLabel = format(parseISO(`${sesion.mes}-01`), "MMMM yyyy", { locale: es });

  if (loading && obras.length === 0) {
    return (
      <Card className="card-industrial p-6 h-full">
        <div className="h-full min-h-[300px] bg-muted/40 rounded animate-pulse" />
      </Card>
    );
  }

  if (obras.length === 0) {
    return (
      <Card className="card-industrial p-10 text-center h-full flex flex-col items-center justify-center">
        <Building2 className="w-10 h-10 mb-3 text-muted-foreground" />
        <p className="text-lg font-semibold mb-1">No hay obras seleccionadas</p>
        <p className="text-sm text-muted-foreground">
          Elegí las obras desde la pestaña "Control TV".
        </p>
      </Card>
    );
  }

  return (
    <div className={cn("h-full min-h-0")}>
      <ObraDashboard
        obra={obra}
        metrica={sesion.metrica}
        serie={series[sesion.metrica] || []}
        loadingSerie={loadingSeries}
        historico={historico[obra.obraId]}
        periodoLabel={esMesActual ? "hoy" : "mes"}
        mesLabel={mesLabel}
        tv={tv}
        posicion={{ actual: indice, total: obras.length }}
        avance={avance}
      />
    </div>
  );
}
