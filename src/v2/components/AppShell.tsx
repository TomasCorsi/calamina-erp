import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export function AppShell() {
  const { profile, user, permissions, signOut } = useAuth();
  return (
    <div className="v2-app-shell">
      <header className="v2-header">
        <div><p className="v2-eyebrow">CALAMINA</p><h1>ERP v2</h1></div>
        <nav aria-label="Navegación principal">
          <NavLink to="/" end>Inicio</NavLink>
          {permissions.has("users.invite") && <NavLink to="/usuarios">Usuarios</NavLink>}
        </nav>
        <div className="v2-user-menu">
          <span>{profile?.display_name ?? user?.email}</span>
          <button type="button" className="v2-button v2-button-secondary" onClick={() => void signOut()}>Salir</button>
        </div>
      </header>
      <main className="v2-main"><Outlet /></main>
    </div>
  );
}
