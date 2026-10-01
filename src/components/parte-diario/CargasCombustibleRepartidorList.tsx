import { Pencil, Trash2, Fuel } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { CargaRepartidor } from "@/hooks/useCargasRepartidor";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

interface CargasCombustibleRepartidorListProps {
  cargas: CargaRepartidor[];
  totalLitros: number;
  onEdit: (carga: CargaRepartidor) => void;
  onDelete: (carga: CargaRepartidor) => void;
  isDeleting: boolean;
}

const productBadgeClass: Record<string, string> = {
  combustible: "bg-amber-500/15 text-amber-700 border-amber-500/30",
  grasa: "bg-blue-500/15 text-blue-700 border-blue-500/30",
  aceite: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
};

export function CargasCombustibleRepartidorList({
  cargas,
  totalLitros,
  onEdit,
  onDelete,
  isDeleting,
}: CargasCombustibleRepartidorListProps) {
  if (cargas.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <Fuel className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p>No hay entregas registradas</p>
          <p className="text-sm mt-1">Presione el botón para agregar una</p>
        </CardContent>
      </Card>
    );
  }

  const ingreso = cargas.filter((c) => c.tipo_movimiento === "ingreso").reduce((s, c) => s + (c.litros || 0), 0);

  return (
    <div className="space-y-3">
      {cargas.map((carga) => {
        const producto = carga.tipo_producto || "combustible";
        const unidad = producto === "grasa" ? "Kg" : "L";
        const operador = carga.operador
          ? `${carga.operador.apellido || ""}, ${carga.operador.nombre?.charAt(0) || ""}.`
          : "-";
        const maquina = carga.maquinaria?.codigo || carga.maquinaria?.tipo || "-";
        const obra = carga.obra?.nombre || "-";
        const showHsKm = carga.horas || carga.km;

        return (
          <Card key={carga.id} className="overflow-hidden">
            <CardContent className="p-3 space-y-1">
              {/* Row 1: Badge + quantity + actions */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Badge variant={carga.tipo_movimiento === "ingreso" ? "default" : "destructive"} className="text-[11px] shrink-0">
                    {carga.tipo_movimiento === "ingreso" ? "Ingreso" : "Egreso"}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={`text-[11px] shrink-0 capitalize ${productBadgeClass[producto] || ""}`}
                  >
                    {producto}
                  </Badge>
                  <span className="font-semibold text-sm">
                    {carga.litros} {unidad}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {format(parseISO(carga.fecha), "dd/MM", { locale: es })}
                  </span>
                </div>
                <div className="flex gap-0.5 shrink-0">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(carga)}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => onDelete(carga)}
                    disabled={isDeleting}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>


              {/* Row 3: Operator + type */}
              <p className="text-xs text-muted-foreground truncate">
                {operador} · <span className="capitalize">{carga.tipo_operador || "interno"}</span>
              </p>

              {/* Row 3: Machine + obra */}
              <p className="text-xs text-muted-foreground truncate">
                Maq: {maquina} · Obra: {obra}
              </p>

              {/* Row 4: Hours + km (only if present) */}
              {showHsKm && (
                <p className="text-xs text-muted-foreground">
                  {carga.horas ? `Hs: ${carga.horas}` : ""}
                  {carga.horas && carga.km ? " · " : ""}
                  {carga.km ? `Km: ${carga.km}` : ""}
                </p>
              )}
            </CardContent>
          </Card>
        );
      })}

      {/* Total bar */}
      <div className="rounded-lg bg-muted/60 px-4 py-2.5 flex items-center justify-between gap-3 text-sm">
        <span className="font-medium text-muted-foreground">Ingresado: <b className="text-foreground">{ingreso.toLocaleString("es-AR")} L</b></span>
        <span className="font-medium text-muted-foreground">Entregado: <b className="text-primary">{(totalLitros - ingreso).toLocaleString("es-AR")} L</b></span>
      </div>
    </div>
  );
}
