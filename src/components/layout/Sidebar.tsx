import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Building2,
  FileText,
  Truck,
  Users,
  Wrench,
  Receipt,
  Wallet,
  Settings,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  HardHat,
  Package,
  ClipboardList,
  Menu,
  Award,
  ContactRound,
  MessageCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/hooks/useAuth";

type AppRole = 'admin' | 'capataz' | 'maquinista' | 'ayudante' | 'remitero' | 'contador';

interface MenuItem {
  icon: typeof LayoutDashboard;
  label: string;
  path: string;
  roles?: AppRole[]; // If undefined, accessible to all authenticated users
}

const menuItems: MenuItem[] = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/", roles: ['admin', 'capataz', 'maquinista'] },
  { icon: Building2, label: "Obras", path: "/obras", roles: ['admin', 'capataz', 'maquinista'] },
  { icon: ContactRound, label: "Clientes", path: "/clientes", roles: ['admin', 'capataz'] },
  { icon: FileText, label: "Cotizaciones", path: "/cotizaciones", roles: ['admin', 'capataz'] },
  { icon: Award, label: "Certificados", path: "/certificados", roles: ['admin'] },
  { icon: HardHat, label: "Personal", path: "/personal", roles: ['admin', 'capataz'] },
  { icon: Truck, label: "Maquinarias", path: "/maquinarias", roles: ['admin', 'capataz'] },
  { icon: Receipt, label: "Remitos", path: "/remitos", roles: ['admin', 'capataz', 'maquinista', 'remitero'] },
  { icon: Wallet, label: "Gastos", path: "/gastos", roles: ['admin', 'capataz', 'maquinista', 'ayudante'] },
  { icon: Wrench, label: "Mantenimiento", path: "/mantenimiento", roles: ['admin', 'capataz', 'maquinista'] },
  { icon: Package, label: "Stock", path: "/stock", roles: ['admin', 'capataz', 'maquinista'] },
  { icon: ClipboardList, label: "Parte Diario", path: "/parte-diario", roles: ['admin', 'capataz', 'maquinista'] },
  { icon: BarChart3, label: "Reportes", path: "/reportes", roles: ['admin', 'capataz'] },
  { icon: MessageCircle, label: "Mensajes", path: "/mensajes", roles: ['admin', 'capataz'] },
  { icon: Settings, label: "Configuración", path: "/configuracion", roles: ['admin'] },
];

interface SidebarContentProps {
  collapsed?: boolean;
  onNavigate?: () => void;
}

function SidebarContent({ collapsed = false, onNavigate }: SidebarContentProps) {
  const location = useLocation();
  const { hasRole } = useAuth();

  // Filter menu items based on user role
  const visibleMenuItems = menuItems.filter(item => {
    if (!item.roles) return true; // No role restriction
    return item.roles.some(role => hasRole(role));
  });

  return (
    <>
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-sidebar-border">
        {!collapsed && (
          <div className="flex items-center gap-2 animate-fade-in">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Truck className="w-5 h-5 text-primary-foreground" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-foreground tracking-tight">Calamina Sur</span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-widest">
                Gestión de Obras
              </span>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center mx-auto">
            <Truck className="w-5 h-5 text-primary-foreground" />
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 overflow-y-auto">
        <ul className="space-y-1 px-2">
          {visibleMenuItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;

            const linkContent = (
              <Link
                to={item.path}
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group",
                  isActive
                    ? "bg-primary text-primary-foreground glow-primary"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                <Icon
                  className={cn(
                    "w-5 h-5 flex-shrink-0 transition-transform",
                    !isActive && "group-hover:scale-110"
                  )}
                />
                {!collapsed && (
                  <span className="text-sm font-medium truncate">{item.label}</span>
                )}
              </Link>
            );

            if (collapsed) {
              return (
                <li key={item.path}>
                  <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                    <TooltipContent side="right" className="bg-popover border-border">
                      {item.label}
                    </TooltipContent>
                  </Tooltip>
                </li>
              );
            }

            return <li key={item.path}>{linkContent}</li>;
          })}
        </ul>
      </nav>
    </>
  );
}

// Desktop Sidebar
export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "hidden md:flex h-screen bg-sidebar border-r border-sidebar-border flex-col transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      <SidebarContent collapsed={collapsed} />
      
      {/* Collapse Toggle */}
      <div className="p-2 border-t border-sidebar-border">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(!collapsed)}
          className="w-full justify-center text-muted-foreground hover:text-foreground"
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <>
              <ChevronLeft className="w-4 h-4 mr-2" />
              <span className="text-xs">Colapsar</span>
            </>
          )}
        </Button>
      </div>
    </aside>
  );
}

// Mobile Sidebar (Sheet/Drawer)
export function MobileSidebar() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="w-6 h-6" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 p-0 bg-sidebar border-sidebar-border">
        <div className="flex flex-col h-full">
          <SidebarContent onNavigate={() => setOpen(false)} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
