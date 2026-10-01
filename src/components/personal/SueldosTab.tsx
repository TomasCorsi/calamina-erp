import { useState, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Upload,
  Download,
  DollarSign,
  CheckCircle,
  XCircle,
  Trash2,
  FileSpreadsheet,
  UserCheck,
  UserX,
  Copy,
  TrendingUp,
} from "lucide-react";
import { PersonalDB } from "@/hooks/usePersonal";
import { useSueldos } from "@/hooks/useSueldos";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

interface SueldosTabProps {
  personal: PersonalDB[];
}

type RowStatus = "ok" | "match_nombre" | "sin_legajo" | "not_found";
type ImportMode = "replace" | "increase";

interface ImportRow {
  legajo: string;
  nombre: string;
  apellido: string;
  puesto: string;
  sueldo_blanco: number;
  sueldo_negro: number;
  modalidad_pago: string;
  personal_id: string | null;
  status: RowStatus;
}

function parseNumber(value: string | number): number {
  if (value === null || value === undefined || value === "") return 0;
  if (typeof value === "number") return isNaN(value) ? 0 : value;
  const str = String(value).trim();
  const plain = parseFloat(str);
  if (!isNaN(plain) && /^-?\d+\.?\d*$/.test(str)) return plain;
  if (str.includes(",")) {
    const cleaned = str.replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
    return parseFloat(cleaned) || 0;
  }
  const dotCount = (str.match(/\./g) || []).length;
  if (dotCount > 1) {
    return parseFloat(str.replace(/\s/g, "").replace(/\./g, "")) || 0;
  }
  return parseFloat(str.replace(/\s/g, "")) || 0;
}

function findCol(headers: string[], names: string[]): number {
  const norm = headers.map((h) => h.toLowerCase().trim());
  for (const n of names) {
    const idx = norm.findIndex((h) => h.includes(n.toLowerCase()));
    if (idx !== -1) return idx;
  }
  return -1;
}

const norm = (s: string) => s.toLowerCase().trim().replace(/\s+/g, " ");

