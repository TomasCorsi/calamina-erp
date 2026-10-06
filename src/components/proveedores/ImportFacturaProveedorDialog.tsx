import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Loader2, FileSpreadsheet, Image as ImageIcon, FileText, Check, Sparkles } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

export interface ParsedOrdenCompra {
  proveedor_nombre?: string;
  proveedor_cuit?: string;
  numero_factura?: string;
  fecha?: string;
  moneda?: "ARS" | "USD";
  incluir_iva?: boolean;
  iva_porcentaje?: number;
  percepcion_iva?: number;
  percepcion_iibb?: number;
  condiciones_pago?: string;
  observaciones?: string;
  items: {
    articulo?: string;
    descripcion: string;
    unidad: string;
    cantidad: number;
    precio_unitario: number;
  }[];
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (parsed: ParsedOrdenCompra) => void;
}

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

export function ImportFacturaProveedorDialog({ open, onOpenChange, onImport }: Props) {
  const [tab, setTab] = useState("pdf");
  const [loading, setLoading] = useState(false);
  const [textContent, setTextContent] = useState("");
  const [contentKind, setContentKind] = useState<"text" | "image" | "pdf">("text");
  const [fileName, setFileName] = useState("");
  const [instrucciones, setInstrucciones] = useState("");
  const [preview, setPreview] = useState<ParsedOrdenCompra | null>(null);

  const reset = () => {
    setTextContent("");
    setContentKind("text");
    setFileName("");
    setInstrucciones("");
    setPreview(null);
    setLoading(false);
  };

  const readAsDataURL = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handlePdf = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_BYTES) {
      toast.error("El PDF supera los 10 MB");
      return;
    }
    if (!/\.pdf$/i.test(file.name) && file.type !== "application/pdf") {
      toast.error("Subí un archivo PDF");
      return;
    }
    setFileName(file.name);
    const dataUrl = await readAsDataURL(file);
    setTextContent(dataUrl);
    setContentKind("pdf");
  };

  const handleImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_BYTES) {
      toast.error("La imagen supera los 10 MB");
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error("Seleccioná una imagen válida");
      return;
    }
    setFileName(file.name);
    const dataUrl = await readAsDataURL(file);
    setTextContent(dataUrl);
    setContentKind("image");
  };

  const handleExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!/\.(xlsx|xls|csv)$/i.test(file.name)) {
      toast.error("Subí un archivo Excel o CSV");
      return;
    }
    setFileName(file.name);
    const data = await file.arrayBuffer();
    const wb = XLSX.read(data);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const text = XLSX.utils.sheet_to_csv(ws, { FS: "\t" });
    setTextContent(text);
    setContentKind("text");
  };

  const handleTextChange = (v: string) => {
    setTextContent(v);
    setContentKind("text");
    setFileName("");
  };

  const processWithAI = async () => {
    if (!textContent.trim()) {
      toast.error("Subí un archivo o pegá el texto");
      return;
    }
    toast.info("La importación asistida quedará habilitada cuando exista una función v2 segura");
  };

  const apply = () => {
    if (!preview) return;
    onImport(preview);
    onOpenChange(false);
    reset();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Importar cotización/factura con IA
          </DialogTitle>
        </DialogHeader>

        {!preview ? (
          <div className="space-y-4">
            <Tabs value={tab} onValueChange={setTab}>
              <TabsList className="grid grid-cols-4 w-full">
                <TabsTrigger value="pdf" className="flex items-center gap-1">
                  <FileText className="w-4 h-4" /> PDF
                </TabsTrigger>
                <TabsTrigger value="imagen" className="flex items-center gap-1">
                  <ImageIcon className="w-4 h-4" /> Imagen
                </TabsTrigger>
                <TabsTrigger value="excel" className="flex items-center gap-1">
                  <FileSpreadsheet className="w-4 h-4" /> Excel
                </TabsTrigger>
                <TabsTrigger value="texto" className="flex items-center gap-1">
                  <FileText className="w-4 h-4" /> Texto
                </TabsTrigger>
              </TabsList>

              <TabsContent value="pdf" className="space-y-3">
                <Label>Subir PDF de la cotización/factura</Label>
                <Input type="file" accept="application/pdf,.pdf" onChange={handlePdf} className="bg-muted" />
                {contentKind === "pdf" && fileName && (
                  <p className="text-xs text-muted-foreground">📄 {fileName}</p>
                )}
              </TabsContent>

              <TabsContent value="imagen" className="space-y-3">
                <Label>Subir foto de la cotización/factura</Label>
                <Input type="file" accept="image/*" onChange={handleImage} className="bg-muted" />
                {contentKind === "image" && textContent && (
                  <div className="flex justify-center">
                    <img src={textContent} alt="Preview" className="max-h-48 rounded-md border" />
                  </div>
                )}
              </TabsContent>

              <TabsContent value="excel" className="space-y-3">
                <Label>Subir Excel o CSV</Label>
                <Input type="file" accept=".xlsx,.xls,.csv" onChange={handleExcel} className="bg-muted" />
                {contentKind === "text" && fileName && textContent && (
                  <div className="bg-muted rounded-md p-3 max-h-40 overflow-y-auto">
                    <pre className="text-xs whitespace-pre-wrap font-mono">
                      {textContent.slice(0, 1500)}{textContent.length > 1500 ? "..." : ""}
                    </pre>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="texto" className="space-y-3">
                <Label>Pegar contenido de la cotización</Label>
                <Textarea
                  value={contentKind === "text" && !fileName ? textContent : ""}
                  onChange={(e) => handleTextChange(e.target.value)}
                  placeholder={"Proveedor: ACME SA\nFecha: 28/05/2026\n\n2 un  Cemento Loma Negra x50kg  $12.500\n10 m³  Arena gruesa  $8.000"}
                  className="bg-muted min-h-[180px] font-mono text-sm"
                />
              </TabsContent>
            </Tabs>

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Instrucciones para la IA (opcional)</Label>
              <Textarea
                value={instrucciones}
                onChange={(e) => setInstrucciones(e.target.value)}
                placeholder="Ej: el IVA ya está incluido, ignorá el flete, los precios están en dólares..."
                className="bg-muted min-h-[60px] text-sm"
              />
            </div>

            <Button onClick={processWithAI} disabled={loading || !textContent.trim()} className="w-full">
              {loading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Procesando con IA...</>
              ) : (
                <><Sparkles className="w-4 h-4 mr-2" /> Procesar con IA</>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              {preview.proveedor_nombre && (
                <div><Label className="text-xs text-muted-foreground">Proveedor</Label><p>{preview.proveedor_nombre}</p></div>
              )}
              {preview.proveedor_cuit && (
                <div><Label className="text-xs text-muted-foreground">CUIT</Label><p className="font-mono">{preview.proveedor_cuit}</p></div>
              )}
              {preview.numero_factura && (
                <div><Label className="text-xs text-muted-foreground">N° Factura</Label><p className="font-mono">{preview.numero_factura}</p></div>
              )}
              {preview.fecha && (
                <div><Label className="text-xs text-muted-foreground">Fecha</Label><p>{preview.fecha}</p></div>
              )}
              {preview.moneda && (
                <div><Label className="text-xs text-muted-foreground">Moneda</Label><p>{preview.moneda}</p></div>
              )}
              {typeof preview.incluir_iva === "boolean" && (
                <div><Label className="text-xs text-muted-foreground">IVA</Label><p>{preview.incluir_iva ? `Discriminado ${preview.iva_porcentaje ?? 21}%` : "Incluido"}</p></div>
              )}
              {typeof preview.percepcion_iva === "number" && preview.percepcion_iva > 0 && (
                <div><Label className="text-xs text-muted-foreground">Percepción IVA</Label><p className="font-mono">{preview.percepcion_iva.toLocaleString("es-AR", { minimumFractionDigits: 2 })}</p></div>
              )}
              {typeof preview.percepcion_iibb === "number" && preview.percepcion_iibb > 0 && (
                <div><Label className="text-xs text-muted-foreground">Percepción IIBB</Label><p className="font-mono">{preview.percepcion_iibb.toLocaleString("es-AR", { minimumFractionDigits: 2 })}</p></div>
              )}
              {preview.condiciones_pago && (
                <div className="col-span-2"><Label className="text-xs text-muted-foreground">Condiciones de pago</Label><p>{preview.condiciones_pago}</p></div>
              )}
            </div>

            <div className="border rounded-md overflow-hidden">
              <div className="bg-primary/10 px-3 py-2 font-semibold text-sm">
                Ítems detectados ({preview.items.length})
              </div>
              <div className="max-h-[320px] overflow-y-auto">
                <div className="grid grid-cols-12 gap-1 text-xs font-semibold text-muted-foreground px-2 py-1 border-b">
                  <span className="col-span-2">Artículo</span>
                  <span className="col-span-5">Descripción</span>
                  <span className="col-span-1">Un.</span>
                  <span className="col-span-2 text-right">Cant.</span>
                  <span className="col-span-2 text-right">P. Unit.</span>
                </div>
                {preview.items.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-1 text-xs px-2 py-1 border-b last:border-b-0">
                    <span className="col-span-2 truncate font-mono">{item.articulo || "—"}</span>
                    <span className="col-span-5 truncate">{item.descripcion}</span>
                    <span className="col-span-1">{item.unidad}</span>
                    <span className="col-span-2 text-right font-mono">{item.cantidad?.toLocaleString("es-AR")}</span>
                    <span className="col-span-2 text-right font-mono">
                      {item.precio_unitario?.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setPreview(null)} className="flex-1">Volver</Button>
              <Button onClick={apply} className="flex-1">
                <Check className="w-4 h-4 mr-2" /> Usar estos datos
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
