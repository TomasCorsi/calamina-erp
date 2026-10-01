import { User, LogOut, Shield, RefreshCw, Loader2, FileText, Receipt } from "lucide-react";
import { NotificationsBell } from "./NotificationsBell";
import logoIcon from "@/assets/logo-icon.png";
import { ThemeToggle } from "./ThemeToggle";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate, Link } from "react-router-dom";
import { AppLauncher } from "./AppLauncher";

import { useServiceWorker } from "@/hooks/useServiceWorker";
import { toast } from "@/components/ui/sonner";
import { useEmpleadoProfile } from "@/hooks/useEmpleadoProfile";
import { useMisDocumentos } from "@/hooks/useMisDocumentos";

interface TopNavbarProps {
  title?: string;
  subtitle?: string;
}

const appRoleLabels: Record<string, string> = {
  admin: 'Administrador',
  capataz: 'Capataz',
  maquinista: 'Maquinista',
  ayudante: 'Ayudante',
};

const personalRoleLabels: Record<string, string> = {
  capataz: 'Capataz',
  maquinista: 'Maquinista',
  chofer: 'Chofer',
  administrativo: 'Administrativo',
  ayudante: 'Ayudante',
  sereno: 'Sereno',
  mecanico: 'Mecánico',
  topografo: 'Topógrafo',
  repartidor_calecita: 'Repartidor Calecita',
};

export function TopNavbar({ title, subtitle }: TopNavbarProps) {
  const { profile, role, roles, user, signOut } = useAuth();
  const SERGIO_ID = 'c92028bd-dd42-416d-8892-f00b5ef90f8f';
  const isSergio = user?.id === SERGIO_ID;
  const { rolPersonal } = useEmpleadoProfile();
  const { pendientesCount } = useMisDocumentos();
  const { checkForUpdates, isChecking, needRefresh } = useServiceWorker();

  const displayRoleLabel = rolPersonal
    ? personalRoleLabels[rolPersonal] || rolPersonal
    : role
      ? appRoleLabels[role] || role
      : '';
  const navigate = useNavigate();

  const handleCheckUpdates = async () => {
    const result = await checkForUpdates();
    
    if (result.found || needRefresh) {
      toast.success('Nueva versión encontrada', {
        description: 'Actualiza para obtener las últimas mejoras'
      });
    } else {
      toast.info('Ya tienes la última versión', {
        description: 'No hay actualizaciones disponibles'
      });
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <header className="h-16 bg-card border-b border-border px-4 md:px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Left: Logo + Page Title */}
      <div className="flex items-center gap-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 group">
          <img 
            src={logoIcon} 
            alt="Calamina Sur" 
            className="w-9 h-9 transition-transform group-hover:scale-105"
          />
          <div className="hidden sm:flex flex-col">
            <span className="font-bold text-foreground tracking-tight text-sm">
              Calamina Sur
            </span>
            <span className="text-[10px] text-muted-foreground -mt-0.5">
              Movimientos de Suelo
            </span>
          </div>
        </Link>

        {/* Divider & Page Title - only show if title provided */}
        {title && (
          <>
            <div className="hidden sm:block h-8 w-px bg-border" />
            <div className="flex flex-col">
              <h1 className="text-base md:text-lg font-semibold text-foreground line-clamp-1">
                {title}
              </h1>
              {subtitle && (
                <p className="text-xs text-muted-foreground hidden md:block">
                  {subtitle}
                </p>
              )}
            </div>
          </>
        )}
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1 md:gap-2">
        {/* Theme Toggle */}
        <ThemeToggle />

        {/* App Launcher - admin o usuarios con múltiples roles (excepto Sergio) */}
        {(role === 'admin' || (roles.length > 1 && !isSergio)) && <AppLauncher />}

        {/* Acceso directo a Remitos para Sergio */}
        {isSergio && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/remitos')}
            aria-label="Remitos"
            title="Remitos"
          >
            <Receipt className="w-5 h-5 text-muted-foreground" />
          </Button>
        )}

        {/* Mis Documentos - badge para todos */}
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          onClick={() => navigate('/mis-documentos')}
          aria-label="Mis documentos"
        >
          <FileText className="w-5 h-5 text-muted-foreground" />
          {pendientesCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 min-w-[20px] px-1 flex items-center justify-center text-[10px] bg-destructive text-destructive-foreground">
              {pendientesCount}
            </Badge>
          )}
        </Button>

        {/* Notifications - Solo para admin */}
        <NotificationsBell />


        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 px-2">
              <Avatar className="h-8 w-8 border border-border">
                <AvatarFallback className="bg-primary text-primary-foreground text-sm font-medium">
                  {getInitials(profile?.nombre_completo)}
                </AvatarFallback>
              </Avatar>
              <div className="hidden md:flex flex-col items-start">
                <span className="text-sm font-medium text-foreground line-clamp-1 max-w-[100px]">
                  {profile?.nombre_completo || 'Usuario'}
                </span>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  {displayRoleLabel && (
                    <>
                      <Shield className="w-3 h-3" />
                      {displayRoleLabel}
                    </>
                  )}
                </span>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 bg-popover border-border">
            <DropdownMenuLabel className="text-foreground">
              <div className="flex flex-col">
                <span>{profile?.nombre_completo || 'Usuario'}</span>
                <span className="text-xs font-normal text-muted-foreground">
                  {displayRoleLabel}
                </span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-border" />
            <DropdownMenuItem
              onClick={() => navigate('/mi-perfil')}
              className="text-foreground focus:bg-accent cursor-pointer"
            >
              <User className="w-4 h-4 mr-2" />
              Perfil
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => navigate('/mis-documentos')}
              className="text-foreground focus:bg-accent cursor-pointer"
            >
              <FileText className="w-4 h-4 mr-2" />
              <span className="flex-1">Mis Documentos</span>
              {pendientesCount > 0 && (
                <Badge className="ml-2 h-5 min-w-[20px] px-1 flex items-center justify-center text-[10px] bg-destructive text-destructive-foreground">
                  {pendientesCount}
                </Badge>
              )}
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={handleCheckUpdates}
              disabled={isChecking}
              className="text-foreground focus:bg-accent cursor-pointer"
            >
              {isChecking ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              Buscar actualizaciones
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-border" />
            <DropdownMenuItem 
              onClick={handleSignOut}
              className="text-destructive focus:bg-destructive/10 cursor-pointer"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Cerrar Sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
