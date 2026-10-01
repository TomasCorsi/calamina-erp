import { useState, useMemo } from "react";
import { format, subDays } from "date-fns";
import { es } from "date-fns/locale";

import { Download, Search, UserX, User, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEmpleadosSinParte } from "@/hooks/useEmpleadosSinParte";

const ROL_LABELS: Record<string, string> = {
  maquinista: "Maquinista",
  chofer: "Chofer",
  capataz: "Capataz",
  mecanico: "Mecánico",
  sereno: "Sereno",
  topografo: "Topógrafo",
  ayudante: "Ayudante",
  administrativo: "Administrativo",
};

type DatePreset = "hoy" | "ayer" | "custom";

export function EmpleadosSinParteTab() {
  const today = format(new Date(), "yyyy-MM-dd");
  const yesterday = format(subDays(new Date(), 1), "yyyy-MM-dd");

  const [datePreset, setDatePreset] = useState<DatePreset>("hoy");
  const [customDate, setCustomDate] = useState<Date | undefined>(new Date());
  const [searchTerm, setSearchTerm] = useState("");

  const selectedDate = useMemo(() => {
    if (datePreset === "hoy") return today;
    if (datePreset === "ayer") return yesterday;
    return customDate ? format(customDate, "yyyy-MM-dd") : today;
  }, [datePreset, customDate, today, yesterday]);

  const { empleadosSinParte, totalActivos, isLoading } =
    useEmpleadosSinParte(selectedDate);

  // Filter by search term
  const filteredEmpleados = useMemo(() => {
    if (!searchTerm.trim()) return empleadosSinParte;
    const term = searchTerm.toLowerCase();
    return empleadosSinParte.filter((emp) => {
      const nombre = emp.nombre?.toLowerCase() || "";
      const apellido = emp.apellido?.toLowerCase() || "";
      const legajo = emp.legajo?.toLowerCase() || "";
      return (
        nombre.includes(term) ||
        apellido.includes(term) ||
        legajo.includes(term) ||
        `${apellido} ${nombre}`.includes(term)
      );
    });
  }, [empleadosSinParte, searchTerm]);

  // Export to Excel (lazy-load xlsx)
  const handleExportExcel = async () => {
    const XLSX = await import("xlsx");
    const exportData = filteredEmpleados.map((emp) => ({
      Legajo: emp.legajo || "-",
      Apellido: emp.apellido || "-",
      Nombre: emp.nombre || "-",
      Rol: ROL_LABELS[emp.rol] || emp.rol,
      Estado: emp.tieneUsuario ? "Registrado" : "Sin cuenta",
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);

    // Auto-adjust column widths
    const colWidths = Object.keys(exportData[0] || {}).map((key) => ({
      wch: Math.max(
        key.length,
        ...exportData.map(
          (row) => String(row[key as keyof typeof row] || "").length
        )
      ),
    }));
    ws["!cols"] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Empleados Sin Parte");
    XLSX.writeFile(wb, `empleados_sin_parte_${selectedDate}.xlsx`);
  };

  const getEmpleadoNombre = (emp: (typeof empleadosSinParte)[0]) => {
    const parts = [emp.apellido, emp.nombre].filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : "Sin nombre";
  };

  const displayDate = useMemo(() => {
    const date = new Date(selectedDate + "T12:00:00");
    return format(date, "EEEE d 'de' MMMM", { locale: es });
  }, [selectedDate]);

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <UserX className="h-5 w-5 text-chart-3" />
              <CardTitle className="text-base">
                Empleados sin Parte Diario
              </CardTitle>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportExcel}
              disabled={filteredEmpleados.length === 0}
            >
              <Download className="h-4 w-4 mr-1" />
              Exportar Excel
            </Button>
          </div>

          {/* Filters Row */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            {/* Date Selector */}
            <div className="flex items-center gap-2">
              <Select
                value={datePreset}
                onValueChange={(v) => setDatePreset(v as DatePreset)}
              >
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hoy">Hoy</SelectItem>
                  <SelectItem value="ayer">Ayer</SelectItem>
                  <SelectItem value="custom">Otra fecha</SelectItem>
                </SelectContent>
              </Select>

              {datePreset === "custom" && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-[180px] justify-start text-left font-normal",
                        !customDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {customDate
                        ? format(customDate, "dd/MM/yyyy")
                        : "Seleccionar..."}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={customDate}
                      onSelect={setCustomDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              )}
            </div>

            {/* Search */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre o legajo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          {/* Date Display */}
          <div className="text-sm text-muted-foreground capitalize">
            {displayDate}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filteredEmpleados.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <User className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>
              {empleadosSinParte.length === 0
                ? "Todos los empleados activos cargaron su parte"
                : "No hay resultados para la búsqueda"}
            </p>
          </div>
        ) : (
          <>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">Legajo</TableHead>
                    <TableHead>Empleado</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead className="w-[120px]">Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmpleados.map((emp) => (
                    <TableRow key={emp.id}>
                      <TableCell className="font-mono text-sm">
                        {emp.legajo || "-"}
                      </TableCell>
                      <TableCell className="font-medium">
                        {getEmpleadoNombre(emp)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {ROL_LABELS[emp.rol] || emp.rol}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={cn(
                            "text-xs",
                            emp.tieneUsuario
                              ? "bg-chart-1/10 text-chart-1 border-chart-1/30"
                              : "bg-muted text-muted-foreground"
                          )}
                        >
                          {emp.tieneUsuario ? "Registrado" : "Sin cuenta"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Summary */}
            <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
              <span>
                Mostrando {filteredEmpleados.length} de {empleadosSinParte.length}{" "}
                empleados sin parte
              </span>
              <span>
                {empleadosSinParte.length} de {totalActivos} empleados activos no
                cargaron parte
              </span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
