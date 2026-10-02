import { Bell, FileText, Loader2, LogOut, RefreshCw, Shield, User } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import logoIcon from "@/assets/logo-icon.png";
import { ThemeToggle } from "./ThemeToggle";
import { AppLauncher } from "./AppLauncher";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { useServiceWorker } from "@/hooks/useServiceWorker";
import { toast } from "@/components/ui/sonner";

type TopNavbarProps = { title?: string; subtitle?: string };

const roleLabels: Record<string, string> = {
  admin: "Administrador",
  user_manager: "Gestión de usuarios",
  personal_manager: "Gestión de personal",
  viewer: "Consulta",
};

export function TopNavbar({ title, subtitle }: TopNavbarProps) {
  const { profile, role, signOut } = useAuth();
  const { checkForUpdates, isChecking, needRefresh } = useServiceWorker();
  const navigate = useNavigate();
  const displayRoleLabel = role ? roleLabels[role] ?? role : "";
  const initials = (profile?.nombre_completo || "Usuario").split(" ").map((part) => part[0]).join("").toUpperCase().slice(0, 2);

  const checkUpdates = async () => {
    const result = await checkForUpdates();
    if (result.found || needRefresh) toast.success("Nueva versión encontrada", { description: "Actualiza para obtener las últimas mejoras" });
    else toast.info("Ya tienes la última versión", { description: "No hay actualizaciones disponibles" });
  };

  const closeSession = async () => {
    await signOut();
    navigate("/login");
  };

  return <header className="h-16 bg-card border-b border-border px-4 md:px-6 flex items-center justify-between sticky top-0 z-30">
    <div className="flex items-center gap-4">
      <Link to="/" className="flex items-center gap-2 group">
        <img src={logoIcon} alt="Calamina Sur" className="w-9 h-9 transition-transform group-hover:scale-105" />
        <div className="hidden sm:flex flex-col"><span className="font-bold text-foreground tracking-tight text-sm">Calamina Sur</span><span className="text-[10px] text-muted-foreground -mt-0.5">Movimientos de Suelo</span></div>
      </Link>
      {title && <><div className="hidden sm:block h-8 w-px bg-border" /><div className="flex flex-col"><h1 className="text-base md:text-lg font-semibold text-foreground line-clamp-1">{title}</h1>{subtitle && <p className="text-xs text-muted-foreground hidden md:block">{subtitle}</p>}</div></>}
    </div>
    <div className="flex items-center gap-1 md:gap-2">
      <ThemeToggle />
      <AppLauncher />
      <Button variant="ghost" size="icon" onClick={() => navigate("/mis-documentos")} aria-label="Mis documentos"><FileText className="w-5 h-5 text-muted-foreground" /></Button>
      <Button variant="ghost" size="icon" disabled title="Notificaciones disponibles cuando se migre su backend" aria-label="Notificaciones"><Bell className="w-5 h-5 text-muted-foreground" /></Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild><Button variant="ghost" className="flex items-center gap-2 px-2"><Avatar className="h-8 w-8 border border-border"><AvatarFallback className="bg-primary text-primary-foreground text-sm font-medium">{initials}</AvatarFallback></Avatar><div className="hidden md:flex flex-col items-start"><span className="text-sm font-medium text-foreground line-clamp-1 max-w-[100px]">{profile?.nombre_completo || "Usuario"}</span><span className="text-xs text-muted-foreground flex items-center gap-1">{displayRoleLabel && <><Shield className="w-3 h-3" />{displayRoleLabel}</>}</span></div></Button></DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 bg-popover border-border">
          <DropdownMenuLabel><div className="flex flex-col"><span>{profile?.nombre_completo || "Usuario"}</span><span className="text-xs font-normal text-muted-foreground">{displayRoleLabel}</span></div></DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => navigate("/mi-perfil")}><User className="w-4 h-4 mr-2" />Perfil</DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate("/mis-documentos")}><FileText className="w-4 h-4 mr-2" />Mis Documentos</DropdownMenuItem>
          <DropdownMenuItem onClick={() => void checkUpdates()} disabled={isChecking}>{isChecking ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}Buscar actualizaciones</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => void closeSession()} className="text-destructive focus:bg-destructive/10"><LogOut className="w-4 h-4 mr-2" />Cerrar Sesión</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  </header>;
}
