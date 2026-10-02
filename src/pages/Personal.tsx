import { useCallback, useEffect, useMemo, useState } from "react";
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

type Person = {
  id: string;
  internal_code: string;
  first_name: string;
  last_name: string;
  work_email: string | null;
  job_title: string | null;
  status: "active" | "inactive";
  has_user: boolean;
};

type PersonalForm = { internal_code: string; first_name: string; last_name: string; work_email: string; job_title: string };
const emptyForm: PersonalForm = { internal_code: "", first_name: "", last_name: "", work_email: "", job_title: "" };

function PendingTab({ name }: { name: string }) {
  return <Alert className="max-w-3xl"><ShieldCheck className="h-4 w-4" /><AlertTitle>{name} conserva su lugar original</AlertTitle><AlertDescription>Su interfaz se habilitará nuevamente cuando el dominio tenga tablas, RLS y operaciones v2 verificadas. No se están ejecutando consultas al backend legacy.</AlertDescription></Alert>;
}

export default function Personal() {
  const { hasPermission } = useAuth();
  const canManage = hasPermission("personal.manage");
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
    const { data, error } = await supabase.schema("api").rpc("list_personal");
    if (error) toast.error("No se pudo cargar el personal");
    else setPeople(Array.isArray(data) ? data as Person[] : []);
    setLoading(false);
  }, []);

  useEffect(() => { void loadPeople(); }, [loadPeople]);

  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("es");
    return people.filter((person) => {
      const matchesStatus = statusFilter === "all" || person.status === statusFilter;
      const haystack = [person.internal_code, person.first_name, person.last_name, person.work_email, person.job_title].filter(Boolean).join(" ").toLocaleLowerCase("es");
      return matchesStatus && (!term || haystack.includes(term));
    });
  }, [people, search, statusFilter]);

  const openCreate = () => { setEditing(null); setForm(emptyForm); setFormOpen(true); };
  const openEdit = (person: Person) => {
    setEditing(person);
    setForm({ internal_code: person.internal_code, first_name: person.first_name, last_name: person.last_name, work_email: person.work_email ?? "", job_title: person.job_title ?? "" });
    setFormOpen(true);
  };

  const save = async () => {
    if (!form.internal_code.trim() || !form.first_name.trim() || !form.last_name.trim()) return toast.error("Completá código, nombre y apellido");
    setSubmitting(true);
    const common = { p_internal_code: form.internal_code.trim(), p_first_name: form.first_name.trim(), p_last_name: form.last_name.trim(), p_work_email: form.work_email.trim() || null, p_job_title: form.job_title.trim() || null };
    const result = editing
      ? await supabase.schema("api").rpc("update_personal", { p_personal_id: editing.id, ...common })
      : await supabase.schema("api").rpc("create_personal", common);
    setSubmitting(false);
    if (result.error) return toast.error("No se pudo guardar. Revisá código y email.");
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
    <Tabs defaultValue="empleados" className="space-y-6">
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
              <TableCell className="font-medium">{person.last_name}, {person.first_name}</TableCell><TableCell className="font-mono">{person.internal_code}</TableCell><TableCell>{person.work_email ?? "-"}</TableCell><TableCell>{person.job_title ?? "-"}</TableCell><TableCell><Badge variant={person.has_user ? "default" : "outline"}>{person.has_user ? "Vinculado" : "Sin usuario"}</Badge></TableCell><TableCell><Badge variant={person.status === "active" ? "secondary" : "outline"}>{person.status === "active" ? "Activo" : "Inactivo"}</Badge></TableCell>
              <TableCell className="text-right">{canManage && <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={() => openEdit(person)}>Editar</DropdownMenuItem><DropdownMenuItem onClick={() => void changeStatus(person)}>{person.status === "active" ? "Inactivar" : "Reactivar"}</DropdownMenuItem></DropdownMenuContent></DropdownMenu>}</TableCell>
            </TableRow>)}</TableBody>
          </Table>}
        </div>
      </TabsContent>
      <TabsContent value="vacaciones"><PendingTab name="Vacaciones" /></TabsContent>
      <TabsContent value="liquidaciones"><PendingTab name="Liquidaciones" /></TabsContent>
      <TabsContent value="epp"><PendingTab name="Entrega de EPP" /></TabsContent>
      <TabsContent value="documentos"><PendingTab name="Documentos" /></TabsContent>
    </Tabs>
    <FormDialog open={formOpen} onOpenChange={setFormOpen} title={editing ? "Editar Personal" : "Nuevo Personal"} description="Datos básicos administrados por el backend v2" size="lg" onSubmit={() => void save()} submitLabel={submitting ? "Guardando..." : "Guardar"}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2"><Label htmlFor="internal-code">Código interno</Label><Input id="internal-code" value={form.internal_code} onChange={(event) => setForm({ ...form, internal_code: event.target.value })} /></div>
        <div className="space-y-2"><Label htmlFor="job-title">Puesto</Label><Input id="job-title" value={form.job_title} onChange={(event) => setForm({ ...form, job_title: event.target.value })} /></div>
        <div className="space-y-2"><Label htmlFor="first-name">Nombre</Label><Input id="first-name" value={form.first_name} onChange={(event) => setForm({ ...form, first_name: event.target.value })} /></div>
        <div className="space-y-2"><Label htmlFor="last-name">Apellido</Label><Input id="last-name" value={form.last_name} onChange={(event) => setForm({ ...form, last_name: event.target.value })} /></div>
        <div className="space-y-2 md:col-span-2"><Label htmlFor="work-email">Email laboral</Label><Input id="work-email" type="email" value={form.work_email} onChange={(event) => setForm({ ...form, work_email: event.target.value })} /></div>
      </div>
    </FormDialog>
  </MainLayout>;
}
