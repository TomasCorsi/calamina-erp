import { Truck, AlertTriangle, CheckCircle, Clock, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";

interface Maquinaria {
  id: string;
  nombre: string | null;
  codigo: string | null;
  tipo: string;
  estado: "operativa" | "mantenimiento" | "inactiva" | "en_uso";
  horas_acumuladas: number;
  obra?: { nombre: string } | null;
}

interface MaquinariasStatusProps {
  maquinarias: Maquinaria[];
  loading?: boolean;
}

const estadoConfig = {
  operativa: { icon: CheckCircle, label: "Operativa", color: "text-success" },
  mantenimiento: { icon: Wrench, label: "Mantenimiento", color: "text-warning" },
  inactiva: { icon: Clock, label: "Inactiva", color: "text-muted-foreground" },
  en_uso: { icon: Truck, label: "En Uso", color: "text-primary" },
};

const tipoLabels: Record<string, string> = {
  cargadora: "Cargadora",
  compactador: "Compactador",
  retroexcavadora: "Retroexcavadora",
  minicargadora: "Minicargadora",
  motoniveladora: "Motoniveladora",
  topador: "Topador",
  pala_retro: "Pala Retro",
  batea: "Batea",
  acoplado: "Acoplado",
  camion: "Camión",
  carreton: "Carretón",
  cisterna: "Cisterna",
  tanque_cisterna: "Tanque Cisterna",
  tanque_regador_tractor: "Tanque Regador",
  soplador: "Soplador",
  zanjeadora: "Zanjeadora",
  rastra: "Rastra",
  tractor: "Tractor",
  rastra_grosspal: "Rastra Grosspal",
  auto: "Auto",
  camioneta: "Camioneta",
};

export function MaquinariasStatus({ maquinarias, loading }: MaquinariasStatusProps) {
  const statusCounts = maquinarias.reduce((acc, m) => {
    acc[m.estado] = (acc[m.estado] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const maquinariasEnMantenimiento = maquinarias.filter(m => m.estado === "mantenimiento");

  if (loading) {
    return (
      <div className="card-industrial p-5">
        <div className="flex items-center gap-2 mb-4">
          <Truck className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">Estado de Maquinarias</h3>
        </div>
        <div className="grid grid-cols-4 gap-2 mb-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-2 bg-muted/50 rounded-lg animate-pulse">
              <div className="h-6 bg-muted rounded mb-1" />
              <div className="h-3 bg-muted rounded w-2/3 mx-auto" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="card-industrial p-5">
      <div className="flex items-center gap-2 mb-4">
        <Truck className="w-5 h-5 text-primary" />
        <h3 className="font-semibold text-foreground">Estado de Maquinarias</h3>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        {Object.entries(estadoConfig).map(([key, config]) => {
          const Icon = config.icon;
          return (
            <div key={key} className="text-center p-2 bg-muted/50 rounded-lg">
              <Icon className={cn("w-4 h-4 mx-auto mb-1", config.color)} />
              <p className="text-lg font-bold text-foreground">{statusCounts[key] || 0}</p>
              <p className="text-[10px] text-muted-foreground uppercase">{config.label}</p>
            </div>
          );
        })}
      </div>

      {/* List */}
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {maquinarias.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-4">No hay maquinarias registradas</p>
        ) : (
          maquinarias.slice(0, 6).map((maq, index) => {
            const config = estadoConfig[maq.estado] || estadoConfig.operativa;
            const Icon = config.icon;
            return (
              <div
                key={maq.id}
                className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors animate-fade-in"
                style={{ animationDelay: `${index * 30}ms` }}
              >
                <div className="flex items-center gap-3">
                  <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center bg-muted", config.color)}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {maq.nombre || maq.codigo || "Sin nombre"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {tipoLabels[maq.tipo] || maq.tipo}
                      {maq.obra?.nombre && ` • ${maq.obra.nombre}`}
                    </p>
                  </div>
                </div>
                {maq.horas_acumuladas > 0 && (
                  <span className="text-sm font-mono text-muted-foreground">
                    {maq.horas_acumuladas.toLocaleString()}h
                  </span>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Alert */}
      {maquinariasEnMantenimiento.length > 0 && (
        <div className="mt-4 p-3 bg-warning/10 border border-warning/20 rounded-lg flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-warning flex-shrink-0" />
          <p className="text-xs text-warning">
            <span className="font-medium">{maquinariasEnMantenimiento[0]?.nombre || maquinariasEnMantenimiento[0]?.codigo}</span> en mantenimiento
          </p>
        </div>
      )}
    </div>
  );
}
