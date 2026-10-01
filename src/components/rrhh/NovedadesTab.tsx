import { useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { formatDate } from "@/lib/utils";
import {
  NOVEDAD_LABEL, useRrhhNovedades, useCreateNovedad, useUpdateNovedad, useDeleteNovedad,
  type RrhhNovedad, type RrhhNovedadTipo, type RrhhPeriodo,
} from "@/hooks/useRrhh";
import { NovedadDialog } from "./NovedadDialog";
import type { PersonalMin } from "./planillaData";

interface Props {
  periodo: RrhhPeriodo | null;
  periodos: RrhhPeriodo[];
  personal: PersonalMin[];
}

const fmtARS = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n || 0);

export function NovedadesTab({ periodo, periodos, personal }: Props) {
  const { data: novedades = [], isLoading } = useRrhhNovedades(periodo?.id ?? null);
  const createNov = useCreateNovedad();
  const updateNov = useUpdateNovedad();
  const deleteNov = useDeleteNovedad();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<RrhhNovedad | null>(null);
  const [search, setSearch] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState<string>("todos");

  const filtradas = useMemo(() => {
    const q = search.trim().toLowerCase();
    return novedades.filter((n) => {
      const nombre = `${n.personal?.apellido || ""} ${n.personal?.nombre || ""} ${n.personal?.legajo || ""}`.toLowerCase();
      return (tipoFiltro === "todos" || n.tipo === tipoFiltro) && (!q || nombre.includes(q));
    });
  }, [novedades, search, tipoFiltro]);

  if (!periodo) {
    return (
      <Card><CardContent className="py-10 text-center text-muted-foreground">
        Elegí o creá un período arriba para empezar a cargar novedades.
      </CardContent></Card>
    );
  }

  const cerrado = periodo.estado === "cerrado";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
          <Input className="pl-8" placeholder="Buscar empleado..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={tipoFiltro} onValueChange={setTipoFiltro}>
          <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
          <SelectContent className="max-h-72">
            <SelectItem value="todos">Todos los tipos</SelectItem>
            {(Object.keys(NOVEDAD_LABEL) as RrhhNovedadTipo[]).map((t) => (
              <SelectItem key={t} value={t}>{NOVEDAD_LABEL[t]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button className="gap-2" disabled={cerrado} onClick={() => { setEditing(null); setOpen(true); }}>
          <Plus className="w-4 h-4" /> Nueva novedad
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Empleado</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Fechas</TableHead>
                <TableHead className="text-right">Horas</TableHead>
                <TableHead className="text-right">Días</TableHead>
                <TableHead className="text-right">Monto</TableHead>
                <TableHead>Observación</TableHead>
                <TableHead className="w-[90px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Cargando...</TableCell></TableRow>
              ) : filtradas.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Sin novedades cargadas</TableCell></TableRow>
              ) : filtradas.map((n) => (
                <TableRow key={n.id}>
                  <TableCell className="font-medium">
                    {n.personal?.legajo ? `${n.personal.legajo} · ` : ""}
                    {n.personal?.apellido} {n.personal?.nombre}
                  </TableCell>
                  <TableCell><Badge variant="outline">{NOVEDAD_LABEL[n.tipo]}</Badge></TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {n.fecha ? formatDate(n.fecha) : n.fecha_desde
                      ? `${formatDate(n.fecha_desde)} al ${formatDate(n.fecha_hasta)}` : "-"}
                  </TableCell>
                  <TableCell className="text-right">{n.horas ?? "-"}</TableCell>
                  <TableCell className="text-right">{n.dias ?? "-"}</TableCell>
                  <TableCell className="text-right">{n.monto ? fmtARS(Number(n.monto)) : "-"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[240px] truncate">{n.observacion || ""}</TableCell>
                  <TableCell>
                    <div className="flex gap-0.5">
                      <Button variant="ghost" size="icon" className="h-8 w-8" disabled={cerrado}
                        onClick={() => { setEditing(n); setOpen(true); }}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" disabled={cerrado}
                        onClick={() => deleteNov.mutate(n.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <NovedadDialog
        open={open}
        onOpenChange={setOpen}
        periodos={periodos}
        periodoActual={periodo}
        personal={personal}
        novedad={editing}
        saving={createNov.isPending || updateNov.isPending}
        onSave={async (input) => {
          if (editing) await updateNov.mutateAsync({ id: editing.id, ...input });
          else await createNov.mutateAsync(input);
        }}
      />
    </div>
  );
}
