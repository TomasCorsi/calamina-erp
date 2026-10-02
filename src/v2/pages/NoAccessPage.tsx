import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export function NoAccessPage() {
  const { loading, session, hasAccess, signOut } = useAuth();
  if (!loading && !session) return <Navigate to="/login" replace />;
  if (!loading && hasAccess) return <Navigate to="/" replace />;
  return <div className="v2-auth-page"><section className="v2-card v2-auth-card">
    <p className="v2-eyebrow">Acceso restringido</p><h1>Tu usuario no tiene una membresía activa</h1>
    <p className="v2-muted">Solicitá a un administrador que revise tu acceso.</p>
    <button type="button" className="v2-button" onClick={() => void signOut()}>Cerrar sesión</button>
  </section></div>;
}
