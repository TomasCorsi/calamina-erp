import { AlertCircle, RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface DraftRestorePromptProps {
  timestamp: string | null;
  onRestore: () => void;
  onDiscard: () => void;
}

export function DraftRestorePrompt({
  timestamp,
  onRestore,
  onDiscard,
}: DraftRestorePromptProps) {
  return (
    <Alert className="bg-warning/10 border-warning/50 mb-4">
      <AlertCircle className="h-4 w-4 text-warning" />
      <AlertDescription className="flex items-center justify-between w-full">
        <span className="text-sm">
          Se encontró un borrador sin guardar
          {timestamp && <span className="text-muted-foreground"> ({timestamp})</span>}
        </span>
        <div className="flex items-center gap-2 ml-4">
          <Button
            size="sm"
            variant="outline"
            onClick={onRestore}
            className="border-warning/50 hover:bg-warning/10"
          >
            <RotateCcw className="w-3 h-3 mr-1" />
            Restaurar
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={onDiscard}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="w-3 h-3 mr-1" />
            Descartar
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}