const meses = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export function SueldosTab({ personal }: SueldosTabProps) {
  const now = new Date();
  const [anio, setAnio] = useState(String(now.getFullYear()));
  const [mes, setMes] = useState(String(now.getMonth() + 1).padStart(2, "0"));
  const [importRows, setImportRows] = useState<ImportRow[]>([]);
  const [importMode, setImportMode] = useState<ImportMode>("replace");
  const [increaseAlsoNextMonths, setIncreaseAlsoNextMonths] = useState(false);
  const [filterModalidad, setFilterModalidad] = useState<string[]>([]);
  const [replicateOpen, setReplicateOpen] = useState(false);
  const [replicateMonths, setReplicateMonths] = useState<number[]>([]);
  const [replicateOverwrite, setReplicateOverwrite] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const periodo = `${anio}-${mes}`;
  const {
    sueldos, isLoading,
    upsertSueldos, deletePeriodo,
    updateSueldo, deleteSueldo,
    replicateToMonths, applyIncrease,
  } = useSueldos(periodo);

  const years = useMemo(() => {
    const y = now.getFullYear();
    return [y - 1, y, y + 1].map(String);
  }, []);

  const processFile = (file: File) => {
    const ext = file.name.toLowerCase().split(".").pop();
    if (ext === "xlsx" || ext === "xls") {
      const reader = new FileReader();
      reader.onload = (e) => {
        const wb = XLSX.read(e.target?.result as ArrayBuffer, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: true });
        parseRows(rows);
      };
      reader.readAsArrayBuffer(file);
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        const lines = text.split(/\r?\n/).filter((l) => l.trim());
        const sep = lines[0].includes(";") ? ";" : lines[0].includes("\t") ? "\t" : ",";
        const rows = lines.map((l) => l.split(sep));
        parseRows(rows);
      };
      reader.readAsText(file, "UTF-8");
    }
  };

  const parseRows = (rows: unknown[][]) => {
    if (rows.length < 2) {
      toast.error("Archivo sin datos suficientes");
      return;
    }
    const headers = (rows[0] as string[]).map((h) => String(h || "").trim());
    const legajoIdx = findCol(headers, ["legajo", "leg.", "leg", "nro"]);
    const apellidoIdx = findCol(headers, ["apellido"]);
    const nombreIdx = findCol(headers, ["nombre", "empleado"]);
    const puestoIdx = findCol(headers, ["puesto", "cargo", "rol"]);
    const blancoIdx = findCol(headers, ["parte blanco", "blanco", "sueldo blanco", "sueldo_blanco"]);
    const negroIdx = findCol(headers, ["parte negra", "negro", "sueldo negro", "sueldo_negro"]);
    const totalIdx = findCol(headers, ["sueldo total", "negro+blanco", "total"]);
    const modalidadIdx = findCol(headers, ["tipo", "modalidad", "mod", "tipo pago", "modalidad_pago"]);

    if (legajoIdx === -1 && blancoIdx === -1 && totalIdx === -1) {
      toast.error("No se encontraron columnas reconocibles (Legajo, Blanco, Total)");
      return;
    }

    const result: ImportRow[] = [];
    for (let i = 1; i < rows.length; i++) {
      const cols = rows[i] as (string | number)[];
      if (!cols || cols.length < 2) continue;

      const rowStr = cols.map((c) => String(c ?? "")).join("");
      if (rowStr.includes("#¡VALOR") || rowStr.includes("#VALUE") || rowStr.includes("#REF")) continue;

      let legajo = legajoIdx !== -1 ? String(cols[legajoIdx] ?? "").trim() : "";
      if (legajo === "-") legajo = "";

      const apellido = apellidoIdx !== -1 ? String(cols[apellidoIdx] ?? "").trim() : "";
      const nombreVal = nombreIdx !== -1 ? String(cols[nombreIdx] ?? "").trim() : "";
      const puesto = puestoIdx !== -1 ? String(cols[puestoIdx] ?? "").trim() : "";

      const blanco = blancoIdx !== -1 ? parseNumber(cols[blancoIdx] ?? 0) : 0;
      const totalVal = totalIdx !== -1 ? parseNumber(cols[totalIdx] ?? 0) : 0;
      let negro = negroIdx !== -1 ? parseNumber(cols[negroIdx] ?? 0) : 0;

      if (negro === 0 && totalVal > 0 && blanco > 0 && totalVal > blanco) {
        negro = totalVal - blanco;
      }

      if (blanco === 0 && negro === 0 && totalVal === 0) continue;
      if (!legajo && !apellido && !nombreVal) continue;

      let modalidad = modalidadIdx !== -1 ? String(cols[modalidadIdx] ?? "").trim().toLowerCase() : "quincenal";
      if (modalidad === "q" || modalidad.startsWith("quince")) modalidad = "quincenal";
      else if (modalidad === "m" || modalidad.startsWith("mens")) modalidad = "mensual";

      let emp: PersonalDB | undefined;
      let status: RowStatus = "not_found";

      if (legajo) {
        emp = personal.find((p) => p.legajo === legajo);
        status = emp ? "ok" : "not_found";
      } else if (apellido) {
        const ap = norm(apellido);
        const no = norm(nombreVal);
        if (no) {
          const matches = personal.filter(
            (p) => norm(p.apellido || "") === ap && norm(p.nombre || "") === no
          );
          if (matches.length === 1) { emp = matches[0]; status = "match_nombre"; }
        }
        if (!emp) {
          const matches = personal.filter((p) => norm(p.apellido || "") === ap);
          if (matches.length === 1) { emp = matches[0]; status = "match_nombre"; }
        }
        if (!emp) status = "sin_legajo";
      } else {
        status = "sin_legajo";
      }

      const finalLegajo =
        legajo || emp?.legajo ||
        `SIN-${(apellido || "X").slice(0, 10)}-${(nombreVal || String(i)).slice(0, 10)}`.toUpperCase().replace(/\s+/g, "_");

      result.push({
        legajo: finalLegajo,
        nombre: nombreVal || (emp?.nombre || ""),
        apellido: apellido || (emp?.apellido || ""),
        puesto,
        sueldo_blanco: blanco,
        sueldo_negro: negro,
        modalidad_pago: modalidad,
        personal_id: emp?.id || null,
        status,
      });
    }
    if (result.length === 0) { toast.error("No se encontraron registros válidos"); return; }
    setImportRows(result);
    toast.success(`${result.length} registros leídos`);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const confirmImport = () => {
    if (importMode === "replace") {
      const rows = importRows.map((r) => ({
        personal_id: r.personal_id,
        legajo: r.legajo,
        nombre: r.nombre || null,
        apellido: r.apellido || null,
        puesto: r.puesto || null,
        sueldo_blanco: r.sueldo_blanco,
        sueldo_negro: r.sueldo_negro,
        modalidad_pago: r.modalidad_pago,
        periodo,
      }));
      upsertSueldos.mutate(rows, { onSuccess: () => setImportRows([]) });
    } else {
      // increase mode: only update matching legajos
      const updates = importRows
        .filter((r) => !r.legajo.startsWith("SIN-"))
        .map((r) => ({
          legajo: r.legajo,
          sueldo_blanco: r.sueldo_blanco,
          sueldo_negro: r.sueldo_negro,
        }));
      const targets: string[] = [periodo];
      if (increaseAlsoNextMonths) {
        const m0 = parseInt(mes);
        for (let m = m0 + 1; m <= 12; m++) {
          targets.push(`${anio}-${String(m).padStart(2, "0")}`);
        }
      }
      applyIncrease.mutate({ updates, targetPeriodos: targets }, {
        onSuccess: () => { setImportRows([]); setIncreaseAlsoNextMonths(false); },
      });
    }
  };

  const displayData = useMemo(() => {
    if (filterModalidad.length === 0) return sueldos;
    return sueldos.filter((s) => filterModalidad.includes(s.modalidad_pago));
  }, [sueldos, filterModalidad]);

  const kpis = useMemo(() => {
    const quinc = sueldos.filter((s) => s.modalidad_pago === "quincenal");
    const mens = sueldos.filter((s) => s.modalidad_pago === "mensual");
    const quincBlanco = quinc.reduce((a, s) => a + Number(s.sueldo_blanco), 0);
    const quincNegro = quinc.reduce((a, s) => a + Number(s.sueldo_negro), 0);
    return {
      quincBlanco, quincNegro,
      quincBlancoQ: quincBlanco / 2,
      quincNegroQ: quincNegro / 2,
      quincCount: quinc.length,
      mensBlanco: mens.reduce((a, s) => a + Number(s.sueldo_blanco), 0),
      mensNegro: mens.reduce((a, s) => a + Number(s.sueldo_negro), 0),
      mensCount: mens.length,
      totalBlanco: sueldos.reduce((a, s) => a + Number(s.sueldo_blanco), 0),
      totalNegro: sueldos.reduce((a, s) => a + Number(s.sueldo_negro), 0),
      total: sueldos.reduce((a, s) => a + Number(s.sueldo_blanco) + Number(s.sueldo_negro), 0),
    };
  }, [sueldos]);

  const fmt = (n: number) => "$" + Number(n).toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  const tableTotals = useMemo(() => ({
    blanco: displayData.reduce((a, s) => a + Number(s.sueldo_blanco), 0),
    negro: displayData.reduce((a, s) => a + Number(s.sueldo_negro), 0),
    total: displayData.reduce((a, s) => a + Number(s.sueldo_blanco) + Number(s.sueldo_negro), 0),
  }), [displayData]);

  const empleadoLabel = (apellido?: string | null, nombre?: string | null) => {
    const a = (apellido || "").trim();
    const n = (nombre || "").trim();
    if (a && n) return `${a}, ${n}`;
    return a || n || "-";
  };

  const StatusBadge = ({ status }: { status: RowStatus }) => {
    if (status === "ok") return <Badge variant="outline" className="gap-1"><CheckCircle className="w-3 h-3 text-green-500" /> Legajo OK</Badge>;
    if (status === "match_nombre") return <Badge variant="outline" className="gap-1"><UserCheck className="w-3 h-3 text-blue-400" /> Match nombre</Badge>;
    if (status === "sin_legajo") return <Badge variant="outline" className="gap-1"><UserX className="w-3 h-3 text-muted-foreground" /> Sin legajo</Badge>;
    return <Badge variant="outline" className="gap-1"><XCircle className="w-3 h-3 text-red-500" /> No encontrado</Badge>;
  };

  // Editable cell component
  const EditableNumberCell = ({ id, field, value }: { id: string; field: "sueldo_blanco" | "sueldo_negro"; value: number }) => {
    const [v, setV] = useState(String(value));
    return (
      <Input
        type="number"
        value={v}
        onChange={(e) => setV(e.target.value)}
        onBlur={() => {
          const newVal = parseFloat(v) || 0;
          if (newVal !== Number(value)) {
            updateSueldo.mutate({ id, patch: { [field]: newVal } });
          }
        }}
        className="h-8 text-right w-28 ml-auto"
      />
    );
  };

  const ModalidadCell = ({ id, value }: { id: string; value: string }) => (
    <Select value={value} onValueChange={(nv) => {
      if (nv !== value) updateSueldo.mutate({ id, patch: { modalidad_pago: nv } });
    }}>
      <SelectTrigger className="h-8 w-[120px]"><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value="quincenal">Quincenal</SelectItem>
        <SelectItem value="mensual">Mensual</SelectItem>
      </SelectContent>
    </Select>
  );

  const handleReplicate = () => {
    if (replicateMonths.length === 0) { toast.error("Seleccioná al menos un mes"); return; }
    const targetPeriodos = replicateMonths.map((m) => `${anio}-${String(m).padStart(2, "0")}`);
    replicateToMonths.mutate(
      { targetPeriodos, overwrite: replicateOverwrite },
      {
        onSuccess: () => {
          setReplicateOpen(false);
          setReplicateMonths([]);
          setReplicateOverwrite(false);
        },
      }
    );
  };

  const toggleReplicateMonth = (m: number) => {
    setReplicateMonths((prev) => prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]);
  };

  return (
    <div className="space-y-6">
      <div className="card-industrial p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
            <DollarSign className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">Sueldos por Período</h3>
            <p className="text-sm text-muted-foreground">
              Importá el Excel del estudio contable y visualizá blanco y negro
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-4 mb-6">
          <div className="space-y-2">
            <Label>Año</Label>
            <Select value={anio} onValueChange={setAnio}>
              <SelectTrigger className="w-[100px] bg-muted border-border"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-popover border-border">
                {years.map((y) => (<SelectItem key={y} value={y}>{y}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Mes</Label>
            <Select value={mes} onValueChange={setMes}>
              <SelectTrigger className="w-[150px] bg-muted border-border"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-popover border-border">
                {meses.map((m, i) => (
                  <SelectItem key={i} value={String(i + 1).padStart(2, "0")}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {sueldos.length > 0 && (
            <>
              <Button variant="outline" size="sm" onClick={() => setReplicateOpen(true)}>
                <Copy className="w-4 h-4 mr-1" /> Replicar a meses
              </Button>
              <Button variant="destructive" size="sm" onClick={() => deletePeriodo.mutate()} disabled={deletePeriodo.isPending}>
                <Trash2 className="w-4 h-4 mr-1" /> Borrar período
              </Button>
            </>
          )}
        </div>

        {/* Mode selector */}
        <div className="flex items-center gap-3 mb-3 flex-wrap">
          <Label className="text-sm">Modo de carga:</Label>
          <ToggleGroup type="single" value={importMode} onValueChange={(v) => v && setImportMode(v as ImportMode)} className="gap-2">
            <ToggleGroupItem value="replace" variant="outline" size="sm" className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
              <Upload className="w-3 h-3 mr-1" /> Reemplazar período
            </ToggleGroupItem>
            <ToggleGroupItem value="increase" variant="outline" size="sm" className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
              <TrendingUp className="w-3 h-3 mr-1" /> Aplicar aumento
            </ToggleGroupItem>
          </ToggleGroup>
          {importMode === "increase" && (
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <Checkbox checked={increaseAlsoNextMonths} onCheckedChange={(c) => setIncreaseAlsoNextMonths(c === true)} />
              También aplicar a meses siguientes del año
            </label>
          )}
        </div>

        <div
          className={cn("border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer",
            "border-primary/50 bg-primary/5 hover:border-primary")}
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="w-10 h-10 mx-auto mb-3 text-primary" />
          <p className="text-foreground font-medium">
            {importMode === "replace" ? "Arrastrá el Excel con los sueldos" : "Arrastrá el Excel con los nuevos montos"}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {importMode === "replace"
              ? "Columnas: TIPO, Leg., APELLIDO, NOMBRE, PUESTO, SUELDO TOTAL, PARTE BLANCO, PARTE NEGRA"
              : "Hace match por LEGAJO y solo actualiza los montos en el período actual" + (increaseAlsoNextMonths ? " y meses siguientes" : "")}
          </p>
          <input ref={fileInputRef} type="file" accept=".csv,.txt,.tsv,.xlsx,.xls" onChange={handleFileSelect} className="hidden" />
        </div>
      </div>

      {importRows.length > 0 && (
        <div className="card-industrial overflow-hidden">
          <div className="p-4 border-b border-border bg-muted/30 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3 flex-wrap">
              <FileSpreadsheet className="w-5 h-5 text-primary" />
              <span className="font-medium text-foreground">
                Preview — {importRows.length} registros para {meses[parseInt(mes) - 1]} {anio}
                {importMode === "increase" && <span className="ml-2 text-primary">(modo aumento)</span>}
              </span>
              <Badge variant="outline"><CheckCircle className="w-3 h-3 mr-1 text-green-500" />
                {importRows.filter((r) => r.status === "ok").length} legajo
              </Badge>
              <Badge variant="outline"><UserCheck className="w-3 h-3 mr-1 text-blue-400" />
                {importRows.filter((r) => r.status === "match_nombre").length} por nombre
              </Badge>
              <Badge variant="outline"><UserX className="w-3 h-3 mr-1 text-muted-foreground" />
                {importRows.filter((r) => r.status === "sin_legajo" || r.status === "not_found").length} sin legajo
              </Badge>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setImportRows([])}>Cancelar</Button>
              <Button onClick={confirmImport} disabled={upsertSueldos.isPending || applyIncrease.isPending} className="bg-primary hover:bg-primary/90">
                <Download className="w-4 h-4 mr-2" />
                {importMode === "increase" ? "Actualizar montos" : (sueldos.length > 0 ? "Reemplazar período" : "Importar")}
              </Button>
            </div>
          </div>
          <div className="max-h-[400px] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead>Legajo</TableHead>
                  <TableHead>Empleado</TableHead>
                  <TableHead>Puesto</TableHead>
                  <TableHead>Modalidad</TableHead>
                  <TableHead className="text-right">Blanco</TableHead>
                  <TableHead className="text-right">Negro</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Quincena (B/N)</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {importRows.map((row, idx) => (
                  <TableRow key={idx} className="border-border">
                    <TableCell className="font-mono text-xs">
                      {row.legajo.startsWith("SIN-") ? <span className="text-muted-foreground">—</span> : row.legajo}
                    </TableCell>
                    <TableCell>{empleadoLabel(row.apellido, row.nombre)}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{row.puesto || "-"}</TableCell>
                    <TableCell><Badge variant="outline" className="capitalize">{row.modalidad_pago}</Badge></TableCell>
                    <TableCell className="text-right font-medium">{fmt(row.sueldo_blanco)}</TableCell>
                    <TableCell className="text-right font-medium">{fmt(row.sueldo_negro)}</TableCell>
                    <TableCell className="text-right font-bold">{fmt(row.sueldo_blanco + row.sueldo_negro)}</TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">
                      {row.modalidad_pago === "quincenal"
                        ? `${fmt(row.sueldo_blanco / 2)} / ${fmt(row.sueldo_negro / 2)}`
                        : "—"}
                    </TableCell>
                    <TableCell><StatusBadge status={row.status} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {sueldos.length > 0 && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <KPICard title="Quincenal Mensual (B+N)" value={fmt(kpis.quincBlanco + kpis.quincNegro)} sub={`${kpis.quincCount} empleados`} color="blue" />
            <KPICard title="Quincenal × Quincena" value={fmt(kpis.quincBlancoQ + kpis.quincNegroQ)} sub={`B: ${fmt(kpis.quincBlancoQ)} | N: ${fmt(kpis.quincNegroQ)}`} color="primary" />
            <KPICard title="Mensual (B+N)" value={fmt(kpis.mensBlanco + kpis.mensNegro)} sub={`${kpis.mensCount} empleados`} color="red" />
            <KPICard title="Total Blanco" value={fmt(kpis.totalBlanco)} sub={`Período ${meses[parseInt(mes) - 1]} ${anio}`} color="blue" />
            <KPICard title="TOTAL GENERAL" value={fmt(kpis.total)} sub={`B: ${fmt(kpis.totalBlanco)} | N: ${fmt(kpis.totalNegro)}`} color="primary" />
          </div>

          <div className="card-industrial overflow-hidden">
            <div className="p-4 border-b border-border bg-muted/30 flex items-center justify-between">
              <span className="font-medium text-foreground">Detalle — {meses[parseInt(mes) - 1]} {anio} <span className="text-xs text-muted-foreground ml-2">(editable)</span></span>
              <ToggleGroup type="multiple" value={filterModalidad} onValueChange={setFilterModalidad} className="gap-2">
                <ToggleGroupItem value="quincenal" variant="outline" size="sm" className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                  Quincenal ({kpis.quincCount})
                </ToggleGroupItem>
                <ToggleGroupItem value="mensual" variant="outline" size="sm" className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                  Mensual ({kpis.mensCount})
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
            <div className="max-h-[calc(100vh-500px)] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent sticky top-0 bg-card z-10">
                    <TableHead>Legajo</TableHead>
                    <TableHead>Empleado</TableHead>
                    <TableHead>Puesto</TableHead>
                    <TableHead>Modalidad</TableHead>
                    <TableHead className="text-right">Blanco</TableHead>
                    <TableHead className="text-right">Negro</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Por quincena (B/N)</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayData.map((s) => {
                    const blanco = Number(s.sueldo_blanco);
                    const negro = Number(s.sueldo_negro);
                    const isQuinc = s.modalidad_pago === "quincenal";
                    return (
                      <TableRow key={s.id} className="border-border">
                        <TableCell className="font-mono text-xs">
                          {s.legajo.startsWith("SIN-") ? <span className="text-muted-foreground">—</span> : s.legajo}
                        </TableCell>
                        <TableCell>{empleadoLabel(s.apellido, s.nombre)}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">{s.puesto || "-"}</TableCell>
                        <TableCell><ModalidadCell id={s.id} value={s.modalidad_pago} /></TableCell>
                        <TableCell className="text-right"><EditableNumberCell id={s.id} field="sueldo_blanco" value={blanco} /></TableCell>
                        <TableCell className="text-right"><EditableNumberCell id={s.id} field="sueldo_negro" value={negro} /></TableCell>
                        <TableCell className="text-right font-bold">{fmt(blanco + negro)}</TableCell>
                        <TableCell className="text-right text-xs">
                          {isQuinc ? (
                            <span className="text-primary font-medium">
                              {fmt(blanco / 2)} / {fmt(negro / 2)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                            if (confirm("¿Eliminar este registro?")) deleteSueldo.mutate(s.id);
                          }}>
                            <Trash2 className="w-3.5 h-3.5 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  <TableRow className="border-border bg-muted/50 font-bold">
                    <TableCell colSpan={4} className="text-right text-muted-foreground">TOTALES</TableCell>
                    <TableCell className="text-right">{fmt(tableTotals.blanco)}</TableCell>
                    <TableCell className="text-right">{fmt(tableTotals.negro)}</TableCell>
                    <TableCell className="text-right text-primary">{fmt(tableTotals.total)}</TableCell>
                    <TableCell></TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>
        </>
      )}

      {!isLoading && sueldos.length === 0 && importRows.length === 0 && (
        <div className="card-industrial p-12 text-center">
          <DollarSign className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
          <p className="text-muted-foreground">
            No hay sueldos cargados para {meses[parseInt(mes) - 1]} {anio}.
            <br />
            Importá el Excel del estudio contable para comenzar.
          </p>
        </div>
      )}

      {/* Replicate Dialog */}
      <Dialog open={replicateOpen} onOpenChange={setReplicateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Replicar sueldos a otros meses</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Copia los <strong>{sueldos.length}</strong> sueldos del período <strong>{meses[parseInt(mes) - 1]} {anio}</strong> a los meses seleccionados del año <strong>{anio}</strong>.
            </p>
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" size="sm" onClick={() => {
                const all = Array.from({ length: 12 }, (_, i) => i + 1).filter((m) => m !== parseInt(mes));
                setReplicateMonths(all);
              }}>Todos los meses</Button>
              <Button variant="outline" size="sm" onClick={() => setReplicateMonths([])}>Limpiar</Button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {meses.map((m, i) => {
                const mNum = i + 1;
                const isCurrent = mNum === parseInt(mes);
                const checked = replicateMonths.includes(mNum);
                return (
                  <label key={i} className={cn("flex items-center gap-2 text-sm p-2 rounded border cursor-pointer",
                    isCurrent && "opacity-50 cursor-not-allowed",
                    checked && "border-primary bg-primary/10")}>
                    <Checkbox
                      checked={checked}
                      disabled={isCurrent}
                      onCheckedChange={() => !isCurrent && toggleReplicateMonth(mNum)}
                    />
                    {m}
                    {isCurrent && <span className="text-xs text-muted-foreground">(actual)</span>}
                  </label>
                );
              })}
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={replicateOverwrite} onCheckedChange={(c) => setReplicateOverwrite(c === true)} />
              Sobrescribir si ya hay datos cargados en ese mes
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReplicateOpen(false)}>Cancelar</Button>
            <Button onClick={handleReplicate} disabled={replicateToMonths.isPending || replicateMonths.length === 0}>
              <Copy className="w-4 h-4 mr-1" /> Replicar a {replicateMonths.length} mes(es)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function KPICard({ title, value, sub, color }: { title: string; value: string; sub: string; color: string }) {
  const colorMap: Record<string, string> = {
    blue: "text-blue-400",
    red: "text-red-400",
    primary: "text-primary",
  };
  return (
    <div className="card-industrial p-4">
      <p className="text-xs text-muted-foreground mb-1">{title}</p>
      <p className={cn("text-lg font-bold", colorMap[color] || "text-foreground")}>{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{sub}</p>
    </div>
  );
}
