import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Download, Loader2 } from "lucide-react";
import { FirmaCanvas } from "./FirmaCanvas";
import { PdfPagesView } from "./PdfPagesView";
import { useMisDocumentos } from "@/hooks/useMisDocumentos";
import type { EmpleadoDocumento } from "@/hooks/useEmpleadoDocumentos";
import { formatDate } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  documento: EmpleadoDocumento | null;
}

export function DocumentoViewerDialog({ open, onOpenChange, documento }: Props) {
  const { markVisto, firmar, isSigning, getDownloadUrl } = useMisDocumentos();
  const [url, setUrl] = useState<string | null>(null);
  const [firma, setFirma] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !documento) {
      setUrl(null);
      setFirma(null);
      return;
    }
    let cancelled = false;
    getDownloadUrl(documento)
      .then((u) => !cancelled && setUrl(u))
      .catch(() => !cancelled && setUrl(null));
    return () => {
      cancelled = true;
    };
  }, [open, documento]);

  if (!documento) return null;

  const isRecibo = documento.tipo === "recibo_sueldo";
  const yaFirmado = !!documento.firmado_at;
  const yaVisto = !!documento.visto_at;
  const isImg = documento.mime_type?.startsWith("image/");

  const handleMarcarVisto = () => {
    markVisto(documento.id);
    onOpenChange(false);
  };

  const handleFirmar = async () => {
    if (!firma) return;
    await firmar({ id: documento.id, firma_data_url: firma });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2 flex-wrap">
            {documento.titulo}
            <Badge variant="outline" className="text-[10px]">
              {isRecibo ? "Recibo de sueldo" : "Estudio médico"}
            </Badge>
            {documento.periodo && (
              <Badge variant="secondary" className="text-[10px]">{documento.periodo}</Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto space-y-4">
          <div className="bg-muted rounded-md overflow-hidden p-1" style={{ minHeight: 200 }}>
            {url ? (
              isImg ? (
                <img src={url} alt={documento.titulo} className="w-full h-auto" />
              ) : (
                <PdfPagesView url={url} />
              )
            ) : (
              <div className="flex items-center justify-center h-[200px]">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>


          {url && (
            <a href={url} target="_blank" rel="noopener" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
              <Download className="w-3 h-3" /> Abrir / descargar
            </a>
          )}

          {isRecibo && yaFirmado && documento.firma_data_url && (
            <div className="border border-border rounded-md p-3 bg-green-500/5">
              <p className="text-sm font-medium text-foreground flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                Firmado el {formatDate(documento.firmado_at!)}
              </p>
              <img src={documento.firma_data_url} alt="Firma" className="mt-2 max-h-24 bg-white rounded border" />
            </div>
          )}

          {isRecibo && !yaFirmado && (
            <div className="border border-border rounded-md p-3 space-y-2">
              <p className="text-sm font-medium text-foreground">Firmá el recibo para confirmar la recepción</p>
              <FirmaCanvas onChange={setFirma} />
            </div>
          )}

          {!isRecibo && yaVisto && (
            <p className="text-sm text-green-500 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> Marcado como visto el {formatDate(documento.visto_at!)}
            </p>
          )}
        </div>

        <DialogFooter>
          {isRecibo && !yaFirmado ? (
            <Button onClick={handleFirmar} disabled={!firma || isSigning}>
              {isSigning && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Confirmar firma
            </Button>
          ) : !yaVisto ? (
            <Button onClick={handleMarcarVisto}>
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Marcar como visto
            </Button>
          ) : (
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cerrar</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
