import { useNavigate } from "react-router-dom";
import { Bell, ClipboardList, FileWarning, Wrench, AlertTriangle, CheckCheck } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNotificaciones, type NotificacionTipo } from "@/hooks/useNotificaciones";
import { useState } from "react";

const iconForTipo = (tipo: NotificacionTipo) => {
  switch (tipo) {
    case "parte_pendiente":
      return <ClipboardList className="w-4 h-4 text-primary" />;
    case "observacion_maquina":
      return <AlertTriangle className="w-4 h-4 text-destructive" />;
    case "documento_pendiente":
      return <FileWarning className="w-4 h-4 text-amber-500" />;
    case "mantenimiento":
      return <Wrench className="w-4 h-4 text-blue-500" />;
  }
};

const labelForTipo = (tipo: NotificacionTipo) => {
  switch (tipo) {
    case "parte_pendiente":
      return "Partes pendientes";
    case "observacion_maquina":
      return "Observaciones de máquina";
    case "documento_pendiente":
      return "Documentos";
    case "mantenimiento":
      return "Mantenimientos";
  }
};

export function NotificationsBell() {
  const navigate = useNavigate();
  const { items, unread, readIds, markAllRead, isLoading } = useNotificaciones();
  const [open, setOpen] = useState(false);

  const grouped = items.reduce<Record<string, typeof items>>((acc, it) => {
    (acc[it.tipo] ||= []).push(it);
    return acc;
  }, {});

  const order: NotificacionTipo[] = [
    "parte_pendiente",
    "observacion_maquina",
    "mantenimiento",
    "documento_pendiente",
  ];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notificaciones">
          <Bell className="w-5 h-5 text-muted-foreground" />
          {unread > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 min-w-[20px] px-1 flex items-center justify-center text-[10px] bg-destructive text-destructive-foreground">
              {unread > 99 ? "99+" : unread}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[360px] p-0 bg-popover border-border">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex flex-col">
            <span className="font-semibold text-sm text-foreground">Notificaciones</span>
            <span className="text-xs text-muted-foreground">
              {items.length === 0 ? "Todo al día" : `${unread} sin leer · ${items.length} totales`}
            </span>
          </div>
          {items.length > 0 && unread > 0 && (
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={markAllRead}>
              <CheckCheck className="w-3.5 h-3.5 mr-1" />
              Marcar leídas
            </Button>
          )}
        </div>

        <ScrollArea className="max-h-[420px]">
          {isLoading && items.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">Cargando…</div>
          ) : items.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              No tenés notificaciones
            </div>
          ) : (
            <div className="py-1">
              {order.map((tipo) => {
                const list = grouped[tipo];
                if (!list || list.length === 0) return null;
                return (
                  <div key={tipo}>
                    <div className="px-4 py-1.5 text-[11px] uppercase tracking-wide text-muted-foreground bg-muted/30">
                      {labelForTipo(tipo)} ({list.length})
                    </div>
                    {list.map((n) => {
                      const isUnread = !readIds.has(n.id);
                      let fechaLabel = "";
                      try {
                        fechaLabel = formatDistanceToNow(new Date(n.fecha), {
                          addSuffix: true,
                          locale: es,
                        });
                      } catch {}
                      return (
                        <button
                          key={n.id}
                          onClick={() => {
                            setOpen(false);
                            navigate(n.url);
                          }}
                          className={`w-full text-left px-4 py-2.5 flex gap-3 items-start hover:bg-accent transition-colors border-l-2 ${
                            isUnread ? "border-l-primary bg-primary/[0.03]" : "border-l-transparent"
                          }`}
                        >
                          <div className="mt-0.5">{iconForTipo(n.tipo)}</div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-foreground line-clamp-1">
                              {n.titulo}
                            </div>
                            <div className="text-xs text-muted-foreground line-clamp-2">
                              {n.descripcion}
                            </div>
                            {fechaLabel && (
                              <div className="text-[10px] text-muted-foreground mt-0.5">
                                {fechaLabel}
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
