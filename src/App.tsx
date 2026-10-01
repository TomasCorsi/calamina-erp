import { Suspense, lazy } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

// Lazy loaded non-critical wrappers (reduce unused JS on initial load)
const Toaster = lazy(() => import("@/components/ui/toaster").then(m => ({ default: m.Toaster })));
const Sonner = lazy(() => import("@/components/ui/sonner").then(m => ({ default: m.Toaster })));
const TooltipProvider = lazy(() => import("@/components/ui/tooltip").then(m => ({ default: m.TooltipProvider })));
const SessionKeepAlive = lazy(() => import("@/components/auth/SessionKeepAlive").then(m => ({ default: m.SessionKeepAlive })));
const OfflineBanner = lazy(() => import("@/components/pwa/OfflineBanner").then(m => ({ default: m.OfflineBanner })));

// Eagerly loaded pages (critical path)
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import NoAccess from "./pages/NoAccess";
import Install from "./pages/Install";
import NotFound from "./pages/NotFound";

// Lazy loaded pages (code splitting)
const Index = lazy(() => import("./pages/Index"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const TableroTV = lazy(() => import("./pages/TableroTV"));
const Obras = lazy(() => import("./pages/Obras"));
const Cotizaciones = lazy(() => import("./pages/Cotizaciones"));
const CertificadosPage = lazy(() => import("./pages/Certificados"));
const Personal = lazy(() => import("./pages/Personal"));
const Maquinarias = lazy(() => import("./pages/Maquinarias"));
const Viajes = lazy(() => import("./pages/Viajes"));
const Remitos = lazy(() => import("./pages/Remitos"));
const Gastos = lazy(() => import("./pages/Gastos"));
const Mantenimiento = lazy(() => import("./pages/MantenimientoPage"));
const Stock = lazy(() => import("./pages/Stock"));
const ParteDiario = lazy(() => import("./pages/ParteDiario"));
const RegistroEmpleado = lazy(() => import("./pages/RegistroEmpleado"));
const Reportes = lazy(() => import("./pages/Reportes"));
const Configuracion = lazy(() => import("./pages/Configuracion"));
const MiPerfil = lazy(() => import("./pages/MiPerfil"));
const MisDocumentos = lazy(() => import("./pages/MisDocumentos"));
const Clientes = lazy(() => import("./pages/Clientes"));
const Liquidaciones = lazy(() => import("./pages/Liquidaciones"));
const RRHH = lazy(() => import("./pages/RRHH"));
const Contabilidad = lazy(() => import("./pages/Contabilidad"));

const Presentismo = lazy(() => import("./pages/Presentismo"));
const Mensajes = lazy(() => import("./pages/Mensajes"));
const Proveedores = lazy(() => import("./pages/Proveedores"));

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

import { LoadingScreen } from "@/components/shared/LoadingScreen";

// Loading fallback component
const PageLoader = () => <LoadingScreen />;

const App = () => (
  <QueryClientProvider client={queryClient}>
    <Suspense fallback={null}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Suspense fallback={null}>
              <SessionKeepAlive />
              <OfflineBanner />
            </Suspense>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/registro" element={<Register />} />
              <Route path="/registro-empleado" element={<RegistroEmpleado />} />
              <Route path="/olvide-contrasena" element={<ForgotPassword />} />
              <Route path="/restablecer-contrasena" element={<ResetPassword />} />
              <Route path="/sin-acceso" element={<NoAccess />} />
              <Route path="/install" element={<Install />} />

              {/* Protected routes - Main roles (not ayudante) */}
              <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
              {/* Admin-only routes */}
              <Route path="/dashboard" element={
                <ProtectedRoute requiredRoles={['admin']}>
                  <Dashboard />
                </ProtectedRoute>
              } />
              <Route path="/tablero/tv" element={
                <ProtectedRoute requiredRoles={['admin']}>
                  <TableroTV />
                </ProtectedRoute>
              } />
              <Route path="/obras" element={
                <ProtectedRoute requiredRoles={['admin']}>
                  <Obras />
                </ProtectedRoute>
              } />
              <Route path="/clientes" element={
                <ProtectedRoute requiredRoles={['admin']}>
                  <Clientes />
                </ProtectedRoute>
              } />
              <Route path="/viajes" element={
                <ProtectedRoute requiredRoles={['admin']}>
                  <Viajes />
                </ProtectedRoute>
              } />
              <Route path="/remitos" element={
                <ProtectedRoute requiredRoles={['admin', 'remitero']}>
                  <Remitos />
                </ProtectedRoute>
              } />
              <Route path="/gastos" element={
                <ProtectedRoute requiredRoles={['admin']}>
                  <Gastos />
                </ProtectedRoute>
              } />
              <Route path="/mantenimiento" element={
                <ProtectedRoute requiredRoles={['admin']}>
                  <Mantenimiento />
                </ProtectedRoute>
              } />
              <Route path="/stock" element={
                <ProtectedRoute requiredRoles={['admin']}>
                  <Stock />
                </ProtectedRoute>
              } />
              <Route path="/cotizaciones" element={
                <ProtectedRoute requiredRoles={['admin']}>
                  <Cotizaciones />
                </ProtectedRoute>
              } />
              <Route path="/certificados" element={
                <ProtectedRoute requiredRoles={['admin']}>
                  <CertificadosPage />
                </ProtectedRoute>
              } />
              <Route path="/personal" element={
                <ProtectedRoute requiredRoles={['admin']}>
                  <Personal />
                </ProtectedRoute>
              } />
              <Route path="/maquinarias" element={
                <ProtectedRoute requiredRoles={['admin']}>
                  <Maquinarias />
                </ProtectedRoute>
              } />
              <Route path="/reportes" element={
                <ProtectedRoute requiredRoles={['admin']}>
                  <Reportes />
                </ProtectedRoute>
              } />
              <Route path="/mensajes" element={
                <ProtectedRoute requiredRoles={['admin', 'capataz']}>
                  <Mensajes />
                </ProtectedRoute>
              } />
              <Route path="/configuracion" element={
                <ProtectedRoute requiredRoles={['admin']}>
                  <Configuracion />
                </ProtectedRoute>
              } />
              <Route path="/proveedores" element={
                <ProtectedRoute requiredRoles={['admin']}>
                  <Proveedores />
                </ProtectedRoute>
              } />
              <Route path="/liquidaciones" element={
                <ProtectedRoute requiredRoles={['admin']}>
                  <Liquidaciones />
                </ProtectedRoute>
              } />
              <Route path="/rrhh" element={
                <ProtectedRoute requiredRoles={['admin']}>
                  <RRHH />
                </ProtectedRoute>
              } />
              <Route path="/contabilidad" element={
                <ProtectedRoute requiredRoles={['admin', 'contador']}>
                  <Contabilidad />
                </ProtectedRoute>
              } />


              {/* Parte Diario - accessible to all authenticated roles */}
              <Route path="/parte-diario" element={
                <ProtectedRoute requiredRoles={['admin', 'capataz', 'maquinista', 'ayudante']}>
                  <ParteDiario />
                </ProtectedRoute>
              } />

              {/* Mi Perfil - accessible to all authenticated users */}
              <Route path="/mi-perfil" element={
                <ProtectedRoute requiredRoles={['admin', 'capataz', 'maquinista', 'ayudante', 'remitero']}>
                  <MiPerfil />
                </ProtectedRoute>
              } />

              <Route path="/mis-documentos" element={
                <ProtectedRoute requiredRoles={['admin', 'capataz', 'maquinista', 'ayudante', 'remitero']}>
                  <MisDocumentos />
                </ProtectedRoute>
              } />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
      </TooltipProvider>
    </Suspense>
  </QueryClientProvider>
);

export default App;
