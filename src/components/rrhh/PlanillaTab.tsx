import { useMemo, useState } from "react";
import { Download, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/utils";
import { useRrhhNovedades, type RrhhPeriodo } from "@/hooks/useRrhh";
import { construirPlanilla, usePeriodoExterno, round1, type PersonalMin } from "./planillaData";
import { exportPlanillaRrhh } from "@/utils/exportPlanillaRrhh";

interface Props {
  periodo: RrhhPeriodo | null;
  personal: PersonalMin[];
}

const fmtARS = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n || 0);

export function PlanillaTab({ periodo, personal }: Props) {
  const { data: novedades = [] } = useRrhhNovedades(periodo?.id ?? null);
  const { data: externo } = usePeriodoExterno(periodo);
  const [search, setSearch] = useState("");

  const rows = useMemo(() => {
    if (!periodo) return [];
    return construirPlanilla(personal, periodo, novedades, externo);
  }, [personal, periodo, novedades, externo]);

  const filtradas = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => `${r.empleado} ${r.legajo}`.toLowerCase().includes(q));
  }, [rows, search]);

  if (!periodo) {
    return (
      <Card><CardContent className="py-10 text-center text-muted-foreground">
        Elegí un período arriba para ver la planilla.
      </CardContent></Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
          <Input className="pl-8" placeholder="Buscar empleado..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Button className="gap-2" onClick={() => exportPlanillaRrhh(periodo, rows)}>
          <Download className="w-4 h-4" /> Exportar para estudio contable
        </Button>
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Legajo</TableHead>
                <TableHead>Empleado</TableHead>
                <TableHead>Ingreso</TableHead>
                <TableHead>Baja</TableHead>
                <TableHead className="text-right">Hs normales</TableHead>
                <TableHead className="text-right">Feriado trab.</TableHead>
                <TableHead className="text-right">Inasist.</TableHead>
                <TableHead className="text-right">Enfermedad</TableHead>
                <TableHead className="text-right">ART</TableHead>
                <TableHead className="text-right">Licencia</TableHead>
                <TableHead className="text-right">Vacaciones</TableHead>
                <TableHead className="text-right">Total hs</TableHead>
                <TableHead className="text-right">Premio</TableHead>
                <TableHead className="text-right">Anticipo</TableHead>
                <TableHead>Observaciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtradas.map((r) => (
                <TableRow key={r.personal_id}>
                  <TableCell>{r.legajo}</TableCell>
                  <TableCell className="font-medium whitespace-nowrap">{r.empleado}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.ingreso ? formatDate(r.ingreso) : "-"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.baja ? formatDate(r.baja) : "-"}</TableCell>
                  <TableCell className="text-right">{round1(r.horasNormales)}</TableCell>
                  <TableCell className="text-right">{round1(r.feriadoTrabajado) || "-"}</TableCell>
                  <TableCell className="text-right">{round1(r.inasistencias) || "-"}</TableCell>
                  <TableCell className="text-right">{round1(r.enfermedad) || "-"}</TableCell>
                  <TableCell className="text-right">{round1(r.art) || "-"}</TableCell>
                  <TableCell className="text-right">{round1(r.licencia) || "-"}</TableCell>
                  <TableCell className="text-right">{round1(r.vacaciones) || "-"}</TableCell>
                  <TableCell className="text-right font-semibold">{round1(r.totalHoras)}</TableCell>
                  <TableCell className="text-right">{r.premio ? fmtARS(r.premio) : "-"}</TableCell>
                  <TableCell className="text-right">{r.anticipo ? fmtARS(r.anticipo) : "-"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[220px] truncate">{r.observaciones}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
