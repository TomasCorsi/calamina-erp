import { useCallback, useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Maximize2, Minimize2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useTableroSesion } from "@/hooks/useTableroSesion";
import { TableroVista } from "@/components/dashboard/TableroVista";
import { LoadingScreen } from "@/components/shared/LoadingScreen";

export default function TableroTV() {
  const { sesion, loading, conectado, actualizar } = useTableroSesion({ esTV: true });
  const queryClient = useQueryClient();
  const [ahora, setAhora] = useState(new Date());
  const [cursorVisible, setCursorVisible] = useState(true);
  const [estado, setEstado] = useState({ conectado: false, actualizado: 0 });

  useEffect(() => {
    const t = setInterval(() => setAhora(new Date()), 20000);
    return () => clearInterval(t);
  }, []);

  // Refresco pedido desde el control
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
      queryClient.invalidateQueries({ queryKey: ["tablero-historico"] });
    }
  }, [sesion, queryClient]);

  // Oculta el cursor: la PC de la TV no se toca
  const cursorTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const mover = () => {
      setCursorVisible(true);
      if (cursorTimer.current) clearTimeout(cursorTimer.current);
      cursorTimer.current = setTimeout(() => setCursorVisible(false), 3000);
    };
    mover();
    window.addEventListener("mousemove", mover);
    return () => {
      if (cursorTimer.current) clearTimeout(cursorTimer.current);
      window.removeEventListener("mousemove", mover);
    };
  }, []);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen?.();
    } catch {
      /* el navegador puede bloquearlo */
    }
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "f") {
        e.preventDefault();
        toggleFullscreen();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggleFullscreen]);

  const onObraEnPantalla = useCallback(
    (obraId: string) => {
      actualizar({ obra_activa: obraId });
    },
    [actualizar]
  );

  if (loading || !sesion) return <LoadingScreen />;

  const ultima = estado.actualizado ? format(new Date(estado.actualizado), "HH:mm:ss") : "--:--";

  return (
    <div
      className={cn(
        "h-screen overflow-hidden bg-background p-4 flex flex-col gap-2",
        !cursorVisible && "cursor-none"
      )}
    >
      <div className="flex items-center justify-between shrink-0">
        <h1 className="text-2xl font-bold tracking-tight">Centro de Control de Obras</h1>
        <div className="flex items-center gap-3 text-muted-foreground">
          <span className="inline-flex items-center gap-1.5 text-sm">
            <span
              className={cn(
                "w-2 h-2 rounded-full",
                conectado && estado.conectado ? "bg-success animate-pulse" : "bg-muted-foreground"
              )}
            />
            {conectado && estado.conectado ? "En vivo" : "Reconectando"}
          </span>
          <span className="text-sm">
            {format(ahora, "dd/MM/yyyy")} · {format(ahora, "HH:mm")}
          </span>
          <Button variant="ghost" size="icon" onClick={toggleFullscreen} aria-label="Pantalla completa">
            {document.fullscreenElement ? (
              <Minimize2 className="w-5 h-5" />
            ) : (
              <Maximize2 className="w-5 h-5" />
            )}
          </Button>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <TableroVista sesion={sesion} tv onObraEnPantalla={onObraEnPantalla} onEstado={setEstado} />
      </div>

      <div className="shrink-0 text-xs text-muted-foreground text-right">
        Última actualización: {ultima}
      </div>
    </div>
  );
}
