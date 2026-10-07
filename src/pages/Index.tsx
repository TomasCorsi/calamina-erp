import { Link } from "react-router-dom";
import { 
  LayoutDashboard, 
  Building2, 
  FileText, 
  HardHat, 
  Truck, 
  Award,
  Receipt, 
  Wallet, 
  Wrench, 
  Package, 
  ClipboardCheck, 
  BarChart3, 
  Settings,
  ContactRound,
  MessageCircle,
  Store,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { TopNavbar } from "@/components/layout/TopNavbar";
import { canAccessModule } from "@/config/moduleAccess";

type AppRole = 'admin' | 'capataz' | 'maquinista' | 'ayudante' | 'remitero' | 'contador';

interface AppItem {
  icon: React.ElementType;
  label: string;
  path: string;
  iconColor: string;
  bgColor: string;
  description: string;
  roles?: AppRole[];
}

const apps: AppItem[] = [
  { 
    icon: LayoutDashboard, 
    label: "Dashboard", 
    path: "/dashboard", 
    iconColor: "text-primary",
    bgColor: "bg-primary/15",
    description: "Panel de control y KPIs",
    roles: ['admin', 'capataz', 'maquinista']
  },
  { 
    icon: Building2, 
    label: "Obras", 
    path: "/obras", 
    iconColor: "text-blue-500",
    bgColor: "bg-blue-500/15",
    description: "Gestión de obras",
    roles: ['admin', 'capataz', 'maquinista']
  },
  { 
    icon: ContactRound, 
    label: "Clientes", 
    path: "/clientes", 
    iconColor: "text-blue-600",
    bgColor: "bg-blue-600/15",
    description: "Gestión de clientes",
    roles: ['admin', 'capataz']
  },
  { 
    icon: FileText, 
    label: "Cotizaciones", 
    path: "/cotizaciones", 
    iconColor: "text-sky-500",
    bgColor: "bg-sky-500/15",
    description: "Presupuestos y propuestas",
    roles: ['admin', 'capataz']
  },
  {
    icon: Award,
    label: "Certificados",
    path: "/certificados",
    iconColor: "text-blue-400",
    bgColor: "bg-blue-400/15",
    description: "Certificados de obra",
    roles: ['admin']
  },
  { 
    icon: Receipt, 
    label: "Remitos", 
    path: "/remitos", 
    iconColor: "text-amber-500",
    bgColor: "bg-amber-500/15",
    description: "Gestión de remitos",
    roles: ['admin', 'capataz', 'maquinista', 'remitero']
  },
  {
    icon: Store,
    label: "Proveedores",
    path: "/proveedores",
    iconColor: "text-indigo-600",
    bgColor: "bg-indigo-600/15",
    description: "Gestión de proveedores",
    roles: ['admin']
  },
  { 
    icon: HardHat,
    label: "Personal", 
    path: "/personal", 
    iconColor: "text-green-500",
    bgColor: "bg-green-500/15",
    description: "Recursos humanos",
    roles: ['admin', 'capataz']
  },
  { 
    icon: Truck, 
    label: "Maquinarias", 
    path: "/maquinarias", 
    iconColor: "text-emerald-500",
    bgColor: "bg-emerald-500/15",
    description: "Flota y equipos",
    roles: ['admin', 'capataz']
  },
  { 
    icon: ClipboardCheck, 
    label: "Parte Diario", 
    path: "/parte-diario", 
    iconColor: "text-teal-500",
    bgColor: "bg-teal-500/15",
    description: "Registro diario de trabajo",
    roles: ['admin', 'capataz', 'maquinista']
  },
  { 
    icon: Wallet, 
    label: "Gastos", 
    path: "/gastos", 
    iconColor: "text-rose-500",
    bgColor: "bg-rose-500/15",
    description: "Otros gastos",
    roles: ['admin', 'capataz', 'maquinista', 'ayudante']
  },
  { 
    icon: Wrench, 
    label: "Mantenimiento", 
    path: "/mantenimiento", 
    iconColor: "text-purple-500",
    bgColor: "bg-purple-500/15",
    description: "Mantenimiento de equipos",
    roles: ['admin', 'capataz', 'maquinista']
  },
  { 
    icon: Package, 
    label: "Stock", 
    path: "/stock", 
    iconColor: "text-indigo-500",
    bgColor: "bg-indigo-500/15",
    description: "Inventario y materiales",
    roles: ['admin', 'capataz', 'maquinista']
  },
  { 
    icon: BarChart3, 
    label: "Reportes", 
    path: "/reportes", 
    iconColor: "text-violet-500",
    bgColor: "bg-violet-500/15",
    description: "Informes y análisis",
    roles: ['admin', 'capataz']
  },
  { 
    icon: MessageCircle, 
    label: "Mensajes", 
    path: "/mensajes", 
    iconColor: "text-teal-600",
    bgColor: "bg-teal-600/15",
    description: "Avisos por WhatsApp",
    roles: ['admin', 'capataz']
  },
  { 
    icon: Settings, 
    label: "Configuración", 
    path: "/configuracion", 
    iconColor: "text-slate-400",
    bgColor: "bg-slate-400/15",
    description: "Ajustes del sistema",
    roles: ['admin']
  },
];

const Index = () => {
  const { roles, permissions } = useAuth();
  const filteredApps = apps.filter((app) => canAccessModule(app.path, { roles, permissions }));

  return (
    <div className="min-h-screen bg-background">
      <TopNavbar />
      
      <main className="container mx-auto px-4 py-8">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Aplicaciones
          </h1>
          <p className="text-muted-foreground">
            Selecciona un módulo para comenzar
          </p>
        </div>

        <div className="flex justify-center">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6 max-w-6xl">
            {filteredApps.map((app, index) => (
              <Link 
                key={app.path} 
                to={app.path}
                className="group"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <Card className="h-full border-border/50 bg-card/50 backdrop-blur-sm hover:bg-card hover:shadow-xl hover:shadow-primary/5 hover:border-primary/20 hover:-translate-y-1 transition-all duration-300 cursor-pointer">
                  <CardContent className="flex flex-col items-center justify-center p-4 md:p-6">
                    <div className={cn(
                      "w-14 h-14 md:w-16 md:h-16 rounded-2xl flex items-center justify-center mb-3 transition-transform duration-300 group-hover:scale-110",
                      app.bgColor
                    )}>
                      <app.icon className={cn("w-7 h-7 md:w-8 md:h-8", app.iconColor)} />
                    </div>
                    <span className="text-sm md:text-base font-medium text-foreground text-center">
                      {app.label}
                    </span>
                    <span className="text-xs text-muted-foreground text-center mt-1 hidden md:block opacity-0 group-hover:opacity-100 transition-opacity">
                      {app.description}
                    </span>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
