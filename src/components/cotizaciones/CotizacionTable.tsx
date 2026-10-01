import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table";
import { CotizacionItemDB, CotizacionCategoriaDB, CotizacionAnticipoDB } from "@/hooks/useCotizaciones";

interface CotizacionTableProps {
  items: CotizacionItemDB[];
  categorias: CotizacionCategoriaDB[];
  subtotal: number;
  iva: number;
  total: number;
  anticipoMonto?: number;
  anticipoTipo?: string;
  anticipoValor?: number;
  anticipos?: CotizacionAnticipoDB[];
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatNumber(value: number, decimals = 2): string {
  if (value === 0) return "-";
  return new Intl.NumberFormat("es-AR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function CotizacionTable({ items, categorias, subtotal, iva, total, anticipoMonto = 0, anticipoTipo, anticipoValor, anticipos }: CotizacionTableProps) {
  const listaAnticipos = (anticipos && anticipos.length > 0)
    ? [...anticipos].sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))
    : anticipoMonto > 0
      ? [{ id: "legacy", cotizacion_id: "", descripcion: "Anticipo", tipo: anticipoTipo || "monto", valor: anticipoValor || 0, monto: anticipoMonto, orden: 0 }]
      : [];
  const totalAnticipos = listaAnticipos.reduce((s, a) => s + Number(a.monto || 0), 0);
  // Sort categories by numero
  const sortedCategorias = [...categorias].sort((a, b) => a.numero - b.numero);
  
  // Group items by category
  const itemsByCategory = new Map<string | null, CotizacionItemDB[]>();
  
  // Initialize with null for uncategorized items
  itemsByCategory.set(null, []);
  
  // Initialize category groups
  sortedCategorias.forEach(cat => {
    itemsByCategory.set(cat.id, []);
  });
  
  // Distribute items to their categories
  items.forEach(item => {
    const categoryItems = itemsByCategory.get(item.categoria_id) || [];
    categoryItems.push(item);
    itemsByCategory.set(item.categoria_id, categoryItems);
  });

