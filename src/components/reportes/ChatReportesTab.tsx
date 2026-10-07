import { Bot, ShieldCheck } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";

export function ChatReportesTab() {
  return (
    <Card className="card-industrial">
      <CardContent className="p-6">
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Bot className="h-8 w-8 text-primary" />
          </div>
          <h3 className="mb-2 text-lg font-semibold">Consultas con IA</h3>
          <p className="mb-6 max-w-xl text-sm text-muted-foreground">
            Esta integración permanece temporalmente deshabilitada en v2. Los reportes financiero y
            por obra funcionan con datos locales; la IA se reactivará cuando exista una Edge Function
            v2 sin credenciales ni dependencias del backend legacy.
          </p>
          <Alert className="max-w-xl text-left">
            <ShieldCheck className="h-4 w-4" />
            <AlertTitle>Aislamiento activo</AlertTitle>
            <AlertDescription>
              Esta pestaña no realiza requests a Edge Functions, Lovable ni servicios externos.
            </AlertDescription>
          </Alert>
        </div>
      </CardContent>
    </Card>
  );
}
