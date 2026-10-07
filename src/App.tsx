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
const Gastos = lazy(() => import("./pages/Gastos"));
const Mantenimiento = lazy(() => import("./pages/MantenimientoPage"));
const Stock = lazy(() => import("./pages/Stock"));
const Presentismo = lazy(() => import("./pages/Presentismo"));
const Clientes = lazy(() => import("./pages/Clientes"));
const Proveedores = lazy(() => import("./pages/Proveedores"));
const Cotizaciones = lazy(() => import("./pages/Cotizaciones"));
const Certificados = lazy(() => import("./pages/Certificados"));
const Liquidaciones = lazy(() => import("./pages/Liquidaciones"));
const MiPerfil = lazy(() => import("./pages/MiPerfil"));
const MisDocumentos = lazy(() => import("./pages/MisDocumentos"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const TableroTV = lazy(() => import("./pages/TableroTV"));
const Reportes = lazy(() => import("./pages/Reportes"));
const Mensajes = lazy(() => import("./pages/Mensajes"));
const RRHH = lazy(() => import("./pages/RRHH"));

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
  ["/contabilidad", "Contabilidad", "Contabilidad en preparación"],
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
                  <Route path="/gastos" element={<ProtectedRoute requiredPermissions={["gastos.view", "combustible.view"]}><Gastos /></ProtectedRoute>} />
                  <Route path="/mantenimiento" element={<ProtectedRoute requiredPermissions={["mantenimiento.view"]}><Mantenimiento /></ProtectedRoute>} />
                  <Route path="/stock" element={<ProtectedRoute requiredPermissions={["stock.view"]}><Stock /></ProtectedRoute>} />
                  <Route path="/presentismo" element={<ProtectedRoute requiredPermissions={["presentismo.view"]}><Presentismo /></ProtectedRoute>} />
                  <Route path="/clientes" element={<ProtectedRoute requiredPermissions={["clientes.view"]}><Clientes /></ProtectedRoute>} />
                  <Route path="/proveedores" element={<ProtectedRoute requiredPermissions={["proveedores.view", "compras.view"]}><Proveedores /></ProtectedRoute>} />
                  <Route path="/cotizaciones" element={<ProtectedRoute requiredPermissions={["cotizaciones.view"]}><Cotizaciones /></ProtectedRoute>} />
                  <Route path="/certificados" element={<ProtectedRoute requiredPermissions={["certificados.view"]}><Certificados /></ProtectedRoute>} />
                  <Route path="/liquidaciones" element={<ProtectedRoute requiredPermissions={["rrhh.payroll"]}><Liquidaciones /></ProtectedRoute>} />
                  <Route path="/mi-perfil" element={<ProtectedRoute><MiPerfil /></ProtectedRoute>} />
                  <Route path="/mis-documentos" element={<ProtectedRoute><MisDocumentos /></ProtectedRoute>} />
                  <Route path="/dashboard" element={<ProtectedRoute requiredPermissions={["dashboard.view"]}><Dashboard /></ProtectedRoute>} />
                  <Route path="/tablero/tv" element={<ProtectedRoute requiredPermissions={["dashboard.view"]}><TableroTV /></ProtectedRoute>} />
                  <Route path="/reportes" element={<ProtectedRoute requiredPermissions={["reportes.view"]}><Reportes /></ProtectedRoute>} />
                  <Route path="/mensajes" element={<ProtectedRoute requiredPermissions={["mensajes.view"]}><Mensajes /></ProtectedRoute>} />
                  <Route path="/rrhh" element={<ProtectedRoute requiredPermissions={["rrhh.view"]}><RRHH /></ProtectedRoute>} />
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
