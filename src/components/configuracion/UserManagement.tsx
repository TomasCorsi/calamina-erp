import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Shield, Loader2, Link2, Unlink, Mail, KeyRound, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { format } from "date-fns";
import { LinkUserDialog } from "./LinkUserDialog";
import { ChangeEmailDialog } from "./ChangeEmailDialog";
import { ChangePasswordDialog } from "./ChangePasswordDialog";
import { DeleteConfirmDialog } from "@/components/shared/DeleteConfirmDialog";

type AppRole = "admin" | "capataz" | "maquinista" | "ayudante" | "remitero";

interface PersonalRecord {
  id: string;
  legajo: string | null;
  nombre: string | null;
  apellido: string | null;
  user_id: string | null;
}

interface UserWithRole {
  user_id: string;
  nombre_completo: string;
  telefono: string | null;
  created_at: string;
  role: AppRole;
  personal?: PersonalRecord | null;
}

const roleLabels: Record<AppRole, string> = {
  admin: "Administrador",
  capataz: "Capataz",
  maquinista: "Maquinista",
  ayudante: "Ayudante",
  remitero: "Remitero",
};

const roleBadgeVariants: Record<AppRole, "default" | "secondary" | "outline" | "destructive"> = {
  admin: "default",
  capataz: "secondary",
  maquinista: "outline",
  ayudante: "destructive",
  remitero: "secondary",
};

