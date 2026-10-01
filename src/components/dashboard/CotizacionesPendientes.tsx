import { useState } from "react";
import { FileText, Clock, DollarSign, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { format, differenceInDays, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Link } from "react-router-dom";
import { DetailDialog } from "@/components/shared/DetailDialog";
import { DetailRow } from "@/components/shared/DetailRow";

interface Cotizacion {
  id: string;
  numero: string;
  descripcion: string;
  total: number;
  fecha_vencimiento: string;
  obra?: { nombre: string } | null;
}

interface CotizacionesPendientesProps {
  cotizaciones: Cotizacion[];
  loading?: boolean;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);
}

export function CotizacionesPendientes({ cotizaciones, loading }: CotizacionesPendientesProps) {
  const [selectedCotizacion, setSelectedCotizacion] = useState<Cotizacion | null>(null);

  if (loading) {
    return (
      <div className="card-industrial p-5">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">Cotizaciones Pendientes</h3>
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-3 bg-muted/50 rounded-lg animate-pulse">
              <div className="h-4 bg-muted rounded w-1/3 mb-2" />
              <div className="h-3 bg-muted rounded w-2/3" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const totalPendiente = cotizaciones.reduce((sum, c) => sum + (c.total || 0), 0);

  return (
    <>
      <div className="card-industrial p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-foreground">Cotizaciones Pendientes</h3>
          </div>
          <Button variant="ghost" size="sm" className="text-primary hover:text-primary hover:bg-primary/10" asChild>
            <Link to="/cotizaciones">
              Ver todas
              <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </Button>
        </div>

        <div className="space-y-3">
          {cotizaciones.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-4">No hay cotizaciones pendientes</p>
          ) : (
          cotizaciones.map((cot, index) => {
              const diasRestantes = differenceInDays(parseISO(cot.fecha_vencimiento), new Date());
              return (
                <div
                  key={cot.id}
                  className="p-3 bg-muted/50 rounded-lg border border-border/50 hover:border-primary/30 transition-all cursor-pointer animate-fade-in"
                  style={{ animationDelay: `${index * 50}ms` }}
                  onClick={() => setSelectedCotizacion(cot)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <span className="text-xs font-mono text-primary">{cot.numero}</span>
                      <h4 className="font-medium text-foreground text-sm">
                        {cot.obra?.nombre || cot.descripcion}
                      </h4>
                    </div>
                    <Badge
                      className={cn(
                        "status-badge",
                        diasRestantes <= 3
                          ? "status-error"
                          : diasRestantes <= 7
                          ? "status-pending"
                          : "status-active"
                      )}
                    >
                      {diasRestantes}d
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      Vence: {format(parseISO(cot.fecha_vencimiento), "dd/MM/yyyy", { locale: es })}
                    </span>
                    <span className="flex items-center gap-1 font-medium text-foreground">
                      <DollarSign className="w-3 h-3" />
                      {formatCurrency(cot.total || 0)}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Summary */}
        {cotizaciones.length > 0 && (
          <div className="mt-4 pt-4 border-t border-border">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Total pendiente</span>
              <span className="text-lg font-bold text-foreground">
                {formatCurrency(totalPendiente)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Detail Dialog */}
      <DetailDialog
        open={!!selectedCotizacion}
        onOpenChange={(open) => !open && setSelectedCotizacion(null)}
        title={`Cotización ${selectedCotizacion?.numero || ""}`}
        size="md"
      >
        {selectedCotizacion && (
          <div className="space-y-4">
            <DetailRow label="Número" value={selectedCotizacion.numero} />
            <DetailRow label="Obra" value={selectedCotizacion.obra?.nombre || "-"} />
            <DetailRow label="Descripción" value={selectedCotizacion.descripcion} />
            <DetailRow
              label="Fecha de Vencimiento"
              value={format(parseISO(selectedCotizacion.fecha_vencimiento), "dd/MM/yyyy", { locale: es })}
            />
            <DetailRow label="Total" value={formatCurrency(selectedCotizacion.total || 0)} />
            
            <div className="pt-4 border-t border-border">
              <Button asChild className="w-full">
                <Link to="/cotizaciones">Ver detalle completo</Link>
              </Button>
            </div>
          </div>
        )}
      </DetailDialog>
    </>
  );
}
