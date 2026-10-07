import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { FileText, MoreVertical, Palmtree, Plus, Search, ShieldCheck, Users, Wallet } from "lucide-react";
import { toast } from "sonner";
import { MainLayout } from "@/components/layout/MainLayout";
import { FormDialog } from "@/components/shared/FormDialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { supabaseV2 as supabase } from "@/integrations/supabase/client";
import { WORK_ROLES, WORK_ROLE_LABELS, type WorkRole } from "@/types/workRole";
import { VacacionesTab } from "@/components/personal/VacacionesTab";
import { EntregaEPPTab } from "@/components/personal/EntregaEPPTab";
import { DocumentosEmpleadoTab } from "@/components/personal/DocumentosEmpleadoTab";
import { LiquidacionesTab } from "@/components/personal/LiquidacionesTab";
import { usePersonal } from "@/hooks/usePersonal";

type Person = {
  id: string;
  internal_code: string;
  first_name: string;
  last_name: string;
  work_email: string | null;
  job_title: string | null;
  work_role: WorkRole | null;
  status: "active" | "inactive";
  has_user: boolean;
  dni: string | null;
  telefono: string | null;
  fecha_ingreso: string | null;
  licencia: string | null;
  vencimiento_licencia: string | null;
  situacion_laboral: string | null;
};

type PersonalForm = {
  internal_code: string; first_name: string; last_name: string; work_email: string;
  job_title: string; work_role: WorkRole | ""; dni: string; telefono: string;
  fecha_ingreso: string; licencia: string; vencimiento_licencia: string; situacion_laboral: string;
};
const emptyForm: PersonalForm = {
  internal_code: "", first_name: "", last_name: "", work_email: "", job_title: "", work_role: "",
  dni: "", telefono: "", fecha_ingreso: "", licencia: "", vencimiento_licencia: "", situacion_laboral: "",
};

function RestrictedTab({ name }: { name: string }) {
  return <Alert className="max-w-3xl"><ShieldCheck className="h-4 w-4" /><AlertTitle>Acceso restringido a {name}</AlertTitle><AlertDescription>Tu usuario no tiene el permiso RRHH necesario para consultar esta sección.</AlertDescription></Alert>;
}

function PersonalLiquidacionesTab() {
  const { personal } = usePersonal();
  return <LiquidacionesTab personal={personal} />;
}

