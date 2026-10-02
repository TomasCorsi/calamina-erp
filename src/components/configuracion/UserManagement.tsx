import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Copy, Loader2, MailPlus, Search, Shield, UserCheck, Users } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/hooks/useAuth";
import { supabaseV2 as supabase } from "@/integrations/supabase/client";

type ManagedUser = { membership_id: string; user_id: string; display_name: string | null; email: string; membership_status: "active" | "suspended"; suspended_at: string | null; personal_id: string | null; personal_name: string | null; role_keys: string[] };
type Role = { role_key: string; role_name: string };
type Person = { id: string; internal_code: string; first_name: string; last_name: string; work_email: string | null };
type Invitation = { invitation_id: string; email: string; role_key: string; personal_id: string | null; state: string; expires_at: string };

const roleLabels: Record<string, string> = { admin: "Administrador", user_manager: "Gestión de usuarios", personal_manager: "Gestión de personal", viewer: "Consulta" };

export function UserManagement() {
  const { permissions, user: currentUser } = useAuth();
  const canView = permissions.has("users.view");
  const canInvite = permissions.has("users.invite");
  const canManageRoles = permissions.has("users.manage_roles");
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [roleKey, setRoleKey] = useState("");
  const [personalId, setPersonalId] = useState("");
  const [inviteUrl, setInviteUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [roleSelections, setRoleSelections] = useState<Record<string, string>>({});

  const loadData = useCallback(async () => {
    setLoading(true);
    const [usersResult, rolesResult, invitationResult, peopleResult] = await Promise.all([
      canView ? supabase.schema("api").rpc("list_users") : Promise.resolve({ data: [], error: null }),
      canInvite || canManageRoles ? supabase.schema("api").rpc("assignable_roles") : Promise.resolve({ data: [], error: null }),
      canInvite ? supabase.schema("api").rpc("list_registration_invitations") : Promise.resolve({ data: [], error: null }),
      canInvite ? supabase.schema("api").rpc("list_invitable_personal") : Promise.resolve({ data: [], error: null }),
    ]);
    if (usersResult.error || rolesResult.error || invitationResult.error || peopleResult.error) toast.error("No se pudo actualizar la gestión de usuarios");
    else {
      setUsers(Array.isArray(usersResult.data) ? usersResult.data as ManagedUser[] : []);
      const availableRoles = Array.isArray(rolesResult.data) ? rolesResult.data as Role[] : [];
      setRoles(availableRoles);
      setRoleKey((current) => current || availableRoles[0]?.role_key || "");
      setInvitations(Array.isArray(invitationResult.data) ? invitationResult.data as Invitation[] : []);
      setPeople(Array.isArray(peopleResult.data) ? peopleResult.data as Person[] : []);
    }
    setLoading(false);
  }, [canInvite, canManageRoles, canView]);

  useEffect(() => { void loadData(); }, [loadData]);

  const filteredUsers = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("es");
    if (!term) return users;
    return users.filter((managedUser) => [managedUser.display_name, managedUser.email, managedUser.personal_name, ...managedUser.role_keys].filter(Boolean).join(" ").toLocaleLowerCase("es").includes(term));
  }, [search, users]);

  const createInvitation = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setInviteUrl("");
    const { data, error } = await supabase.functions.invoke("create-registration-invitation", { body: { email: email.trim(), role_key: roleKey, personal_id: personalId || null } });
    setSubmitting(false);
    if (error || !data?.invite_url) return toast.error("No se pudo crear la invitación");
    setInviteUrl(data.invite_url);
    toast.success("Invitación creada");
    await loadData();
  };

  const revokeInvitation = async (invitationId: string) => {
    const { error } = await supabase.functions.invoke("revoke-registration-invitation", { body: { invitation_id: invitationId } });
    if (error) return toast.error("No se pudo revocar la invitación");
    toast.success("Invitación revocada");
    await loadData();
  };

  const changeMembershipStatus = async (managedUser: ManagedUser) => {
    const nextStatus = managedUser.membership_status === "active" ? "suspended" : "active";
    const { error } = await supabase.schema("api").rpc("set_membership_status", { p_membership_id: managedUser.membership_id, p_status: nextStatus });
    if (error) return toast.error("No se pudo cambiar el estado de la membresía");
    toast.success(nextStatus === "active" ? "Membresía reactivada" : "Membresía suspendida");
    await loadData();
  };

  const assignRole = async (managedUser: ManagedUser) => {
    const available = roles.filter((candidate) => !managedUser.role_keys.includes(candidate.role_key));
    const selected = available.some((candidate) => candidate.role_key === roleSelections[managedUser.membership_id]) ? roleSelections[managedUser.membership_id] : available[0]?.role_key;
    if (!selected) return;
    const { error } = await supabase.schema("api").rpc("assign_user_role", { p_membership_id: managedUser.membership_id, p_role_key: selected });
    if (error) return toast.error("No se pudo asignar el rol");
    toast.success("Rol asignado");
    await loadData();
  };

  const removeRole = async (managedUser: ManagedUser, roleKeyToRemove: string) => {
    const { error } = await supabase.schema("api").rpc("remove_user_role", { p_membership_id: managedUser.membership_id, p_role_key: roleKeyToRemove });
    if (error) return toast.error("No se pudo quitar el rol");
    toast.success("Rol quitado");
    await loadData();
  };

  return <>
    <Card className="card-industrial lg:col-span-2">
      <CardHeader className="flex flex-row items-start justify-between gap-4"><div><CardTitle className="text-lg flex items-center gap-2"><Users className="w-5 h-5 text-primary" />Gestión de Usuarios</CardTitle><CardDescription>Administra membresías, roles e invitaciones con el backend seguro</CardDescription></div>{canInvite && <Button onClick={() => setInviteOpen(true)}><MailPlus className="h-4 w-4 mr-2" />Invitar usuario</Button>}</CardHeader>
      <CardContent>
        <div className="relative mb-4 max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input placeholder="Buscar por nombre, email, personal o rol..." value={search} onChange={(event) => setSearch(event.target.value)} className="pl-9" /></div>
        <div className="rounded-md border border-border overflow-x-auto">
          {loading ? <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div> : <Table><TableHeader><TableRow><TableHead>Usuario</TableHead><TableHead>Personal</TableHead><TableHead>Roles</TableHead><TableHead>Membresía</TableHead><TableHead className="text-right">Acciones</TableHead></TableRow></TableHeader><TableBody>
            {filteredUsers.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No hay usuarios registrados</TableCell></TableRow> : filteredUsers.map((managedUser) => {
              const protectedUser = managedUser.user_id === currentUser?.id || managedUser.role_keys.includes("admin");
              const available = roles.filter((candidate) => !managedUser.role_keys.includes(candidate.role_key));
              const selected = available.some((candidate) => candidate.role_key === roleSelections[managedUser.membership_id]) ? roleSelections[managedUser.membership_id] : available[0]?.role_key;
              return <TableRow key={managedUser.membership_id}><TableCell><div className="font-medium">{managedUser.display_name ?? "Sin nombre"}</div><div className="text-xs text-muted-foreground">{managedUser.email}</div></TableCell><TableCell>{managedUser.personal_name ?? "Sin vincular"}</TableCell><TableCell><div className="flex flex-wrap gap-1">{managedUser.role_keys.map((key) => <Badge key={key} variant={key === "admin" ? "default" : "secondary"}><Shield className="h-3 w-3 mr-1" />{roleLabels[key] ?? key}{canManageRoles && !protectedUser && key !== "admin" && <button type="button" className="ml-1" aria-label={`Quitar ${key}`} onClick={() => void removeRole(managedUser, key)}>×</button>}</Badge>)}</div></TableCell><TableCell><Badge variant={managedUser.membership_status === "active" ? "secondary" : "outline"}>{managedUser.membership_status === "active" ? "Activa" : "Suspendida"}</Badge></TableCell><TableCell><div className="flex justify-end gap-2 flex-wrap">{canManageRoles && !protectedUser && available.length > 0 && <><Select value={selected} onValueChange={(value) => setRoleSelections({ ...roleSelections, [managedUser.membership_id]: value })}><SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger><SelectContent>{available.map((candidate) => <SelectItem key={candidate.role_key} value={candidate.role_key}>{candidate.role_name}</SelectItem>)}</SelectContent></Select><Button variant="outline" size="sm" onClick={() => void assignRole(managedUser)}>Asignar</Button></>}{canManageRoles && !protectedUser && <Button variant="ghost" size="sm" onClick={() => void changeMembershipStatus(managedUser)}>{managedUser.membership_status === "active" ? "Suspender" : "Reactivar"}</Button>}{protectedUser && <span className="text-xs text-muted-foreground self-center">Protegido</span>}</div></TableCell></TableRow>;
            })}
          </TableBody></Table>}
        </div>
      </CardContent>
    </Card>

    {canInvite && <Card className="card-industrial lg:col-span-2 mt-6"><CardHeader><CardTitle className="text-lg flex items-center gap-2"><UserCheck className="w-5 h-5 text-primary" />Invitaciones activas</CardTitle></CardHeader><CardContent>{invitations.length === 0 ? <p className="text-sm text-muted-foreground">No hay invitaciones activas.</p> : <Table><TableHeader><TableRow><TableHead>Email</TableHead><TableHead>Rol</TableHead><TableHead>Estado</TableHead><TableHead /></TableRow></TableHeader><TableBody>{invitations.map((invitation) => <TableRow key={invitation.invitation_id}><TableCell>{invitation.email}</TableCell><TableCell>{roleLabels[invitation.role_key] ?? invitation.role_key}</TableCell><TableCell><Badge variant="outline">{invitation.state}</Badge></TableCell><TableCell className="text-right">{invitation.state === "pending" && <Button variant="ghost" size="sm" onClick={() => void revokeInvitation(invitation.invitation_id)}>Revocar</Button>}</TableCell></TableRow>)}</TableBody></Table>}</CardContent></Card>}

    <Dialog open={inviteOpen} onOpenChange={setInviteOpen}><DialogContent className="bg-card border-border"><DialogHeader><DialogTitle>Invitar usuario</DialogTitle><DialogDescription>El acceso se crea únicamente mediante una invitación v2 segura.</DialogDescription></DialogHeader><form id="invite-user-form" onSubmit={createInvitation} className="space-y-4"><div className="space-y-2"><Label htmlFor="invite-email">Email</Label><Input id="invite-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></div><div className="space-y-2"><Label>Rol</Label><Select value={roleKey} onValueChange={setRoleKey}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{roles.map((candidate) => <SelectItem key={candidate.role_key} value={candidate.role_key}>{candidate.role_name}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2"><Label>Personal (opcional)</Label><Select value={personalId || "none"} onValueChange={(value) => { const normalized = value === "none" ? "" : value; setPersonalId(normalized); const selected = people.find((person) => person.id === normalized); if (selected?.work_email) setEmail(selected.work_email); }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Sin vincular</SelectItem>{people.map((person) => <SelectItem key={person.id} value={person.id} disabled={!person.work_email}>{person.internal_code} · {person.last_name}, {person.first_name}{person.work_email ? "" : " · sin email"}</SelectItem>)}</SelectContent></Select></div>{inviteUrl && <div className="space-y-2"><Label>Enlace de invitación</Label><div className="flex gap-2"><Input readOnly value={inviteUrl} onFocus={(event) => event.currentTarget.select()} /><Button type="button" variant="outline" size="icon" onClick={() => { void navigator.clipboard.writeText(inviteUrl); toast.success("Enlace copiado"); }}><Copy className="h-4 w-4" /></Button></div></div>}</form><DialogFooter><Button variant="outline" onClick={() => setInviteOpen(false)}>Cerrar</Button><Button form="invite-user-form" type="submit" disabled={submitting || !roleKey}>{submitting ? "Creando..." : "Crear invitación"}</Button></DialogFooter></DialogContent></Dialog>
  </>;
}
