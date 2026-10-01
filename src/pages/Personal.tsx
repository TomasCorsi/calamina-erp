import { useState, lazy, Suspense } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUrlTab, useUrlSearch } from "@/hooks/useUrlState";
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
  Plus,
  Search,
  Phone,
  Calendar,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  User,
  Filter,
  CreditCard,
  Upload,
  Users,
  Palmtree,
  FileText,
  ShieldCheck,
  Building,
  Wallet,
  AlertTriangle,
  DollarSign,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FormDialog } from "@/components/shared/FormDialog";
import { DetailDialog } from "@/components/shared/DetailDialog";
import { DeleteConfirmDialog } from "@/components/shared/DeleteConfirmDialog";
import { DetailRow, DetailSection } from "@/components/shared/DetailRow";
import { CSVImportDialog } from "@/components/personal/CSVImportDialog";
const VacacionesTab = lazy(() => import("@/components/personal/VacacionesTab").then(m => ({ default: m.VacacionesTab })));
const LiquidacionesTab = lazy(() => import("@/components/personal/LiquidacionesTab").then(m => ({ default: m.LiquidacionesTab })));
const SueldosTab = lazy(() => import("@/components/personal/SueldosTab").then(m => ({ default: m.SueldosTab })));
const EntregaEPPTab = lazy(() => import("@/components/personal/EntregaEPPTab").then(m => ({ default: m.EntregaEPPTab })));
const DocumentosEmpleadoTab = lazy(() => import("@/components/personal/DocumentosEmpleadoTab").then(m => ({ default: m.DocumentosEmpleadoTab })));

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { usePersonal, PersonalDB, PersonalForm, RolPersonal, ModalidadPago } from "@/hooks/usePersonal";
import { cn, formatDate } from "@/lib/utils";
import { useMemo } from "react";

