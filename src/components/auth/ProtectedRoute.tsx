import { Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

type ProtectedRouteProps = {
  children: React.ReactNode;
  adminOnly?: boolean;
  requiredPermissions?: string[];
};

export function ProtectedRoute({ children, adminOnly = false, requiredPermissions = [] }: ProtectedRouteProps) {
  const { user, loading, hasAccess, roles, hasPermission } = useAuth();
  const location = useLocation();
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  if (!hasAccess) return <Navigate to="/sin-acceso" replace />;
  if (adminOnly && !roles.includes("admin")) return <Navigate to="/sin-acceso" replace />;
  if (requiredPermissions.length > 0 && !hasPermission(requiredPermissions)) return <Navigate to="/sin-acceso" replace />;
  return <>{children}</>;
}
