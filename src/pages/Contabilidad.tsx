import { Link } from "react-router-dom";
import { BarChart3, BadgeDollarSign, BookOpen, Building2, ClipboardList, Landmark, Receipt, Settings, ShoppingCart, Store, TrendingUp, UsersRound } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const sectors = [
  { label: "Resumen", path: "/contabilidad/resumen", description: "KPIs, saldos y vencimientos", icon: BarChart3, color: "text-violet-500", bg: "bg-violet-500/15" },
  { label: "Ventas", path: "/contabilidad/ventas", description: "Facturas, notas y certificados", icon: TrendingUp, color: "text-blue-500", bg: "bg-blue-500/15" },
  { label: "Compras", path: "/contabilidad/compras", description: "Comprobantes de proveedores", icon: ShoppingCart, color: "text-indigo-500", bg: "bg-indigo-500/15" },
  { label: "Pagos / Egresos", path: "/contabilidad/pagos", description: "Cuentas por pagar", icon: Receipt, color: "text-rose-500", bg: "bg-rose-500/15" },
  { label: "Cobranzas / Ingresos", path: "/contabilidad/cobranzas", description: "Cuentas por cobrar", icon: BadgeDollarSign, color: "text-emerald-500", bg: "bg-emerald-500/15" },
  { label: "Caja / Bancos", path: "/contabilidad/caja-bancos", description: "Saldos y transferencias", icon: Landmark, color: "text-cyan-500", bg: "bg-cyan-500/15" },
  { label: "Proveedores", path: "/contabilidad/proveedores", description: "Cuenta corriente y vencimientos", icon: Store, color: "text-orange-500", bg: "bg-orange-500/15" },
  { label: "Clientes", path: "/contabilidad/clientes", description: "Cuenta corriente y cobranzas", icon: UsersRound, color: "text-sky-500", bg: "bg-sky-500/15" },
  { label: "Contable", path: "/contabilidad/contable", description: "Asientos, mayor y cierres", icon: BookOpen, color: "text-purple-600", bg: "bg-purple-600/15" },
  { label: "IVA", path: "/contabilidad/iva", description: "Compras, ventas y posición", icon: ClipboardList, color: "text-amber-500", bg: "bg-amber-500/15" },
  { label: "Informes", path: "/contabilidad/informes", description: "Análisis contable y operativo", icon: Building2, color: "text-teal-500", bg: "bg-teal-500/15" },
  { label: "Configuración", path: "/contabilidad/configuracion", description: "Empresa y parámetros", icon: Settings, color: "text-slate-500", bg: "bg-slate-500/15" },
] as const;

export default function Contabilidad() {
  return <MainLayout title="Contabilidad" subtitle="Administración contable y tesorería">
    <div className="py-4">
      <div className="mb-8 text-center"><h2 className="text-2xl font-bold">Aplicaciones contables</h2><p className="text-muted-foreground mt-1">Seleccioná un sector para comenzar</p></div>
      <div className="flex justify-center"><div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 md:gap-6 max-w-6xl w-full">
        {sectors.map((sector) => <Link key={sector.path} to={sector.path} className="group"><Card className="h-full border-border/50 bg-card/50 backdrop-blur-sm hover:bg-card hover:shadow-xl hover:shadow-primary/5 hover:border-primary/20 hover:-translate-y-1 transition-all duration-300"><CardContent className="flex flex-col items-center justify-center p-4 md:p-6"><div className={cn("w-14 h-14 md:w-16 md:h-16 rounded-2xl flex items-center justify-center mb-3 transition-transform duration-300 group-hover:scale-110", sector.bg)}><sector.icon className={cn("w-7 h-7 md:w-8 md:h-8", sector.color)} /></div><span className="text-sm md:text-base font-medium text-center">{sector.label}</span><span className="text-xs text-muted-foreground text-center mt-1 hidden md:block">{sector.description}</span></CardContent></Card></Link>)}
      </div></div>
    </div>
  </MainLayout>;
}