export function UserManagement() {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [personalRecords, setPersonalRecords] = useState<PersonalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Link dialog state
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [selectedUserForLink, setSelectedUserForLink] = useState<{ id: string; name: string } | null>(null);
  
  // Unlink dialog state
  const [unlinkDialogOpen, setUnlinkDialogOpen] = useState(false);
  const [selectedUserForUnlink, setSelectedUserForUnlink] = useState<{ id: string; name: string } | null>(null);
  const [isUnlinking, setIsUnlinking] = useState(false);

  // Change email dialog state
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [selectedUserForEmail, setSelectedUserForEmail] = useState<{ id: string; name: string } | null>(null);

  // Change password dialog state
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [selectedUserForPassword, setSelectedUserForPassword] = useState<{ id: string; name: string } | null>(null);

  const fetchData = async () => {
    try {
      // Fetch profiles and roles
      const [profilesRes, rolesRes, personalRes] = await Promise.all([
        supabase.from("profiles").select("user_id, nombre_completo, telefono, created_at"),
        supabase.from("user_roles").select("user_id, role"),
        supabase.from("personal").select("id, legajo, nombre, apellido, user_id"),
      ]);

      if (profilesRes.error) throw profilesRes.error;
      if (rolesRes.error) throw rolesRes.error;
      if (personalRes.error) throw personalRes.error;

      const profiles = profilesRes.data || [];
      const roles = rolesRes.data || [];
      const personal = personalRes.data || [];

      setPersonalRecords(personal);

      // Map users with their roles and linked personal records
      const usersWithRoles: UserWithRole[] = profiles.map((profile) => {
        const userRole = roles.find((r) => r.user_id === profile.user_id);
        const linkedPersonal = personal.find((p) => p.user_id === profile.user_id);
        
        return {
          ...profile,
          role: (userRole?.role as AppRole) || "maquinista",
          personal: linkedPersonal || null,
        };
      });

      setUsers(usersWithRoles);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Error al cargar datos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Available personal for linking (not linked to any user)
  const availablePersonal = useMemo(() => {
    return personalRecords.filter((p) => !p.user_id);
  }, [personalRecords]);

  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => {
      const haystack = [
        u.nombre_completo,
        u.telefono,
        u.personal?.legajo,
        u.personal?.nombre,
        u.personal?.apellido,
        u.personal ? `${u.personal.nombre ?? ""} ${u.personal.apellido ?? ""}` : "",
        roleLabels[u.role],
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [users, searchQuery]);

  const handleRoleChange = async (userId: string, newRole: AppRole) => {
    setUpdatingUserId(userId);
    try {
      const { error } = await supabase
        .from("user_roles")
        .update({ role: newRole })
        .eq("user_id", userId);

      if (error) throw error;

      setUsers((prev) =>
        prev.map((user) =>
          user.user_id === userId ? { ...user, role: newRole } : user
        )
      );

      toast.success(`Rol actualizado a ${roleLabels[newRole]}`);
    } catch (error) {
      console.error("Error updating role:", error);
      toast.error("Error al actualizar el rol");
    } finally {
      setUpdatingUserId(null);
    }
  };

  const openLinkDialog = (userId: string, userName: string) => {
    setSelectedUserForLink({ id: userId, name: userName });
    setLinkDialogOpen(true);
  };

  const openUnlinkDialog = (userId: string, userName: string) => {
    setSelectedUserForUnlink({ id: userId, name: userName });
    setUnlinkDialogOpen(true);
  };

  const handleUnlink = async () => {
    if (!selectedUserForUnlink) return;
    
    setIsUnlinking(true);
    try {
      const { error } = await supabase
        .from("personal")
        .update({ user_id: null })
        .eq("user_id", selectedUserForUnlink.id);

      if (error) throw error;

      toast.success("Vinculación eliminada correctamente");
      await fetchData();
      setUnlinkDialogOpen(false);
    } catch (error) {
      console.error("Error unlinking user:", error);
      toast.error("Error al desvincular usuario");
    } finally {
      setIsUnlinking(false);
    }
  };

  if (loading) {
    return (
      <Card className="card-industrial">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="card-industrial lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Gestión de Usuarios
          </CardTitle>
          <CardDescription>
            Administra los usuarios y sus roles en el sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative mb-4 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre, teléfono, legajo o rol..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="rounded-md border border-border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-muted/50">
                  <TableHead className="text-muted-foreground">Usuario</TableHead>
                  <TableHead className="text-muted-foreground">Teléfono</TableHead>
                  <TableHead className="text-muted-foreground">Registro</TableHead>
                  <TableHead className="text-muted-foreground">Legajo</TableHead>
                  <TableHead className="text-muted-foreground">Rol</TableHead>
                  <TableHead className="text-muted-foreground text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      {users.length === 0 ? "No hay usuarios registrados" : "No se encontraron usuarios"}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => (
                    <TableRow key={user.user_id} className="border-border hover:bg-muted/50">
                      <TableCell className="font-medium">{user.nombre_completo}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {user.telefono || "-"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(user.created_at), "dd/MM/yyyy")}
                      </TableCell>
                      <TableCell>
                        {user.personal ? (
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="font-mono">
                              {user.personal.legajo || "S/N"}
                            </Badge>
                            <span className="text-sm text-muted-foreground truncate max-w-[120px]">
                              {user.personal.nombre} {user.personal.apellido}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => openUnlinkDialog(user.user_id, user.nombre_completo)}
                              title="Desvincular"
                            >
                              <Unlink className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => openLinkDialog(user.user_id, user.nombre_completo)}
                          >
                            <Link2 className="h-3 w-3 mr-1" />
                            Vincular
                          </Button>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={roleBadgeVariants[user.role]}>
                          <Shield className="w-3 h-3 mr-1" />
                          {roleLabels[user.role]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            title="Cambiar email"
                            onClick={() => {
                              setSelectedUserForEmail({ id: user.user_id, name: user.nombre_completo });
                              setEmailDialogOpen(true);
                            }}
                          >
                            <Mail className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            title="Cambiar contraseña"
                            onClick={() => {
                              setSelectedUserForPassword({ id: user.user_id, name: user.nombre_completo });
                              setPasswordDialogOpen(true);
                            }}
                          >
                            <KeyRound className="h-4 w-4" />
                          </Button>
                          <Select
                            value={user.role}
                            onValueChange={(value: AppRole) => handleRoleChange(user.user_id, value)}
                            disabled={updatingUserId === user.user_id}
                          >
                            <SelectTrigger className="w-[150px] bg-muted border-border">
                              {updatingUserId === user.user_id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <SelectValue />
                              )}
                            </SelectTrigger>
                            <SelectContent className="bg-popover border-border">
                              <SelectItem value="admin">Administrador</SelectItem>
                              <SelectItem value="capataz">Capataz</SelectItem>
                              <SelectItem value="maquinista">Maquinista</SelectItem>
                              <SelectItem value="ayudante">Ayudante</SelectItem>
                              <SelectItem value="remitero">Remitero</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Link User Dialog */}
      {selectedUserForLink && (
        <LinkUserDialog
          open={linkDialogOpen}
          onOpenChange={setLinkDialogOpen}
          userId={selectedUserForLink.id}
          userName={selectedUserForLink.name}
          availablePersonal={availablePersonal}
          onSuccess={fetchData}
        />
      )}

      {/* Unlink Confirmation Dialog */}
      <DeleteConfirmDialog
        open={unlinkDialogOpen}
        onOpenChange={setUnlinkDialogOpen}
        onConfirm={handleUnlink}
        title="¿Desvincular usuario?"
        description={`Se eliminará la vinculación de "${selectedUserForUnlink?.name}" con su registro de empleado. El usuario seguirá existiendo pero no tendrá un legajo asociado.`}
      />

      {/* Change Email Dialog */}
      {selectedUserForEmail && (
        <ChangeEmailDialog
          open={emailDialogOpen}
          onOpenChange={setEmailDialogOpen}
          userId={selectedUserForEmail.id}
          userName={selectedUserForEmail.name}
          onSuccess={fetchData}
        />
      )}

      {/* Change Password Dialog */}
      {selectedUserForPassword && (
        <ChangePasswordDialog
          open={passwordDialogOpen}
          onOpenChange={setPasswordDialogOpen}
          userId={selectedUserForPassword.id}
          userName={selectedUserForPassword.name}
        />
      )}
    </>
  );
}
