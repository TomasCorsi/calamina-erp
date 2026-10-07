import { useCallback, useEffect, useRef, useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Maximize2, Minimize2, RefreshCw, LayoutDashboard, SlidersHorizontal } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useTableroSesion } from "@/hooks/useTableroSesion";
import { TableroVista } from "@/components/dashboard/TableroVista";
import { TableroControl } from "@/components/dashboard/TableroControl";
import { LoadingScreen } from "@/components/shared/LoadingScreen";

export default function Dashboard() {
  const { sesion, loading, conectado, actualizar } = useTableroSesion();
  const queryClient = useQueryClient();
  const [tv, setTv] = useState(false);
  const [tab, setTab] = useState("tablero");
  const [estado, setEstado] = useState({ conectado: false, actualizado: 0 });

  // Refresco pedido desde el control remoto
  const refreshRef = useRef<number | null>(null);
  useEffect(() => {
    if (!sesion) return;
    if (refreshRef.current === null) {
      refreshRef.current = sesion.refresh_token;
      return;
    }
    if (sesion.refresh_token !== refreshRef.current) {
      refreshRef.current = sesion.refresh_token;
      queryClient.invalidateQueries({ queryKey: ["tablero-obras"] });
      queryClient.invalidateQueries({ queryKey: ["tablero-series"] });
    }
  }, [sesion, queryClient]);

  useEffect(() => {
    const onChange = () => {
      if (!document.fullscreenElement) setTv(false);
    };
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const entrarTV = useCallback(async () => {
    setTv(true);
    try {
      await document.documentElement.requestFullscreen?.();
    } catch {
      /* ignore */
    }
  }, []);

  const salirTV = useCallback(async () => {
    setTv(false);
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
    } catch {
      /* ignore */
    }
  }, []);

  const refrescar = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["tablero-obras"] });
    queryClient.invalidateQueries({ queryKey: ["tablero-series"] });
  }, [queryClient]);

  if (loading || !sesion) return <LoadingScreen />;

  const ultima = estado.actualizado ? format(new Date(estado.actualizado), "HH:mm:ss") : "--:--";

  const indicadorVivo = (
    <span className="inline-flex items-center gap-1.5 text-xs">
      <span
        className={cn(
          "w-2 h-2 rounded-full",
          conectado && estado.conectado ? "bg-success animate-pulse" : "bg-muted-foreground"
        )}
      />
      <span className={conectado && estado.conectado ? "text-success" : "text-muted-foreground"}>
        {conectado && estado.conectado ? "En vivo" : "Actualización periódica"}
      </span>
    </span>
  );

  if (tv) {
    return (
      <div className="h-screen overflow-hidden bg-background p-4 flex flex-col gap-2">
        <div className="flex items-center justify-between shrink-0">
          <h1 className="text-2xl font-bold tracking-tight">Centro de Control de Obras</h1>
          <div className="flex items-center gap-3">
            {indicadorVivo}
            <Button variant="ghost" size="icon" onClick={salirTV} aria-label="Salir de pantalla completa">
              <Minimize2 className="w-5 h-5" />
            </Button>
          </div>
        </div>
        <div className="flex-1 min-h-0">
          <TableroVista sesion={sesion} tv onEstado={setEstado} />
        </div>
        <div className="shrink-0 text-xs text-muted-foreground text-right">
          Última actualización: {ultima}
        </div>
      </div>
    );
  }

  return (
    <MainLayout title="Tablero de Obras" subtitle="Centro de control por obra">
      <Tabs value={tab} onValueChange={setTab} className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <TabsList>
            <TabsTrigger value="tablero" className="gap-2">
              <LayoutDashboard className="w-4 h-4" />
              Tablero
            </TabsTrigger>
            <TabsTrigger value="control" className="gap-2">
              <SlidersHorizontal className="w-4 h-4" />
              Control TV
            </TabsTrigger>
          </TabsList>

          <div className="ml-auto flex items-center gap-2">
            {indicadorVivo}
            <span className="text-xs text-muted-foreground hidden sm:inline">
              Actualizado {ultima}
            </span>
            <Button variant="ghost" size="icon" onClick={refrescar} aria-label="Actualizar">
              <RefreshCw className="w-4 h-4" />
            </Button>
            <Button size="sm" className="gap-2" onClick={entrarTV}>
              <Maximize2 className="w-4 h-4" />
              Pantalla completa
            </Button>
          </div>
        </div>

        <TabsContent value="tablero" className="m-0">
          <div className="lg:min-h-[calc(100vh-11rem)] min-h-[520px]">
            <TableroVista sesion={sesion} onEstado={setEstado} />
          </div>
        </TabsContent>

        <TabsContent value="control" className="m-0">
          <TableroControl sesion={sesion} actualizar={actualizar} />
        </TabsContent>
      </Tabs>
    </MainLayout>
  );
}
