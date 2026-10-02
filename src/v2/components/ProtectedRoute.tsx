import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { loading, session, hasAccess } = useAuth();
  if (loading) return <div className="v2-centered"><p>Cargando sesión…</p></div>;
  if (!session) return <Navigate to="/login" replace />;
  if (!hasAccess) return <Navigate to="/sin-acceso" replace />;
  return <>{children}</>;
}
