import { Button } from "@/components/ui/button";
import { History } from "lucide-react";

interface HistoricoBannerProps {
  loadAll: boolean;
  onCargarHistorico: () => void;
  diasMostrados: number;
  label?: string;
}

/**
 * Banner that informs the user only recent records are loaded
 * and offers to fetch the full history (opt-in).
 */
export function HistoricoBanner({
  loadAll,
  onCargarHistorico,
  diasMostrados,
  label = "registros",
}: HistoricoBannerProps) {
  if (loadAll) return null;

  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2 mb-2 rounded-md border border-border bg-muted/40 text-sm">
      <span className="text-muted-foreground">
        Mostrando {label} de los últimos <strong>{diasMostrados} días</strong> para cargar más rápido.
      </span>
      <Button
        size="sm"
        variant="outline"
        onClick={onCargarHistorico}
        className="gap-2 h-7"
      >
        <History className="h-3.5 w-3.5" />
        Cargar histórico completo
      </Button>
    </div>
  );
}
