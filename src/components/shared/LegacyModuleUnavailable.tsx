import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { MainLayout } from "@/components/layout/MainLayout";

type LegacyModuleUnavailableProps = {
  title: string;
  subtitle?: string;
};

export function LegacyModuleUnavailable({ title, subtitle }: LegacyModuleUnavailableProps) {
  return (
    <MainLayout title={title} subtitle={subtitle}>
      <Card className="card-industrial max-w-3xl">
        <CardContent className="pt-6">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Módulo en adaptación al backend nuevo</AlertTitle>
            <AlertDescription>
              La pantalla, ruta y navegación originales se conservan. Sus consultas todavía dependen
              del esquema anterior y permanecen bloqueadas para evitar accesos inseguros. Se habilitarán
              nuevamente cuando este módulo tenga tablas, RLS y operaciones v2 verificadas.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </MainLayout>
  );
}
