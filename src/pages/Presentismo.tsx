import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormDialog } from "@/components/shared/FormDialog";
import { DetailDialog } from "@/components/shared/DetailDialog";
import { DetailRow } from "@/components/shared/DetailRow";
import { DeleteConfirmDialog } from "@/components/shared/DeleteConfirmDialog";
import { Plus, Search, Eye, Pencil, Trash2, Calendar, Users, Clock, Loader2 } from "lucide-react";
import { usePresentismo, RegistroHHWithRelations, RegistroHHForm, EstadoPresentismo } from "@/hooks/usePresentismo";
import { useObras } from "@/hooks/useObras";
import { useOperationalPersonal } from "@/hooks/useOperationalPersonal";

const estadoLabels: Record<string, string> = {
  presente: "Presente",
  ausente: "Ausente",
  licencia: "Licencia",
  vacaciones: "Vacaciones",
  enfermedad: "Enfermedad",
};

const estadoColors: Record<string, string> = {
  presente: "bg-green-500/20 text-green-400 border-green-500/30",
  ausente: "bg-red-500/20 text-red-400 border-red-500/30",
  licencia: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  vacaciones: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  enfermedad: "bg-orange-500/20 text-orange-400 border-orange-500/30",
};

export default function Presentismo() {
  const { registros, loading, createRegistro, updateRegistro, deleteRegistro } = usePresentismo();
  const { obras } = useObras();
  const { personal } = useOperationalPersonal();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [fechaFilter, setFechaFilter] = useState(new Date().toISOString().split("T")[0]);
  const [obraFilter, setObraFilter] = useState<string>("all");
  const [estadoFilter, setEstadoFilter] = useState<string>("all");
  
  // Dialog states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedRegistro, setSelectedRegistro] = useState<RegistroHHWithRelations | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState<RegistroHHForm>({
    fecha: fechaFilter,
    persona_id: "",
    obra_id: "",
    capataz_id: "",
    hora_entrada: "07:00",
    hora_salida: "15:00",
    horas_normales: 8,
    horas_extra: 0,
    horas_totales: 8,
    tarea: "",
    estado: "presente",
    observaciones: "",
  });

  // Get capataces and personal registrable
  const capataces = personal.filter(p => p.rol === "capataz" && p.activo);
  const personalRegistrable = personal.filter(p => 
    ["maquinista", "chofer", "capataz"].includes(p.rol) && p.activo
  );

  // Filtered registros by date first
  const registrosPorFecha = registros.filter(r => r.fecha === fechaFilter);
  
  // Then apply other filters
  const filteredRegistros = registrosPorFecha.filter((reg) => {
    const personaNombre = reg.persona ? `${reg.persona.nombre} ${reg.persona.apellido}` : "";
    const matchesSearch = personaNombre.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesObra = obraFilter === "all" || reg.obra_id === obraFilter;
    const matchesEstado = estadoFilter === "all" || reg.estado === estadoFilter;
    return matchesSearch && matchesObra && matchesEstado;
  });

  // Stats for selected date
  const presentes = registrosPorFecha.filter(r => r.estado === "presente").length;
  const ausentes = registrosPorFecha.filter(r => r.estado === "ausente").length;
  const totalHH = registrosPorFecha.reduce((acc, r) => acc + r.horas_totales, 0);
  const totalHHExtra = registrosPorFecha.reduce((acc, r) => acc + r.horas_extra, 0);

  const activeObras = obras.filter(o => o.estado === "activa");

  // Calculate hours
  const calcularHoras = (horaEntrada: string, horaSalida: string) => {
    if (!horaEntrada || !horaSalida) return { horas_normales: 0, horas_extra: 0, horas_totales: 0 };
    
    const [entH, entM] = horaEntrada.split(":").map(Number);
    const [salH, salM] = horaSalida.split(":").map(Number);
    
    const entradaMins = entH * 60 + entM;
    const salidaMins = salH * 60 + salM;
    const totalMins = salidaMins - entradaMins - 60; // rest 1hr for lunch
    
    const horas_totales = Math.max(0, totalMins / 60);
    const horas_normales = Math.min(8, horas_totales);
    const horas_extra = Math.max(0, horas_totales - 8);
    
    return { horas_normales, horas_extra, horas_totales };
  };

  // CRUD handlers
  const handleNew = () => {
    setSelectedRegistro(null);
    setFormData({
      fecha: fechaFilter,
      persona_id: "",
      obra_id: "",
      capataz_id: "",
      hora_entrada: "07:00",
      hora_salida: "15:00",
      horas_normales: 8,
      horas_extra: 0,
      horas_totales: 8,
      tarea: "",
      estado: "presente",
      observaciones: "",
    });
    setIsFormOpen(true);
  };

  const handleEdit = (registro: RegistroHHWithRelations) => {
    setSelectedRegistro(registro);
    setFormData({
      fecha: registro.fecha,
      persona_id: registro.persona_id,
      obra_id: registro.obra_id,
      capataz_id: registro.capataz_id,
      hora_entrada: registro.hora_entrada,
      hora_salida: registro.hora_salida,
      horas_normales: registro.horas_normales,
      horas_extra: registro.horas_extra,
      horas_totales: registro.horas_totales,
      tarea: registro.tarea,
      estado: registro.estado,
      observaciones: registro.observaciones || "",
    });
    setIsFormOpen(true);
  };

  const handleView = (registro: RegistroHHWithRelations) => {
    setSelectedRegistro(registro);
    setIsDetailOpen(true);
  };

  const handleDelete = (registro: RegistroHHWithRelations) => {
    setSelectedRegistro(registro);
    setIsDeleteOpen(true);
  };

  const handleSubmit = async () => {
    const horas = formData.estado === "presente" 
      ? calcularHoras(formData.hora_entrada, formData.hora_salida)
      : { horas_normales: 0, horas_extra: 0, horas_totales: 0 };

    const registroData: RegistroHHForm = {
      ...formData,
      ...horas,
    };

    setIsSubmitting(true);
    if (selectedRegistro) {
      await updateRegistro(selectedRegistro.id, registroData);
    } else {
      await createRegistro(registroData);
    }
    setIsSubmitting(false);
    setIsFormOpen(false);
  };

  const handleConfirmDelete = async () => {
    if (selectedRegistro) {
      await deleteRegistro(selectedRegistro.id);
    }
    setIsDeleteOpen(false);
  };

  // Update hours when times change
  const handleTimeChange = (field: "hora_entrada" | "hora_salida", value: string) => {
    const newFormData = { ...formData, [field]: value };
    const horas = calcularHoras(
      field === "hora_entrada" ? value : formData.hora_entrada,
      field === "hora_salida" ? value : formData.hora_salida
    );
    setFormData({ ...newFormData, ...horas });
  };

  if (loading) {
    return (
      <MainLayout title="Presentismo (HH)" subtitle="Control de asistencia y horas trabajadas">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Presentismo (HH)" subtitle="Control de asistencia y horas trabajadas">
      <div className="space-y-6 animate-fade-in">
        {/* Action Button */}
        <div className="flex justify-end">
          <Button onClick={handleNew} className="bg-primary hover:bg-primary/90">
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Registro
          </Button>
        </div>

        {/* Date Selector and KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
            <Calendar className="w-5 h-5 text-primary" />
            <Input
              type="date"
              value={fechaFilter}
              onChange={(e) => setFechaFilter(e.target.value)}
              className="border-0 p-0 h-auto text-lg font-semibold focus-visible:ring-0"
            />
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="text-sm text-muted-foreground flex items-center gap-1">
              <Users className="w-4 h-4" /> Presentes
            </div>
            <div className="text-2xl font-bold text-green-400">{presentes}</div>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="text-sm text-muted-foreground">Ausentes</div>
            <div className="text-2xl font-bold text-destructive">{ausentes}</div>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="text-sm text-muted-foreground flex items-center gap-1">
              <Clock className="w-4 h-4" /> Total HH
            </div>
            <div className="text-2xl font-bold text-foreground">{totalHH.toFixed(1)}</div>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="text-sm text-muted-foreground">HH Extra</div>
            <div className="text-2xl font-bold text-yellow-400">{totalHHExtra.toFixed(1)}</div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar persona..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
          <Select value={obraFilter} onValueChange={setObraFilter}>
            <SelectTrigger className="w-52">
              <SelectValue placeholder="Filtrar por obra" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las obras</SelectItem>
              {activeObras.map((obra) => (
                <SelectItem key={obra.id} value={obra.id}>{obra.nombre}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={estadoFilter} onValueChange={setEstadoFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="presente">Presente</SelectItem>
              <SelectItem value="ausente">Ausente</SelectItem>
              <SelectItem value="licencia">Licencia</SelectItem>
              <SelectItem value="vacaciones">Vacaciones</SelectItem>
              <SelectItem value="enfermedad">Enfermedad</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead>Persona</TableHead>
                <TableHead>Obra</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Entrada</TableHead>
                <TableHead>Salida</TableHead>
                <TableHead>HH Normal</TableHead>
                <TableHead>HH Extra</TableHead>
                <TableHead>Tarea</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRegistros.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    No hay registros para esta fecha
                  </TableCell>
                </TableRow>
              ) : (
                filteredRegistros.map((reg) => (
                  <TableRow key={reg.id} className="border-border">
                    <TableCell className="font-medium">
                      {reg.persona ? `${reg.persona.nombre} ${reg.persona.apellido}` : "-"}
                    </TableCell>
                    <TableCell>{reg.obra?.nombre || "-"}</TableCell>
                    <TableCell>
                      <Badge className={estadoColors[reg.estado]}>
                        {estadoLabels[reg.estado]}
                      </Badge>
                    </TableCell>
                    <TableCell>{reg.hora_entrada || "-"}</TableCell>
                    <TableCell>{reg.hora_salida || "-"}</TableCell>
                    <TableCell>{reg.horas_normales}</TableCell>
                    <TableCell className={reg.horas_extra > 0 ? "text-yellow-400 font-medium" : ""}>
                      {reg.horas_extra}
                    </TableCell>
                    <TableCell className="max-w-[150px] truncate">{reg.tarea || "-"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleView(reg)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(reg)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(reg)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Form Dialog */}
        <FormDialog
          isDirty
          open={isFormOpen}
          onOpenChange={setIsFormOpen}
          title={selectedRegistro ? "Editar Registro" : "Nuevo Registro de Asistencia"}
        >
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Fecha</Label>
              <Input
                type="date"
                value={formData.fecha}
                onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Estado</Label>
              <Select
                value={formData.estado}
                onValueChange={(v) => setFormData({ ...formData, estado: v as EstadoPresentismo })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="presente">Presente</SelectItem>
                  <SelectItem value="ausente">Ausente</SelectItem>
                  <SelectItem value="licencia">Licencia</SelectItem>
                  <SelectItem value="vacaciones">Vacaciones</SelectItem>
                  <SelectItem value="enfermedad">Enfermedad</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 col-span-2">
              <Label>Persona</Label>
              <Select
                value={formData.persona_id}
                onValueChange={(v) => setFormData({ ...formData, persona_id: v })}
              >
                <SelectTrigger><SelectValue placeholder="Seleccionar persona" /></SelectTrigger>
                <SelectContent>
                  {personalRegistrable.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nombre} {p.apellido} - {p.rol}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Obra</Label>
              <Select
                value={formData.obra_id}
                onValueChange={(v) => setFormData({ ...formData, obra_id: v })}
              >
                <SelectTrigger><SelectValue placeholder="Seleccionar obra" /></SelectTrigger>
                <SelectContent>
                  {activeObras.map((o) => (
                    <SelectItem key={o.id} value={o.id}>{o.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Capataz</Label>
              <Select
                value={formData.capataz_id}
                onValueChange={(v) => setFormData({ ...formData, capataz_id: v })}
              >
                <SelectTrigger><SelectValue placeholder="Seleccionar capataz" /></SelectTrigger>
                <SelectContent>
                  {capataces.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nombre} {c.apellido}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {formData.estado === "presente" && (
              <>
                <div className="space-y-2">
                  <Label>Hora Entrada</Label>
                  <Input
                    type="time"
                    value={formData.hora_entrada}
                    onChange={(e) => handleTimeChange("hora_entrada", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Hora Salida</Label>
                  <Input
                    type="time"
                    value={formData.hora_salida}
                    onChange={(e) => handleTimeChange("hora_salida", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>HH Normales</Label>
                  <Input type="number" value={formData.horas_normales} readOnly className="bg-muted" />
                </div>
                <div className="space-y-2">
                  <Label>HH Extra</Label>
                  <Input type="number" value={formData.horas_extra} readOnly className="bg-muted" />
                </div>
              </>
            )}
            <div className="space-y-2 col-span-2">
              <Label>Tarea</Label>
              <Input
                value={formData.tarea}
                onChange={(e) => setFormData({ ...formData, tarea: e.target.value })}
                placeholder="Descripción de la tarea realizada"
              />
            </div>
            <div className="space-y-2 col-span-2">
              <Label>Observaciones</Label>
              <Input
                value={formData.observaciones}
                onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                placeholder="Notas adicionales..."
              />
            </div>
            <div className="col-span-2 flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setIsFormOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? "Guardando..." : selectedRegistro ? "Guardar Cambios" : "Crear Registro"}
              </Button>
            </div>
          </div>
        </FormDialog>

        {/* Detail Dialog */}
        <DetailDialog
          open={isDetailOpen}
          onOpenChange={setIsDetailOpen}
          title="Detalle de Registro"
        >
          {selectedRegistro && (
            <div className="space-y-4">
              <DetailRow label="Fecha" value={selectedRegistro.fecha} />
              <DetailRow 
                label="Persona" 
                value={selectedRegistro.persona ? `${selectedRegistro.persona.nombre} ${selectedRegistro.persona.apellido}` : "-"} 
              />
              <DetailRow label="Obra" value={selectedRegistro.obra?.nombre || "-"} />
              <DetailRow 
                label="Capataz" 
                value={selectedRegistro.capataz ? `${selectedRegistro.capataz.nombre} ${selectedRegistro.capataz.apellido}` : "-"} 
              />
              <DetailRow label="Estado" value={estadoLabels[selectedRegistro.estado]} />
              <DetailRow label="Hora Entrada" value={selectedRegistro.hora_entrada || "-"} />
              <DetailRow label="Hora Salida" value={selectedRegistro.hora_salida || "-"} />
              <DetailRow label="HH Normales" value={selectedRegistro.horas_normales.toString()} />
              <DetailRow label="HH Extra" value={selectedRegistro.horas_extra.toString()} />
              <DetailRow label="HH Totales" value={selectedRegistro.horas_totales.toString()} />
              <DetailRow label="Tarea" value={selectedRegistro.tarea || "-"} />
              <DetailRow label="Observaciones" value={selectedRegistro.observaciones || "-"} />
            </div>
          )}
        </DetailDialog>

        {/* Delete Confirm Dialog */}
        <DeleteConfirmDialog
          open={isDeleteOpen}
          onOpenChange={setIsDeleteOpen}
          onConfirm={handleConfirmDelete}
          title="Eliminar Registro"
          description="¿Estás seguro de que deseas eliminar este registro de asistencia? Esta acción no se puede deshacer."
        />
      </div>
    </MainLayout>
  );
}