const rolesConfig: Record<RolPersonal, { label: string; color: string }> = {
  capataz: { label: "Capataz", color: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30" },
  maquinista: { label: "Maquinista", color: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
  chofer: { label: "Chofer", color: "bg-green-500/20 text-green-400 border-green-500/30" },
  administrativo: { label: "Administrativo", color: "bg-pink-500/20 text-pink-400 border-pink-500/30" },
  ayudante: { label: "Ayudante", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  sereno: { label: "Sereno", color: "bg-gray-500/20 text-gray-400 border-gray-500/30" },
  mecanico: { label: "Mecánico", color: "bg-red-500/20 text-red-400 border-red-500/30" },
  topografo: { label: "Topógrafo", color: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
  repartidor_calecita: { label: "Repartidor Calecita", color: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
};

export default function Personal() {
  const { personal, loading, createPersonal, updatePersonal, deletePersonal, fetchPersonal } = usePersonal();
  const [activeTab, setActiveTab] = useUrlTab("empleados");
  const [searchTerm, setSearchTerm] = useUrlSearch("");
  const [rolFilter, setRolFilter] = useState<string>("todos");
  const [formOpen, setFormOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [selectedPersona, setSelectedPersona] = useState<PersonalDB | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [numeroCuentaError, setNumeroCuentaError] = useState("");

  const [formData, setFormData] = useState<PersonalForm>({
    nombre: "",
    apellido: "",
    dni: "",
    rol: "chofer",
    email: "",
    telefono: "",
    fecha_ingreso: new Date().toISOString().split("T")[0],
    activo: true,
    licencia: "",
    vencimiento_licencia: "",
    sueldo: 0,
    sueldo_negro: 0,
    modalidad_pago: "mensual",
    legajo: "",
    situacion_laboral: "blanco",
    banco: "",
    numero_cuenta: "",
  });

  const today = new Date().toISOString().split("T")[0];
  const in20Days = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 20);
    return d.toISOString().split("T")[0];
  }, []);

  const empleadosLicenciaVencida = useMemo(() => {
    return personal.filter(
      (p) => p.activo && p.vencimiento_licencia && p.vencimiento_licencia < today
    );
  }, [personal, today]);

  const empleadosLicenciaPorVencer = useMemo(() => {
    return personal.filter(
      (p) => p.activo && p.vencimiento_licencia && p.vencimiento_licencia >= today && p.vencimiento_licencia <= in20Days
    );
  }, [personal, today, in20Days]);

  const filteredPersonal = personal.filter((p) => {
    const fullName = `${p.nombre || ""} ${p.apellido || ""}`.toLowerCase();
    const matchesSearch =
      fullName.includes(searchTerm.toLowerCase()) ||
      (p.dni || "").includes(searchTerm);
    const matchesRol = rolFilter === "todos" || p.rol === rolFilter;
    return matchesSearch && matchesRol;
  });

  const handleNew = () => {
    setIsEditing(false);
    setFormData({
      nombre: "",
      apellido: "",
      dni: "",
      rol: "chofer",
      email: "",
      telefono: "",
      fecha_ingreso: new Date().toISOString().split("T")[0],
      activo: true,
      licencia: "",
      vencimiento_licencia: "",
      sueldo: 0,
      sueldo_negro: 0,
      modalidad_pago: "mensual",
      legajo: "",
      situacion_laboral: "blanco",
      banco: "",
      numero_cuenta: "",
    });
    setFormOpen(true);
  };

  const handleEdit = (persona: PersonalDB) => {
    setIsEditing(true);
    setSelectedPersona(persona);
    setFormData({
      nombre: persona.nombre,
      apellido: persona.apellido,
      dni: persona.dni,
      rol: persona.rol,
      email: persona.email || "",
      telefono: persona.telefono,
      fecha_ingreso: persona.fecha_ingreso,
      activo: persona.activo,
      licencia: persona.licencia || "",
      vencimiento_licencia: persona.vencimiento_licencia || "",
      sueldo: persona.sueldo ?? 0,
      sueldo_negro: persona.sueldo_negro ?? 0,
      modalidad_pago: (persona.modalidad_pago as ModalidadPago) || "mensual",
      legajo: persona.legajo || "",
      situacion_laboral: persona.situacion_laboral || "blanco",
      banco: persona.banco || "",
      numero_cuenta: persona.numero_cuenta || "",
    });
    setFormOpen(true);
  };

  const handleView = (persona: PersonalDB) => {
    setSelectedPersona(persona);
    setDetailOpen(true);
  };

  const handleDelete = (persona: PersonalDB) => {
    setSelectedPersona(persona);
    setDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (selectedPersona) {
      await deletePersonal(selectedPersona.id);
    }
    setDeleteOpen(false);
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setNumeroCuentaError("");

    const cuenta = formData.numero_cuenta?.trim();
    if (cuenta) {
      const duplicado = personal.find(
        (p) =>
          p.numero_cuenta?.trim() === cuenta &&
          p.id !== selectedPersona?.id
      );
      if (duplicado) {
        setNumeroCuentaError(
          `El número de cuenta ya está registrado por ${duplicado.nombre} ${duplicado.apellido}`
        );
        return;
      }
    }

    setIsSubmitting(true);

    try {
      let success = false;

      if (isEditing && selectedPersona) {
        success = await updatePersonal(selectedPersona.id, formData);
      } else {
        const created = await createPersonal(formData);
        success = !!created;
      }

      if (success) {
        setFormOpen(false);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <MainLayout title="Personal" subtitle="Gestión de empleados y roles">
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Personal" subtitle="Gestión de empleados y roles">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-card border border-border">
          <TabsTrigger value="empleados" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Users className="w-4 h-4 mr-2" />
            Empleados
          </TabsTrigger>
          <TabsTrigger value="vacaciones" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Palmtree className="w-4 h-4 mr-2" />
            Vacaciones
          </TabsTrigger>
          <TabsTrigger value="liquidaciones" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Wallet className="w-4 h-4 mr-2" />
            Liquidaciones
          </TabsTrigger>
          <TabsTrigger value="epp" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <ShieldCheck className="w-4 h-4 mr-2" />
            EPP
          </TabsTrigger>
          <TabsTrigger value="documentos" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <FileText className="w-4 h-4 mr-2" />
            Documentos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="empleados" className="space-y-6">
          {/* Actions Bar */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre o DNI..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 bg-card border-border"
              />
            </div>
            <div className="flex gap-2">
              <Select value={rolFilter} onValueChange={setRolFilter}>
                <SelectTrigger className="w-40 bg-card border-border">
                  <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="Rol" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  <SelectItem value="todos">Todos</SelectItem>
                  {Object.entries(rolesConfig).map(([key, config]) => (
                    <SelectItem key={key} value={key}>{config.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                onClick={() => setImportOpen(true)}
                className="border-border"
              >
                <Upload className="w-4 h-4 mr-2" />
                Importar
              </Button>
              <Button
                onClick={handleNew}
                className="bg-primary hover:bg-primary/90 text-primary-foreground btn-industrial"
              >
                <Plus className="w-4 h-4 mr-2" />
                Nuevo Personal
              </Button>
            </div>
          </div>

          {/* Stats by Role */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
            {Object.entries(rolesConfig).map(([key, config]) => {
              const totalActivo = personal.filter((p) => p.rol === key && p.activo).length;
              return (
                <div key={key} className="card-industrial p-3 text-center">
                  <p className="text-xl font-bold text-foreground">{totalActivo}</p>
                  <Badge className={cn("status-badge text-[10px] mt-1", config.color)}>
                    {config.label}
                  </Badge>
                </div>
              );
            })}
          </div>

          {/* Expired License Alert */}
          {empleadosLicenciaVencida.length > 0 && (
            <Alert variant="destructive" className="border-destructive/50 bg-destructive/10">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Registros vencidos</AlertTitle>
              <AlertDescription>
                {empleadosLicenciaVencida.length === 1
                  ? `${empleadosLicenciaVencida[0].nombre || ""} ${empleadosLicenciaVencida[0].apellido || ""} tiene la licencia vencida (${formatDate(empleadosLicenciaVencida[0].vencimiento_licencia)}).`
                  : `${empleadosLicenciaVencida.length} empleados tienen la licencia vencida: ${empleadosLicenciaVencida
                      .map((p) => `${p.nombre || ""} ${p.apellido || ""} (${formatDate(p.vencimiento_licencia)})`)
                      .join(", ")}.`}
              </AlertDescription>
            </Alert>
          )}

          {empleadosLicenciaPorVencer.length > 0 && (
            <Alert className="border-chart-4/50 bg-chart-4/10 [&>svg]:text-chart-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle className="text-chart-4">Próximos a vencer (20 días)</AlertTitle>
              <AlertDescription>
                {empleadosLicenciaPorVencer.length === 1
                  ? `${empleadosLicenciaPorVencer[0].nombre || ""} ${empleadosLicenciaPorVencer[0].apellido || ""} tiene la licencia próxima a vencer (${formatDate(empleadosLicenciaPorVencer[0].vencimiento_licencia)}).`
                  : `${empleadosLicenciaPorVencer.length} empleados tienen la licencia próxima a vencer: ${empleadosLicenciaPorVencer
                      .map((p) => `${p.nombre || ""} ${p.apellido || ""} (${formatDate(p.vencimiento_licencia)})`)
                      .join(", ")}.`}
              </AlertDescription>
            </Alert>
          )}

          {/* Table */}
          <div className="card-industrial overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-muted-foreground font-medium">Nombre</TableHead>
                  <TableHead className="text-muted-foreground font-medium">DNI</TableHead>
                  <TableHead className="text-muted-foreground font-medium">Rol</TableHead>
                  <TableHead className="text-muted-foreground font-medium">Teléfono</TableHead>
                  <TableHead className="text-muted-foreground font-medium">Ingreso</TableHead>
                  <TableHead className="text-muted-foreground font-medium">Licencia</TableHead>
                  <TableHead className="text-muted-foreground font-medium">Estado</TableHead>
                  <TableHead className="text-muted-foreground font-medium w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPersonal.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      {searchTerm || rolFilter !== "todos" ? "No se encontró personal" : "No hay personal registrado"}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPersonal.map((persona, index) => (
                    <TableRow
                      key={persona.id}
                      className="border-border table-row-hover animate-fade-in"
                      style={{ animationDelay: `${index * 30}ms` }}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                            <User className="w-4 h-4 text-primary" />
                          </div>
                          <span className="font-medium text-foreground">
                            {persona.nombre || ""} {persona.apellido || ""}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm text-muted-foreground">
                        {persona.dni || "-"}
                      </TableCell>
                      <TableCell>
                        <Badge className={cn("status-badge", rolesConfig[persona.rol]?.color)}>
                          {rolesConfig[persona.rol]?.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Phone className="w-3 h-3" />
                          {persona.telefono || "-"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          {formatDate(persona.fecha_ingreso)}
                        </span>
                      </TableCell>
                      <TableCell>
                        {persona.licencia ? (
                          (() => {
                            const isExpired = persona.vencimiento_licencia && persona.vencimiento_licencia < today;
                            const isExpiringSoon = persona.vencimiento_licencia && !isExpired && persona.vencimiento_licencia <= in20Days;
                            return (
                              <span className={cn(
                                "flex items-center gap-1",
                                isExpired ? "text-destructive font-medium" :
                                isExpiringSoon ? "text-chart-4 font-medium" :
                                "text-muted-foreground"
                              )}>
                                {(isExpired || isExpiringSoon) && (
                                  <AlertTriangle className="w-3 h-3" />
                                )}
                                <CreditCard className="w-3 h-3" />
                                {persona.licencia}
                                {persona.vencimiento_licencia && (
                                  <span className="text-xs ml-1">
                                    (vto: {formatDate(persona.vencimiento_licencia)})
                                  </span>
                                )}
                              </span>
                            );
                          })()
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={cn(
                            "status-badge",
                            persona.activo ? "status-active" : "status-inactive"
                          )}
                        >
                          {persona.activo ? "Activo" : "Inactivo"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="w-4 h-4 text-muted-foreground" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-popover border-border">
                            <DropdownMenuItem
                              onClick={() => handleView(persona)}
                              className="text-foreground cursor-pointer"
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              Ver detalle
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleEdit(persona)}
                              className="text-foreground cursor-pointer"
                            >
                              <Edit className="w-4 h-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDelete(persona)}
                              className="text-destructive cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="vacaciones">
          <Suspense fallback={<div className="p-8 text-sm text-muted-foreground">Cargando…</div>}>
            <VacacionesTab />
          </Suspense>
        </TabsContent>

        <TabsContent value="liquidaciones">
          <Tabs defaultValue="sueldos" className="space-y-4">
            <TabsList className="bg-card border border-border">
              <TabsTrigger value="sueldos" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <DollarSign className="w-4 h-4 mr-2" />
                Sueldos
              </TabsTrigger>
              <TabsTrigger value="planilla" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <FileText className="w-4 h-4 mr-2" />
                Planilla Bancaria
              </TabsTrigger>
            </TabsList>
            <TabsContent value="sueldos">
              <Suspense fallback={<div className="p-8 text-sm text-muted-foreground">Cargando…</div>}>
                <SueldosTab personal={personal} />
              </Suspense>
            </TabsContent>
            <TabsContent value="planilla">
              <Suspense fallback={<div className="p-8 text-sm text-muted-foreground">Cargando…</div>}>
                <LiquidacionesTab personal={personal} />
              </Suspense>
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="epp">
          <Suspense fallback={<div className="p-8 text-sm text-muted-foreground">Cargando…</div>}>
            <EntregaEPPTab />
          </Suspense>
        </TabsContent>

        <TabsContent value="documentos">
          <Suspense fallback={<div className="p-8 text-sm text-muted-foreground">Cargando…</div>}>
            <DocumentosEmpleadoTab />
          </Suspense>
        </TabsContent>

      </Tabs>

      {/* Form Dialog */}
      <FormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        title={isEditing ? "Editar Personal" : "Nuevo Personal"}
        size="lg"
        isDirty
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre</Label>
              <Input
                id="nombre"
                value={formData.nombre || ""}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                className="bg-muted border-border"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="apellido">Apellido</Label>
              <Input
                id="apellido"
                value={formData.apellido || ""}
                onChange={(e) => setFormData({ ...formData, apellido: e.target.value })}
                className="bg-muted border-border"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dni">DNI</Label>
              <Input
                id="dni"
                value={formData.dni || ""}
                onChange={(e) => setFormData({ ...formData, dni: e.target.value })}
                className="bg-muted border-border"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rol">Rol</Label>
              <Select
                value={formData.rol || "chofer"}
                onValueChange={(value) => setFormData({ ...formData, rol: value as RolPersonal })}
              >
                <SelectTrigger className="bg-muted border-border">
                  <SelectValue placeholder="Seleccionar rol" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  {Object.entries(rolesConfig).map(([key, config]) => (
                    <SelectItem key={key} value={key}>{config.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email || ""}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="bg-muted border-border"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="telefono">Teléfono</Label>
              <Input
                id="telefono"
                value={formData.telefono || ""}
                onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                className="bg-muted border-border"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fecha_ingreso">Fecha de Ingreso</Label>
              <Input
                id="fecha_ingreso"
                type="date"
                value={formData.fecha_ingreso || ""}
                onChange={(e) => setFormData({ ...formData, fecha_ingreso: e.target.value })}
                className="bg-muted border-border"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="licencia">Tipo de Licencia</Label>
              <Input
                id="licencia"
                value={formData.licencia}
                onChange={(e) => setFormData({ ...formData, licencia: e.target.value })}
                placeholder="Ej: B2, E1"
                className="bg-muted border-border"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vencimiento_licencia">Vencimiento Licencia</Label>
              <Input
                id="vencimiento_licencia"
                type="date"
                value={formData.vencimiento_licencia}
                onChange={(e) => setFormData({ ...formData, vencimiento_licencia: e.target.value })}
                className="bg-muted border-border"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sueldo">Sueldo en Blanco</Label>
              <Input
                id="sueldo"
                type="number"
                min="0"
                step="0.01"
                value={formData.sueldo ?? 0}
                onChange={(e) => setFormData({ ...formData, sueldo: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
                className="bg-muted border-border"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sueldo_negro">Sueldo en Negro</Label>
              <Input
                id="sueldo_negro"
                type="number"
                min="0"
                step="0.01"
                value={formData.sueldo_negro ?? 0}
                onChange={(e) => setFormData({ ...formData, sueldo_negro: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
                className="bg-muted border-border"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sueldo_total">Sueldo Total</Label>
              <Input
                id="sueldo_total"
                type="text"
                value={`$${((formData.sueldo ?? 0) + (formData.sueldo_negro ?? 0)).toLocaleString()}`}
                readOnly
                className="bg-muted/50 border-border font-semibold text-primary cursor-not-allowed"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="modalidad_pago">Modalidad de Pago</Label>
              <Select
                value={formData.modalidad_pago || "mensual"}
                onValueChange={(value) => setFormData({ ...formData, modalidad_pago: value as ModalidadPago })}
              >
                <SelectTrigger className="bg-muted border-border">
                  <SelectValue placeholder="Seleccionar modalidad" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  <SelectItem value="mensual">Mensual</SelectItem>
                  <SelectItem value="quincenal">Quincenal</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="activo"
                checked={formData.activo}
                onCheckedChange={(checked) => setFormData({ ...formData, activo: checked })}
              />
              <Label htmlFor="activo">Empleado Activo</Label>
            </div>
          </div>

          <Separator className="my-4" />
          <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Building className="w-4 h-4" />
            Información Bancaria y Administrativa
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="legajo">Legajo</Label>
              <Input
                id="legajo"
                value={formData.legajo || ""}
                onChange={(e) => setFormData({ ...formData, legajo: e.target.value })}
                placeholder="Número de legajo"
                className="bg-muted border-border"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="situacion_laboral">Situación Laboral</Label>
              <Select
                value={formData.situacion_laboral || "blanco"}
                onValueChange={(value) => setFormData({ ...formData, situacion_laboral: value })}
              >
                <SelectTrigger className="bg-muted border-border">
                  <SelectValue placeholder="Seleccionar situación" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  <SelectItem value="blanco">En Blanco</SelectItem>
                  <SelectItem value="negro">En Negro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="banco">Banco</Label>
              <Input
                id="banco"
                value={formData.banco || ""}
                onChange={(e) => setFormData({ ...formData, banco: e.target.value })}
                placeholder="Nombre del banco"
                className="bg-muted border-border"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="numero_cuenta">Número de Cuenta</Label>
              <Input
                id="numero_cuenta"
                value={formData.numero_cuenta || ""}
                onChange={(e) => {
                  setFormData({ ...formData, numero_cuenta: e.target.value });
                  setNumeroCuentaError("");
                }}
                placeholder="Número de cuenta bancaria"
                className={cn(
                  "bg-muted border-border",
                  numeroCuentaError && "border-destructive focus-visible:ring-destructive"
                )}
              />
              {numeroCuentaError && (
                <p className="text-xs text-destructive">{numeroCuentaError}</p>
              )}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-primary hover:bg-primary/90" disabled={isSubmitting}>
              {isSubmitting ? "Guardando..." : isEditing ? "Guardar Cambios" : "Crear Personal"}
            </Button>
          </div>
        </form>
      </FormDialog>

      {/* Detail Dialog */}
      <DetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        title={selectedPersona ? `${selectedPersona.nombre} ${selectedPersona.apellido}` : ""}
      >
        {selectedPersona && (
          <div className="space-y-4">
            <DetailSection title="Información Personal">
              <DetailRow label="Nombre Completo" value={`${selectedPersona.nombre} ${selectedPersona.apellido}`} />
              <DetailRow label="DNI" value={selectedPersona.dni} />
              <DetailRow
                label="Rol"
                value={
                  <Badge className={cn("status-badge", rolesConfig[selectedPersona.rol]?.color)}>
                    {rolesConfig[selectedPersona.rol]?.label}
                  </Badge>
                }
              />
              <DetailRow
                label="Estado"
                value={
                  <Badge className={cn("status-badge", selectedPersona.activo ? "status-active" : "status-inactive")}>
                    {selectedPersona.activo ? "Activo" : "Inactivo"}
                  </Badge>
                }
              />
            </DetailSection>
            <DetailSection title="Contacto">
              <DetailRow label="Teléfono" value={selectedPersona.telefono} />
              <DetailRow label="Email" value={selectedPersona.email || "-"} />
            </DetailSection>
            <DetailSection title="Empleo">
              <DetailRow label="Legajo" value={selectedPersona.legajo || "-"} />
              <DetailRow label="Fecha de Ingreso" value={selectedPersona.fecha_ingreso} />
              <DetailRow label="Sueldo en Blanco" value={selectedPersona.sueldo ? `$${selectedPersona.sueldo.toLocaleString()}` : "-"} />
              <DetailRow label="Sueldo en Negro" value={selectedPersona.sueldo_negro ? `$${selectedPersona.sueldo_negro.toLocaleString()}` : "-"} />
              <DetailRow 
                label="Sueldo Total" 
                value={
                  <span className="font-semibold text-primary">
                    ${((selectedPersona.sueldo ?? 0) + (selectedPersona.sueldo_negro ?? 0)).toLocaleString()}
                  </span>
                } 
              />
              <DetailRow 
                label="Modalidad de Pago" 
                value={
                  <Badge className={cn(
                    "status-badge",
                    selectedPersona.modalidad_pago === "quincenal" 
                      ? "bg-blue-500/20 text-blue-400 border-blue-500/30" 
                      : "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                  )}>
                    {selectedPersona.modalidad_pago === "quincenal" ? "Quincenal" : "Mensual"}
                  </Badge>
                } 
              />
              <DetailRow label="Licencia" value={selectedPersona.licencia || "-"} />
              <DetailRow label="Vencimiento Licencia" value={selectedPersona.vencimiento_licencia || "-"} />
            </DetailSection>
            <DetailSection title="Información Bancaria">
              <DetailRow 
                label="Situación Laboral" 
                value={
                  <Badge className={cn(
                    "status-badge",
                    selectedPersona.situacion_laboral === "blanco" 
                      ? "bg-green-500/20 text-green-400 border-green-500/30" 
                      : "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                  )}>
                    {selectedPersona.situacion_laboral === "blanco" ? "En Blanco" : "En Negro"}
                  </Badge>
                } 
              />
              <DetailRow label="Banco" value={selectedPersona.banco || "-"} />
              <DetailRow label="Número de Cuenta" value={selectedPersona.numero_cuenta || "-"} />
            </DetailSection>
          </div>
        )}
      </DetailDialog>

      {/* Delete Confirm Dialog */}
      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={confirmDelete}
        title="Eliminar Personal"
        description={`¿Estás seguro de que deseas eliminar a "${selectedPersona?.nombre} ${selectedPersona?.apellido}"? Esta acción no se puede deshacer.`}
      />

      {/* CSV Import Dialog */}
      <CSVImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onImport={async (records) => {
          for (const record of records) {
            await createPersonal(record);
          }
          await fetchPersonal();
        }}
      />
    </MainLayout>
  );
}
