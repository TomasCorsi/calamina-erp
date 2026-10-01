import { Building2, MapPin, Calendar, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Link } from "react-router-dom";

interface Obra {
  id: string;
  nombre: string;
  ubicacion: string | null;
  estado: "activa" | "pendiente" | "finalizada" | "pausada";
  fecha_inicio: string | null;
  responsable?: { nombre: string; apellido: string } | null;
}

interface RecentObrasProps {
  obras: Obra[];
  loading?: boolean;
}

const estadoConfig = {
  activa: { label: "Activa", className: "status-active" },
  pendiente: { label: "Pendiente", className: "status-pending" },
  finalizada: { label: "Finalizada", className: "status-inactive" },
  pausada: { label: "Pausada", className: "status-error" },
};

export function RecentObras({ obras, loading }: RecentObrasProps) {
  if (loading) {
    return (
      <div className="card-industrial p-5">
        <div className="flex items-center gap-2 mb-4">
          <Building2 className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">Obras Recientes</h3>
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-4 bg-muted/50 rounded-lg animate-pulse">
              <div className="h-4 bg-muted rounded w-3/4 mb-2" />
              <div className="h-3 bg-muted rounded w-1/2" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="card-industrial p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Building2 className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">Obras Recientes</h3>
        </div>
        <Button variant="ghost" size="sm" className="text-primary hover:text-primary hover:bg-primary/10" asChild>
          <Link to="/obras">
            Ver todas
            <ArrowRight className="w-4 h-4 ml-1" />
          </Link>
        </Button>
      </div>

      <div className="space-y-3">
        {obras.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-4">No hay obras registradas</p>
        ) : (
          obras.map((obra, index) => (
            <div
              key={obra.id}
              className="p-4 bg-muted/50 rounded-lg border border-border/50 hover:border-primary/30 transition-all cursor-pointer animate-fade-in"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-foreground truncate">{obra.nombre}</h4>
                </div>
                <Badge className={cn("status-badge ml-2", estadoConfig[obra.estado]?.className)}>
                  {estadoConfig[obra.estado]?.label || obra.estado}
                </Badge>
              </div>

              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                {obra.ubicacion && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {obra.ubicacion}
                  </span>
                )}
                {obra.fecha_inicio && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {format(parseISO(obra.fecha_inicio), "dd/MM/yyyy")}
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
