import { Suspense, lazy } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { LoadingScreen } from "@/components/shared/LoadingScreen";
import { LegacyModuleUnavailable } from "@/components/shared/LegacyModuleUnavailable";
import Login from "./pages/Login";
import AcceptInvitation from "./pages/AcceptInvitation";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import NoAccess from "./pages/NoAccess";
import Install from "./pages/Install";
import NotFound from "./pages/NotFound";

const Toaster = lazy(() => import("@/components/ui/toaster").then((module) => ({ default: module.Toaster })));
const Sonner = lazy(() => import("@/components/ui/sonner").then((module) => ({ default: module.Toaster })));
const TooltipProvider = lazy(() => import("@/components/ui/tooltip").then((module) => ({ default: module.TooltipProvider })));
const SessionKeepAlive = lazy(() => import("@/components/auth/SessionKeepAlive").then((module) => ({ default: module.SessionKeepAlive })));
const OfflineBanner = lazy(() => import("@/components/pwa/OfflineBanner").then((module) => ({ default: module.OfflineBanner })));
const Index = lazy(() => import("./pages/Index"));
const Obras = lazy(() => import("./pages/Obras"));
const Personal = lazy(() => import("./pages/Personal"));
const Configuracion = lazy(() => import("./pages/Configuracion"));
const ParteDiario = lazy(() => import("./pages/ParteDiario"));
const Remitos = lazy(() => import("./pages/Remitos"));
const Maquinarias = lazy(() => import("./pages/Maquinarias"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      retry: 1,
      refetchOnReconnect: true,
    },
  },
});

const pendingModules = [
  ["/dashboard", "Tablero de Obras", "Centro de control por obra"],
  ["/tablero/tv", "Tablero TV", "Centro de control de obras"],
  ["/clientes", "Clientes", "Gestión de clientes"],
  ["/cotizaciones", "Cotizaciones", "Presupuestos y propuestas comerciales"],
  ["/certificados", "Certificados de Obra", "Gestión de certificaciones mensuales por obra"],
  ["/viajes", "Viajes", "Registro de viajes y transporte"],
  ["/proveedores", "Proveedores", "Proveedores y órdenes de compra"],
  ["/presentismo", "Presentismo (HH)", "Control de asistencia y horas trabajadas"],
  ["/liquidaciones", "Liquidación de Sueldos", "Quincena, mes, adelantos y préstamos"],
  ["/rrhh", "RRHH", "Novedades, sueldos y preparación de pagos"],
  ["/gastos", "Combustible", "Control de entregas de combustible"],
  ["/mantenimiento", "Mantenimiento", "Services y reparaciones"],
  ["/stock", "Stock e Inventario", "Gestión de materiales, repuestos y herramientas"],
  ["/mensajes", "Mensajes", "Avisos y comunicación interna"],
  ["/reportes", "Reportes", "Análisis financiero y consultas"],
  ["/contabilidad", "Contabilidad", "Ventas, compras, pagos, asientos, IVA y reportes"],
  ["/mi-perfil", "Mi Perfil", "Información de la cuenta"],
  ["/mis-documentos", "Mis Documentos", "Estudios médicos y recibos de sueldo"],
] as const;

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Suspense fallback={null}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AuthProvider>
              <Suspense fallback={null}><SessionKeepAlive /><OfflineBanner /></Suspense>
              <Suspense fallback={<LoadingScreen />}>
                <Routes>
                  <Route path="/login" element={<Login />} />
                  <Route path="/aceptar-invitacion" element={<AcceptInvitation />} />
                  <Route path="/registro" element={<Navigate to="/aceptar-invitacion" replace />} />
                  <Route path="/registro-empleado" element={<Navigate to="/aceptar-invitacion" replace />} />
                  <Route path="/olvide-contrasena" element={<ForgotPassword />} />
                  <Route path="/restablecer-contrasena" element={<ResetPassword />} />
                  <Route path="/sin-acceso" element={<NoAccess />} />
                  <Route path="/install" element={<Install />} />
                  <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
                  <Route path="/obras" element={<ProtectedRoute requiredPermissions={["obras.view"]}><Obras /></ProtectedRoute>} />
                  <Route path="/personal" element={<ProtectedRoute requiredPermissions={["personal.view"]}><Personal /></ProtectedRoute>} />
                  <Route path="/parte-diario" element={<ProtectedRoute requiredPermissions={["parte_diario.view"]}><ParteDiario /></ProtectedRoute>} />
                  <Route path="/remitos" element={<ProtectedRoute requiredPermissions={["remitos.view"]}><Remitos /></ProtectedRoute>} />
                  <Route path="/maquinarias" element={<ProtectedRoute requiredPermissions={["maquinarias.view"]}><Maquinarias /></ProtectedRoute>} />
                  <Route path="/configuracion" element={<ProtectedRoute requiredPermissions={["users.view", "users.invite", "users.manage_roles"]}><Configuracion /></ProtectedRoute>} />
                  <Route path="/usuarios" element={<Navigate to="/configuracion" replace />} />
                  {pendingModules.map(([path, title, subtitle]) => (
                    <Route key={path} path={path} element={<ProtectedRoute adminOnly><LegacyModuleUnavailable title={title} subtitle={subtitle} /></ProtectedRoute>} />
                  ))}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </Suspense>
    </QueryClientProvider>
  );
}