export default function Personal() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get("tab") ?? "empleados";
  const activeTab = new Set(["empleados", "vacaciones", "liquidaciones", "epp", "documentos"]).has(requestedTab)
    ? requestedTab
    : "empleados";
  const { hasPermission } = useAuth();
  const canManage = hasPermission("personal.manage");
  const canViewRrhh = hasPermission("rrhh.view");
  const canManageRrhh = hasPermission("rrhh.manage");
  const canPayroll = hasPermission("rrhh.payroll");
  const canDocuments = hasPermission("rrhh.documents");
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Person | null>(null);
  const [form, setForm] = useState<PersonalForm>(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const loadPeople = useCallback(async () => {
    setLoading(true);
    const { data, error } = canViewRrhh
      ? await supabase.schema("api").rpc("list_rrhh_personal")
      : await supabase.schema("api").rpc("list_personal");
    if (error) toast.error("No se pudo cargar el personal");
    else setPeople(Array.isArray(data) ? (data as Array<Record<string, unknown>>).map((row) => ({
      id: String(row.id),
      internal_code: String(row.internal_code ?? row.legajo ?? ""),
      first_name: String(row.first_name ?? row.nombre ?? ""),
      last_name: String(row.last_name ?? row.apellido ?? ""),
      work_email: (row.work_email ?? row.email ?? null) as string | null,
      job_title: (row.job_title ?? null) as string | null,
      work_role: (row.work_role ?? row.rol ?? null) as WorkRole | null,
      status: (row.status ?? (row.activo ? "active" : "inactive")) as "active" | "inactive",
      has_user: Boolean(row.has_user),
      dni: (row.dni ?? null) as string | null,
      telefono: (row.telefono ?? null) as string | null,
      fecha_ingreso: (row.fecha_ingreso ?? null) as string | null,
      licencia: (row.licencia ?? null) as string | null,
      vencimiento_licencia: (row.vencimiento_licencia ?? null) as string | null,
      situacion_laboral: (row.situacion_laboral ?? null) as string | null,
    })) : []);
    setLoading(false);
  }, [canViewRrhh]);

  useEffect(() => { void loadPeople(); }, [loadPeople]);

  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("es");
    return people.filter((person) => {
      const matchesStatus = statusFilter === "all" || person.status === statusFilter;
      const haystack = [person.internal_code, person.first_name, person.last_name, person.work_email, person.job_title, person.work_role].filter(Boolean).join(" ").toLocaleLowerCase("es");
      return matchesStatus && (!term || haystack.includes(term));
    });
  }, [people, search, statusFilter]);

  const openCreate = () => { setEditing(null); setForm(emptyForm); setFormOpen(true); };
  const openEdit = (person: Person) => {
    setEditing(person);
    setForm({
      internal_code: person.internal_code, first_name: person.first_name, last_name: person.last_name,
      work_email: person.work_email ?? "", job_title: person.job_title ?? "", work_role: person.work_role ?? "",
      dni: person.dni ?? "", telefono: person.telefono ?? "", fecha_ingreso: person.fecha_ingreso ?? "",
      licencia: person.licencia ?? "", vencimiento_licencia: person.vencimiento_licencia ?? "",
      situacion_laboral: person.situacion_laboral ?? "",
    });
    setFormOpen(true);
  };

  const save = async () => {
    if (!form.internal_code.trim() || !form.first_name.trim() || !form.last_name.trim()) return toast.error("Completá código, nombre y apellido");
    setSubmitting(true);
    const common = { p_internal_code: form.internal_code.trim(), p_first_name: form.first_name.trim(), p_last_name: form.last_name.trim(), p_work_email: form.work_email.trim() || null, p_job_title: form.job_title.trim() || null, p_work_role: form.work_role || null };
    const result = editing
      ? await supabase.schema("api").rpc("update_personal", { p_personal_id: editing.id, ...common })
      : await supabase.schema("api").rpc("create_personal", common);
    if (result.error) {
      setSubmitting(false);
      return toast.error("No se pudo guardar. Revisá código y email.");
    }
    const personalId = editing?.id ?? (result.data as string | null);
    if (canManageRrhh && personalId) {
      const { error: laborError } = await supabase.schema("api").rpc("update_personal_work_data", {
        p_personal_id: personalId,
        p_dni: form.dni.trim() || null,
        p_telefono: form.telefono.trim() || null,
        p_fecha_ingreso: form.fecha_ingreso || null,
        p_licencia: form.licencia.trim() || null,
        p_vencimiento_licencia: form.vencimiento_licencia || null,
        p_situacion_laboral: form.situacion_laboral || null,
      });
      if (laborError) {
        setSubmitting(false);
        return toast.error("Los datos básicos se guardaron, pero no se pudieron actualizar los datos laborales.");
      }
    }
    setSubmitting(false);
    setFormOpen(false);
    toast.success(editing ? "Personal actualizado" : "Personal creado");
    await loadPeople();
  };

  const changeStatus = async (person: Person) => {
    const nextStatus = person.status === "active" ? "inactive" : "active";
    const { error } = await supabase.schema("api").rpc("set_personal_status", { p_personal_id: person.id, p_status: nextStatus });
    if (error) return toast.error("No se pudo cambiar el estado. Revisá si tiene un usuario activo.");
    toast.success(nextStatus === "active" ? "Personal reactivado" : "Personal inactivado");
    await loadPeople();
  };

  return <MainLayout title="Personal" subtitle="Gestión de empleados y roles">
    <Tabs
      value={activeTab}
      onValueChange={(tab) => setSearchParams(tab === "empleados" ? {} : { tab })}
      className="space-y-6"
    >
      <TabsList className="bg-card border border-border">
        <TabsTrigger value="empleados" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><Users className="w-4 h-4 mr-2" />Empleados</TabsTrigger>
        <TabsTrigger value="vacaciones" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><Palmtree className="w-4 h-4 mr-2" />Vacaciones</TabsTrigger>
        <TabsTrigger value="liquidaciones" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><Wallet className="w-4 h-4 mr-2" />Liquidaciones</TabsTrigger>
        <TabsTrigger value="epp" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><ShieldCheck className="w-4 h-4 mr-2" />EPP</TabsTrigger>
        <TabsTrigger value="documentos" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><FileText className="w-4 h-4 mr-2" />Documentos</TabsTrigger>
      </TabsList>
      <TabsContent value="empleados" className="space-y-6">
        <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between">
          <div className="flex flex-1 gap-3">
            <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input placeholder="Buscar por nombre, código, email o puesto..." value={search} onChange={(event) => setSearch(event.target.value)} className="pl-9 bg-card border-border" /></div>
            <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-[150px] bg-card"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="active">Activos</SelectItem><SelectItem value="inactive">Inactivos</SelectItem><SelectItem value="all">Todos</SelectItem></SelectContent></Select>
          </div>
          {canManage && <Button onClick={openCreate} className="btn-industrial"><Plus className="w-4 h-4 mr-2" />Nuevo Personal</Button>}
        </div>
        <div className="card-industrial rounded-lg border border-border overflow-x-auto">
          {loading ? <div className="p-6 space-y-3"><Skeleton className="h-8 w-full" /><Skeleton className="h-32 w-full" /></div> : <Table>
            <TableHeader><TableRow><TableHead>Personal</TableHead><TableHead>Código</TableHead><TableHead>Email</TableHead><TableHead>Puesto</TableHead><TableHead>Usuario</TableHead><TableHead>Estado</TableHead><TableHead className="text-right">Acciones</TableHead></TableRow></TableHeader>
            <TableBody>{filtered.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No se encontraron empleados</TableCell></TableRow> : filtered.map((person) => <TableRow key={person.id}>
              <TableCell className="font-medium">{person.last_name}, {person.first_name}</TableCell><TableCell className="font-mono">{person.internal_code}</TableCell><TableCell>{person.work_email ?? "-"}</TableCell><TableCell><div>{person.job_title ?? "-"}</div>{person.work_role && <div className="text-xs text-muted-foreground">{WORK_ROLE_LABELS[person.work_role]}</div>}</TableCell><TableCell><Badge variant={person.has_user ? "default" : "outline"}>{person.has_user ? "Vinculado" : "Sin usuario"}</Badge></TableCell><TableCell><Badge variant={person.status === "active" ? "secondary" : "outline"}>{person.status === "active" ? "Activo" : "Inactivo"}</Badge></TableCell>
              <TableCell className="text-right">{canManage && <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={() => openEdit(person)}>Editar</DropdownMenuItem><DropdownMenuItem onClick={() => void changeStatus(person)}>{person.status === "active" ? "Inactivar" : "Reactivar"}</DropdownMenuItem></DropdownMenuContent></DropdownMenu>}</TableCell>
            </TableRow>)}</TableBody>
          </Table>}
        </div>
      </TabsContent>
      <TabsContent value="vacaciones">{canViewRrhh ? <VacacionesTab /> : <RestrictedTab name="Vacaciones" />}</TabsContent>
      <TabsContent value="liquidaciones">{canPayroll ? <PersonalLiquidacionesTab /> : <RestrictedTab name="Liquidaciones" />}</TabsContent>
      <TabsContent value="epp">{canViewRrhh ? <EntregaEPPTab /> : <RestrictedTab name="Entrega de EPP" />}</TabsContent>
      <TabsContent value="documentos">{canDocuments ? <DocumentosEmpleadoTab /> : <RestrictedTab name="Documentos" />}</TabsContent>
    </Tabs>
    <FormDialog open={formOpen} onOpenChange={setFormOpen} title={editing ? "Editar Personal" : "Nuevo Personal"} description="Datos básicos administrados por el backend v2" size="lg" onSubmit={() => void save()} submitLabel={submitting ? "Guardando..." : "Guardar"}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2"><Label htmlFor="internal-code">Código interno</Label><Input id="internal-code" value={form.internal_code} onChange={(event) => setForm({ ...form, internal_code: event.target.value })} /></div>
        <div className="space-y-2"><Label htmlFor="job-title">Puesto</Label><Input id="job-title" value={form.job_title} onChange={(event) => setForm({ ...form, job_title: event.target.value })} /></div>
        <div className="space-y-2"><Label>Rol operativo</Label><Select value={form.work_role || "none"} onValueChange={(value) => setForm({ ...form, work_role: value === "none" ? "" : value as WorkRole })}><SelectTrigger><SelectValue placeholder="Sin asignar" /></SelectTrigger><SelectContent><SelectItem value="none">Sin asignar</SelectItem>{WORK_ROLES.map((role) => <SelectItem key={role} value={role}>{WORK_ROLE_LABELS[role]}</SelectItem>)}</SelectContent></Select></div>
        <div className="space-y-2"><Label htmlFor="first-name">Nombre</Label><Input id="first-name" value={form.first_name} onChange={(event) => setForm({ ...form, first_name: event.target.value })} /></div>
        <div className="space-y-2"><Label htmlFor="last-name">Apellido</Label><Input id="last-name" value={form.last_name} onChange={(event) => setForm({ ...form, last_name: event.target.value })} /></div>
        <div className="space-y-2"><Label htmlFor="work-email">Email laboral</Label><Input id="work-email" type="email" value={form.work_email} onChange={(event) => setForm({ ...form, work_email: event.target.value })} /></div>
        {canManageRrhh && <>
          <div className="space-y-2"><Label htmlFor="dni">DNI</Label><Input id="dni" value={form.dni} onChange={(event) => setForm({ ...form, dni: event.target.value })} /></div>
          <div className="space-y-2"><Label htmlFor="telefono">Teléfono</Label><Input id="telefono" value={form.telefono} onChange={(event) => setForm({ ...form, telefono: event.target.value })} /></div>
          <div className="space-y-2"><Label htmlFor="fecha-ingreso">Fecha de ingreso</Label><Input id="fecha-ingreso" type="date" value={form.fecha_ingreso} onChange={(event) => setForm({ ...form, fecha_ingreso: event.target.value })} /></div>
          <div className="space-y-2"><Label htmlFor="licencia">Licencia</Label><Input id="licencia" value={form.licencia} onChange={(event) => setForm({ ...form, licencia: event.target.value })} /></div>
          <div className="space-y-2"><Label htmlFor="vencimiento-licencia">Vencimiento licencia</Label><Input id="vencimiento-licencia" type="date" value={form.vencimiento_licencia} onChange={(event) => setForm({ ...form, vencimiento_licencia: event.target.value })} /></div>
          <div className="space-y-2"><Label>Situación laboral</Label><Select value={form.situacion_laboral || "none"} onValueChange={(value) => setForm({ ...form, situacion_laboral: value === "none" ? "" : value })}><SelectTrigger><SelectValue placeholder="Sin especificar" /></SelectTrigger><SelectContent><SelectItem value="none">Sin especificar</SelectItem><SelectItem value="registrado">Registrado</SelectItem><SelectItem value="monotributista">Monotributista</SelectItem><SelectItem value="contratado">Contratado</SelectItem><SelectItem value="eventual">Eventual</SelectItem></SelectContent></Select></div>
        </>}
      </div>
    </FormDialog>
  </MainLayout>;
}
