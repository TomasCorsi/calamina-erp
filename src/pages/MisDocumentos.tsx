import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, FileSignature, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { useMisDocumentos } from "@/hooks/useMisDocumentos";
import { DocumentoViewerDialog } from "@/components/documentos/DocumentoViewerDialog";
import type { EmpleadoDocumento } from "@/hooks/useEmpleadoDocumentos";
import { formatDate } from "@/lib/utils";

const TIPO_LABEL = {
  estudio_medico: "Estudios médicos",
  recibo_sueldo: "Recibos de sueldo",
} as const;

const TIPO_ICON = {
  estudio_medico: FileText,
  recibo_sueldo: FileSignature,
} as const;

export default function MisDocumentos() {
  const { documentos, isLoading, pendientesCount } = useMisDocumentos();
  const [selected, setSelected] = useState<EmpleadoDocumento | null>(null);

  const grupos = (["estudio_medico", "recibo_sueldo"] as const).map((tipo) => ({
    tipo,
    items: documentos.filter((d) => d.tipo === tipo),
  }));

  return (
    <MainLayout title="Mis Documentos" subtitle="Estudios médicos y recibos de sueldo">
      <div className="space-y-6 max-w-4xl mx-auto">
        {pendientesCount > 0 && (
          <Card className="border-amber-500/50 bg-amber-500/5">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-foreground">
                <AlertCircle className="w-5 h-5 text-amber-500" />
                <span className="font-semibold">
                  Tenés {pendientesCount} documento{pendientesCount !== 1 ? "s" : ""} pendiente{pendientesCount !== 1 ? "s" : ""} de revisar
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {isLoading ? (
          <div className="text-center py-12"><Loader2 className="w-6 h-6 animate-spin inline" /></div>
        ) : documentos.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">No tenés documentos cargados</div>
        ) : (
          grupos.map(({ tipo, items }) => {
            if (items.length === 0) return null;
            const Icon = TIPO_ICON[tipo];
            return (
              <div key={tipo} className="space-y-2">
                <h2 className="text-sm font-semibold text-foreground flex items-center gap-2 uppercase tracking-wide">
                  <Icon className="w-4 h-4" />
                  {TIPO_LABEL[tipo]} · {items.length}
                </h2>
                <div className="space-y-2">
                  {items.map((d) => {
                    const isRecibo = d.tipo === "recibo_sueldo";
                    const pendiente = !d.visto_at || (isRecibo && !d.firmado_at);
                    return (
                      <button
                        key={d.id}
                        onClick={() => setSelected(d)}
                        className="w-full text-left bg-card border border-border rounded-xl p-3 shadow-sm hover:bg-muted/40 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm text-foreground truncate">{d.titulo}</p>
                            {d.periodo && <p className="text-xs text-muted-foreground">{d.periodo}</p>}
                            <p className="text-xs text-muted-foreground mt-0.5">Subido el {formatDate(d.created_at)}</p>
                          </div>
                          <div className="shrink-0">
                            {isRecibo && d.firmado_at ? (
                              <Badge className="bg-green-500/20 text-green-500 border-green-500/30">
                                <FileSignature className="w-3 h-3 mr-1" /> Firmado
                              </Badge>
                            ) : d.visto_at ? (
                              <Badge variant="outline" className="text-blue-500">
                                <CheckCircle2 className="w-3 h-3 mr-1" /> Visto
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-amber-500">Pendiente</Badge>
                            )}
                          </div>
                        </div>
                        {pendiente && (
                          <p className="text-xs text-primary mt-2">
                            {isRecibo && !d.firmado_at ? "Tocá para ver y firmar →" : "Tocá para ver →"}
                          </p>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>

      <DocumentoViewerDialog
        open={!!selected}
        onOpenChange={(o) => !o && setSelected(null)}
        documento={selected}
      />
    </MainLayout>
  );
}