  // Calculate category subtotals
  const getCategorySubtotal = (categoryId: string): number => {
    const categoryItems = itemsByCategory.get(categoryId) || [];
    return categoryItems.reduce((sum, item) => sum + (item.total || item.subtotal || 0), 0);
  };

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="w-16 font-bold text-foreground">Núm.</TableHead>
            <TableHead className="font-bold text-foreground">Descripción</TableHead>
            <TableHead className="w-20 text-center font-bold text-foreground">Unidad</TableHead>
            <TableHead className="w-24 text-right font-bold text-foreground">Cant. (M2)</TableHead>
            <TableHead className="w-24 text-right font-bold text-foreground">Altura Prom.</TableHead>
            <TableHead className="w-24 text-right font-bold text-foreground">Cant. (M3)</TableHead>
            <TableHead className="w-28 text-right font-bold text-foreground">P. Unit.</TableHead>
            <TableHead className="w-32 text-right font-bold text-foreground">Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedCategorias.map((categoria) => {
            const categoryItems = itemsByCategory.get(categoria.id) || [];
            const categorySubtotal = getCategorySubtotal(categoria.id);
            
            return (
              <>
                {/* Category Header Row */}
                <TableRow key={`cat-${categoria.id}`} className="bg-primary/10 border-t-2 border-primary/30">
                  <TableCell className="font-bold text-primary">{categoria.numero}</TableCell>
                  <TableCell colSpan={7} className="font-bold text-primary uppercase">
                    {categoria.nombre}
                  </TableCell>
                </TableRow>
                
                {/* Category Items */}
                {categoryItems.map((item, index) => (
                  <TableRow key={item.id} className="hover:bg-muted/30">
                    <TableCell className="font-mono text-sm text-muted-foreground">
                      {item.numero || `${categoria.numero}.${index + 1}`}
                    </TableCell>
                    <TableCell>{item.descripcion}</TableCell>
                    <TableCell className="text-center uppercase">{item.unidad}</TableCell>
                    <TableCell className="text-right font-mono">
                      {formatNumber(item.cantidad_m2 || 0)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatNumber(item.altura_promedio || 0)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatNumber(item.cantidad_m3 || item.cantidad || 0)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(item.precio_unitario)}
                    </TableCell>
                    <TableCell className="text-right font-mono font-medium">
                      {formatCurrency(item.total || item.subtotal || 0)}
                    </TableCell>
                  </TableRow>
                ))}
                
                {/* Category Subtotal Row */}
                {categoryItems.length > 0 && (
                  <TableRow key={`subtotal-${categoria.id}`} className="bg-muted/20 border-b-2 border-muted">
                    <TableCell colSpan={7} className="text-right font-semibold text-muted-foreground">
                      Subtotal {categoria.nombre}:
                    </TableCell>
                    <TableCell className="text-right font-mono font-bold">
                      {formatCurrency(categorySubtotal)}
                    </TableCell>
                  </TableRow>
                )}
              </>
            );
          })}
          
          {/* Uncategorized items */}
          {(itemsByCategory.get(null) || []).length > 0 && (
            <>
              <TableRow className="bg-muted/50">
                <TableCell colSpan={8} className="font-semibold">
                  Otros Ítems
                </TableCell>
              </TableRow>
              {(itemsByCategory.get(null) || []).map((item, index) => (
                <TableRow key={item.id} className="hover:bg-muted/30">
                  <TableCell className="font-mono text-sm text-muted-foreground">
                    {item.numero || `0.${index + 1}`}
                  </TableCell>
                  <TableCell>{item.descripcion}</TableCell>
                  <TableCell className="text-center uppercase">{item.unidad}</TableCell>
                  <TableCell className="text-right font-mono">
                    {formatNumber(item.cantidad_m2 || 0)}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatNumber(item.altura_promedio || 0)}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatNumber(item.cantidad_m3 || item.cantidad || 0)}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(item.precio_unitario)}
                  </TableCell>
                  <TableCell className="text-right font-mono font-medium">
                    {formatCurrency(item.total || item.subtotal || 0)}
                  </TableCell>
                </TableRow>
              ))}
            </>
          )}
        </TableBody>
        <TableFooter>
          <TableRow className="bg-muted/30">
            <TableCell colSpan={7} className="text-right font-semibold">
              Subtotal:
            </TableCell>
            <TableCell className="text-right font-mono font-bold">
              {formatCurrency(subtotal)}
            </TableCell>
          </TableRow>
          {listaAnticipos.map((a) => (
            <TableRow key={a.id} className="bg-muted/30">
              <TableCell colSpan={7} className="text-right font-semibold">
                {a.descripcion || "Anticipo"}{a.tipo === "porcentaje" ? ` (${a.valor}%)` : ""}:
              </TableCell>
              <TableCell className="text-right font-mono font-bold text-destructive">
                - {formatCurrency(Number(a.monto || 0))}
              </TableCell>
            </TableRow>
          ))}
          {totalAnticipos > 0 && (
            <TableRow className="bg-muted/30 border-t-2 border-muted">
              <TableCell colSpan={7} className="text-right font-semibold">
                Subtotal - Anticipos:
              </TableCell>
              <TableCell className="text-right font-mono font-bold">
                {formatCurrency(subtotal - totalAnticipos)}
              </TableCell>
            </TableRow>
          )}
          <TableRow className="bg-muted/30">
            <TableCell colSpan={7} className="text-right font-semibold">
              IVA (21%):
            </TableCell>
            <TableCell className="text-right font-mono font-bold">
              {formatCurrency(iva)}
            </TableCell>
          </TableRow>
          <TableRow className="bg-primary/10">
            <TableCell colSpan={7} className="text-right font-bold text-lg text-primary">
              TOTAL:
            </TableCell>
            <TableCell className="text-right font-mono font-bold text-lg text-primary">
              {formatCurrency(total)}
            </TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  );
}
