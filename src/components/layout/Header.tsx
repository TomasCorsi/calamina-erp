import { Bell, Search, User, LogOut, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { MobileSidebar } from "./Sidebar";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";

interface HeaderProps {
  title: string;
  subtitle?: string;
}

const roleLabels: Record<string, string> = {
  admin: 'Administrador',
  capataz: 'Capataz',
  maquinista: 'Maquinista',
};

export function Header({ title, subtitle }: HeaderProps) {
  const { profile, role, signOut } = useAuth();
  const navigate = useNavigate();

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
    <header className="h-16 bg-card border-b border-border px-4 md:px-6 flex items-center justify-between">
      {/* Mobile Menu + Title */}
      <div className="flex items-center gap-3">
        <MobileSidebar />
        <div className="flex flex-col">
          <h1 className="text-lg md:text-xl font-semibold text-foreground line-clamp-1">{title}</h1>
          {subtitle && (
            <p className="text-xs md:text-sm text-muted-foreground hidden sm:block">{subtitle}</p>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 md:gap-4">
        {/* Search - Desktop only */}
        <div className="relative hidden lg:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar..."
            className="w-64 pl-9 bg-muted border-border focus:border-primary"
          />
        </div>

        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5 text-muted-foreground" />
          <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-[10px] bg-primary text-primary-foreground">
            3
          </Badge>
        </Button>

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
                <span className="text-sm font-medium text-foreground line-clamp-1 max-w-[120px]">
                  {profile?.nombre_completo || 'Usuario'}
                </span>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  {role && (
                    <>
                      <Shield className="w-3 h-3" />
                      {roleLabels[role] || role}
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
                  {role && roleLabels[role]}
                </span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-border" />
            <DropdownMenuItem className="text-foreground focus:bg-accent cursor-pointer">
              <User className="w-4 h-4 mr-2" />
              Perfil
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
