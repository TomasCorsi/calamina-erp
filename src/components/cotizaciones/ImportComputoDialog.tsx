import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Loader2, FileSpreadsheet, Image, FileText, Check, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { CotizacionCategoriaForm, CotizacionItemForm, calcularTotalItem } from "@/hooks/useCotizaciones";
import * as XLSX from "xlsx";

interface ExtractedData {
  descripcion_general?: string;
  categorias: { numero: number; nombre: string }[];
  items: {
    categoria_index: number;
    numero: string;
    descripcion: string;
    unidad: string;
    cantidad_m2?: number;
    altura_promedio?: number;
    cantidad_m3: number;
    precio_unitario?: number;
  }[];
}

interface ImportComputoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: (
    categorias: CotizacionCategoriaForm[],
    items: CotizacionItemForm[],
    descripcion?: string
  ) => void;
}

export function ImportComputoDialog({ open, onOpenChange, onImportComplete }: ImportComputoDialogProps) {
  const [tab, setTab] = useState("archivo");
  const [loading, setLoading] = useState(false);
  const [textContent, setTextContent] = useState("");
  const [preview, setPreview] = useState<ExtractedData | null>(null);
  const [fileName, setFileName] = useState("");
  const [instrucciones, setInstrucciones] = useState("");

  const reset = () => {
    setTextContent("");
    setPreview(null);
    setFileName("");
    setInstrucciones("");
    setLoading(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);

    if (file.name.match(/\.(xlsx|xls|csv)$/i)) {
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const text = XLSX.utils.sheet_to_csv(ws, { FS: "\t" });
      setTextContent(text);
      setTab("archivo");
    } else {
      toast.error("Formato no soportado. Usá Excel, CSV o imagen.");
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Seleccioná una imagen (JPG, PNG)");
      return;
    }
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setTextContent(reader.result as string); // base64 data URL
    };
    reader.readAsDataURL(file);
  };

  const processWithAI = async () => {
    if (!textContent.trim()) {
      toast.error("No hay contenido para procesar");
      return;
    }
    setLoading(true);
    try {
      const isImage = textContent.startsWith("data:image/");
      const { data, error } = await supabase.functions.invoke("parse-computo", {
        body: { content: textContent, type: isImage ? "image" : "text", instrucciones: instrucciones.trim() || undefined },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setPreview(data as ExtractedData);
      toast.success("Cómputo extraído correctamente");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Error al procesar con IA");
    } finally {
      setLoading(false);
    }
  };

  const applyToForm = () => {
    if (!preview) return;

    const categorias: CotizacionCategoriaForm[] = preview.categorias.map((c, i) => ({
      numero: c.numero || i + 1,
      nombre: c.nombre,
      orden: i,
    }));

    const items: CotizacionItemForm[] = preview.items.map((item) => {
      const formItem: CotizacionItemForm = {
        categoria_index: item.categoria_index,
        numero: item.numero,
        descripcion: item.descripcion,
        unidad: item.unidad || "m³",
        cantidad: item.cantidad_m3 || 0,
        cantidad_m2: item.cantidad_m2 || 0,
        altura_promedio: item.altura_promedio || 0,
        cantidad_m3: item.cantidad_m3 || 0,
        precio_unitario: item.precio_unitario || 0,
        subtotal: 0,
        total: 0,
      };
      formItem.total = calcularTotalItem(formItem);
      formItem.subtotal = formItem.total;
      return formItem;
    });

    onImportComplete(categorias, items, preview.descripcion_general);
    onOpenChange(false);
    reset();
    toast.success("Cómputo aplicado al formulario");
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Importar Cómputo con IA
          </DialogTitle>
        </DialogHeader>

        {!preview ? (
          <div className="space-y-4">
            <Tabs value={tab} onValueChange={setTab}>
              <TabsList className="grid grid-cols-3 w-full">
                <TabsTrigger value="archivo" className="flex items-center gap-1">
                  <FileSpreadsheet className="w-4 h-4" /> Archivo
                </TabsTrigger>
                <TabsTrigger value="imagen" className="flex items-center gap-1">
                  <Image className="w-4 h-4" /> Imagen
                </TabsTrigger>
                <TabsTrigger value="texto" className="flex items-center gap-1">
                  <FileText className="w-4 h-4" /> Texto
                </TabsTrigger>
              </TabsList>

              <TabsContent value="archivo" className="space-y-3">
                <Label>Subir archivo Excel o CSV</Label>
                <Input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileUpload}
                  className="bg-muted"
                />
                {textContent && tab === "archivo" && !textContent.startsWith("data:image/") && (
                  <div className="bg-muted rounded-md p-3 max-h-40 overflow-y-auto">
                    <pre className="text-xs whitespace-pre-wrap font-mono">
                      {textContent.slice(0, 1500)}{textContent.length > 1500 ? "..." : ""}
                    </pre>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="imagen" className="space-y-3">
                <Label>Subir foto del cómputo</Label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="bg-muted"
                />
                {textContent && textContent.startsWith("data:image/") && (
                  <div className="flex justify-center">
                    <img src={textContent} alt="Preview" className="max-h-48 rounded-md border" />
                  </div>
                )}
              </TabsContent>

              <TabsContent value="texto" className="space-y-3">
                <Label>Pegar cómputo o notas</Label>
                <Textarea
                  value={textContent.startsWith("data:image/") ? "" : textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  placeholder={"1. Movimiento de Suelo\n1.1 Excavación zanja - 500 m³ - $3500/m³\n1.2 Relleno compactado - 300 m³\n\n2. Hormigón\n2.1 H21 para fundaciones - 120 m³ - $45000/m³"}
                  className="bg-muted min-h-[200px] font-mono text-sm"
                />
              </TabsContent>
            </Tabs>

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Instrucciones para la IA (opcional)</Label>
              <Textarea
                value={instrucciones}
                onChange={(e) => setInstrucciones(e.target.value)}
                placeholder="Ej: Los precios están en dólares, la columna D es la cantidad, ignorar subtotales..."
                className="bg-muted min-h-[60px] text-sm"
              />
            </div>

            <Button
              onClick={processWithAI}
              disabled={loading || !textContent.trim()}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Procesando con IA...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Procesar con IA
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {preview.descripcion_general && (
              <div className="bg-muted rounded-md p-3">
                <Label className="text-xs text-muted-foreground">Descripción detectada</Label>
                <p className="text-sm mt-1">{preview.descripcion_general}</p>
              </div>
            )}

            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {preview.categorias.map((cat, catIdx) => (
                <div key={catIdx} className="border rounded-md overflow-hidden">
                  <div className="bg-primary/10 px-3 py-2 font-semibold text-sm">
                    {cat.numero}. {cat.nombre}
                  </div>
                  <div className="p-2 space-y-1">
                    {preview.items
                      .filter((i) => i.categoria_index === catIdx)
                      .map((item, idx) => (
                        <div key={idx} className="grid grid-cols-12 gap-1 text-xs items-center px-1">
                          <span className="col-span-1 font-mono text-muted-foreground">{item.numero}</span>
                          <span className="col-span-5 truncate">{item.descripcion}</span>
                          <span className="col-span-1 text-center">{item.unidad}</span>
                          <span className="col-span-2 text-right font-mono">
                            {item.cantidad_m3?.toLocaleString("es-AR") || "0"}
                          </span>
                          <span className="col-span-3 text-right font-mono">
                            {item.precio_unitario
                              ? `$${item.precio_unitario.toLocaleString("es-AR")}`
                              : "-"}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              ))}
            </div>

            <p className="text-xs text-muted-foreground text-center">
              {preview.categorias.length} rubros · {preview.items.length} ítems detectados
            </p>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setPreview(null)} className="flex-1">
                Volver a procesar
              </Button>
              <Button onClick={applyToForm} className="flex-1">
                <Check className="w-4 h-4 mr-2" />
                Aplicar al formulario
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
