import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  MessageCircle,
  LayoutDashboard,
  Building2,
  FileText,
  Truck,
  HardHat,
  Wrench,
  Route,
  Award,
  Receipt,
  Wallet,
  Banknote,
  UserCog,
  Settings,
  BarChart3,
  Package,
  ClipboardList,
  LayoutGrid,
  X,
  ContactRound,
  Store,
  BookOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";

type AppRole = 'admin' | 'capataz' | 'maquinista' | 'ayudante' | 'remitero' | 'contador';

interface AppItem {
  icon: typeof LayoutDashboard;
  label: string;
  path: string;
  color: string;
  roles?: AppRole[];
}

interface AppCategory {
  name: string;
  apps: AppItem[];
}

const appCategories: AppCategory[] = [
  {
    name: "Principal",
    apps: [
      { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard", color: "bg-primary", roles: ['admin', 'capataz', 'maquinista'] },
    ],
  },
  {
    name: "Operaciones",
    apps: [
      { icon: Building2, label: "Obras", path: "/obras", color: "bg-blue-600", roles: ['admin', 'capataz', 'maquinista'] },
      { icon: ContactRound, label: "Clientes", path: "/clientes", color: "bg-blue-700", roles: ['admin', 'capataz'] },
      { icon: FileText, label: "Cotizaciones", path: "/cotizaciones", color: "bg-blue-500", roles: ['admin', 'capataz'] },
      { icon: Award, label: "Certificados", path: "/certificados", color: "bg-blue-400", roles: ['admin'] },
      { icon: Route, label: "Viajes", path: "/viajes", color: "bg-orange-600", roles: ['admin', 'capataz', 'maquinista'] },
      { icon: Receipt, label: "Remitos", path: "/remitos", color: "bg-orange-500", roles: ['admin', 'capataz', 'maquinista', 'remitero'] },
      { icon: Store, label: "Proveedores", path: "/proveedores", color: "bg-indigo-500", roles: ['admin'] },
    ],
  },
  {
    name: "Recursos",
    apps: [
      { icon: HardHat, label: "Personal", path: "/personal", color: "bg-green-600", roles: ['admin', 'capataz'] },
      { icon: Truck, label: "Maquinarias", path: "/maquinarias", color: "bg-green-500", roles: ['admin', 'capataz'] },
      { icon: ClipboardList, label: "Presentismo", path: "/presentismo", color: "bg-green-400", roles: ['admin'] },
      { icon: Banknote, label: "Liquidaciones", path: "/liquidaciones", color: "bg-green-700", roles: ['admin'] },
      { icon: UserCog, label: "RRHH", path: "/rrhh", color: "bg-green-800", roles: ['admin'] },
      { icon: ClipboardList, label: "Parte Diario", path: "/parte-diario", color: "bg-teal-500", roles: ['admin', 'capataz', 'maquinista'] },
    ],
  },
  {
    name: "Gastos",
    apps: [
      { icon: Wallet, label: "Gastos", path: "/gastos", color: "bg-amber-600", roles: ['admin', 'capataz', 'maquinista', 'ayudante'] },
      { icon: Wrench, label: "Mantenimiento", path: "/mantenimiento", color: "bg-amber-500", roles: ['admin', 'capataz', 'maquinista'] },
      { icon: Package, label: "Stock", path: "/stock", color: "bg-amber-400", roles: ['admin', 'capataz', 'maquinista'] },
    ],
  },
  {
    name: "Comunicación",
    apps: [
      { icon: MessageCircle, label: "Mensajes", path: "/mensajes", color: "bg-teal-500", roles: ['admin', 'capataz'] },
    ],
  },
  {
    name: "Administración",
    apps: [
      { icon: BarChart3, label: "Reportes", path: "/reportes", color: "bg-purple-600", roles: ['admin', 'capataz'] },
      { icon: BookOpen, label: "Contabilidad", path: "/contabilidad", color: "bg-purple-700", roles: ['admin', 'contador'] },
      { icon: Settings, label: "Configuración", path: "/configuracion", color: "bg-slate-600", roles: ['admin'] },
    ],
  },
];

interface AppLauncherProps {
  className?: string;
}

export function AppLauncher({ className }: AppLauncherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const location = useLocation();
  const { hasRole, user } = useAuth();
  const isMobile = useIsMobile();

  // Excepciones por UUID para mostrar tiles puntuales (mismo patrón que ProtectedRoute)
  const PATH_EXCEPTIONS: Record<string, string[]> = {
    '/remitos': ['c92028bd-dd42-416d-8892-f00b5ef90f8f'], // Sergio
  };

  // Filter apps based on user role
  const filteredCategories = appCategories
    .map((category) => ({
      ...category,
      apps: category.apps.filter((app) => {
        const exceptions = PATH_EXCEPTIONS[app.path] ?? [];
        if (user && exceptions.includes(user.id)) return true;
        if (!app.roles) return true;
        return app.roles.some((role) => hasRole(role));
      }),
    }))
    .filter((category) => category.apps.length > 0);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen && !isMobile) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen, isMobile]);

  // Close on escape
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [isOpen]);

  const handleNavigation = () => {
    setIsOpen(false);
  };

  const LauncherContent = () => (
    <div className="p-4">
      <div className="space-y-6">
        {filteredCategories.map((category, categoryIndex) => (
          <div key={category.name} className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
              {category.name}
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {category.apps.map((app, appIndex) => {
                const isActive = location.pathname === app.path;
                const Icon = app.icon;

                return (
                  <Link
                    key={app.path}
                    to={app.path}
                    onClick={handleNavigation}
                    className={cn(
                      "flex flex-col items-center gap-2 p-3 rounded-xl transition-all duration-200 group",
                      "hover:bg-accent hover:scale-105",
                      isActive && "bg-accent ring-2 ring-primary"
                    )}
                    style={{
                      animationDelay: `${(categoryIndex * 3 + appIndex) * 30}ms`,
                    }}
                  >
                    <div
                      className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110",
                        app.color
                      )}
                    >
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-xs font-medium text-center text-foreground truncate w-full">
                      {app.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // Mobile: Use Sheet
  if (isMobile) {
    return (
      <>
        <Button
          ref={buttonRef}
          variant="ghost"
          size="icon"
          onClick={() => setIsOpen(true)}
          className={cn("relative", className)}
          aria-label="Abrir aplicaciones"
        >
          <LayoutGrid className="w-5 h-5" />
        </Button>

        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl bg-card border-border">
            <SheetHeader className="pb-4">
              <SheetTitle className="flex items-center justify-between">
                <span className="text-lg font-semibold">Aplicaciones</span>
              </SheetTitle>
            </SheetHeader>
            <div className="overflow-y-auto h-full pb-8">
              <LauncherContent />
            </div>
          </SheetContent>
        </Sheet>
      </>
    );
  }

  // Desktop: Use Dropdown
  return (
    <div className="relative">
      <Button
        ref={buttonRef}
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "relative transition-colors",
          isOpen && "bg-accent",
          className
        )}
        aria-label="Abrir aplicaciones"
        aria-expanded={isOpen}
      >
        {isOpen ? (
          <X className="w-5 h-5" />
        ) : (
          <LayoutGrid className="w-5 h-5" />
        )}
      </Button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div
            ref={dropdownRef}
            className={cn(
              "absolute right-0 top-full mt-2 z-50",
              "w-[360px] max-h-[80vh] overflow-y-auto",
              "bg-card border border-border rounded-xl shadow-2xl",
              "animate-in fade-in-0 zoom-in-95 slide-in-from-top-2 duration-200"
            )}
          >
            <div className="sticky top-0 flex items-center justify-between p-4 border-b border-border bg-card/95 backdrop-blur-sm">
              <h2 className="font-semibold text-foreground">Aplicaciones</h2>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setIsOpen(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <LauncherContent />
          </div>
        </>
      )}
    </div>
  );
}
