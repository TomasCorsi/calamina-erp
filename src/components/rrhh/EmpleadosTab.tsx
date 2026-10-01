import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/utils";
import { useSueldosHistorial } from "@/hooks/useRrhh";
import { EmpleadoDialog } from "./EmpleadoDialog";
import type { PersonalMin } from "./planillaData";

const fmtARS = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n || 0);

export function EmpleadosTab({ personal }: { personal: PersonalMin[] }) {
  const { data: sueldos = [] } = useSueldosHistorial();
  const [search, setSearch] = useState("");
  const [sel, setSel] = useState<PersonalMin | null>(null);

  const vigentePorPersonal = useMemo(() => {
    const map = new Map<string, { acordado: number; registrado: number; modalidad: string }>();
    sueldos.forEach((s) => {
      if (!map.has(s.personal_id)) {
        map.set(s.personal_id, {
          acordado: Number(s.sueldo_acordado),
          registrado: Number(s.sueldo_registrado),
          modalidad: s.modalidad,
        });
      }
    });
    return map;
  }, [sueldos]);

  const filtrados = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return personal;
    return personal.filter((p) =>
      `${p.apellido || ""} ${p.nombre || ""} ${p.legajo || ""}`.toLowerCase().includes(q));
  }, [personal, search]);

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
        <Input className="pl-8" placeholder="Buscar empleado..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Legajo</TableHead>
                <TableHead>Empleado</TableHead>
                <TableHead>Puesto</TableHead>
                <TableHead>Sector / Obra</TableHead>
                <TableHead>Ingreso</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acordado</TableHead>
                <TableHead className="text-right">Registrado</TableHead>
                <TableHead className="text-right">Diferencia</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtrados.map((p) => {
                const s = vigentePorPersonal.get(p.id);
                return (
                  <TableRow key={p.id} className="cursor-pointer" onClick={() => setSel(p)}>
                    <TableCell>{p.legajo || "-"}</TableCell>
                    <TableCell className="font-medium whitespace-nowrap">{p.apellido} {p.nombre}</TableCell>
                    <TableCell>{(p as any).puesto || "-"}</TableCell>
                    <TableCell>{(p as any).sector || "-"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {p.fecha_ingreso ? formatDate(p.fecha_ingreso) : "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {p.estado_laboral || (p.activo ? "activo" : "baja")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{s ? fmtARS(s.acordado) : "-"}</TableCell>
                    <TableCell className="text-right">{s ? fmtARS(s.registrado) : "-"}</TableCell>
                    <TableCell className="text-right font-semibold">
                      {s ? fmtARS(s.acordado - s.registrado) : "-"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <EmpleadoDialog open={!!sel} onOpenChange={(o) => { if (!o) setSel(null); }} empleado={sel} />
    </div>
  );
}
