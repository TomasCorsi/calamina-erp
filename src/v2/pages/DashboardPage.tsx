import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export function DashboardPage() {
  const { profile, permissions } = useAuth();
  return (
    <section>
      <p className="v2-eyebrow">Panel local</p><h2>Hola, {profile?.display_name ?? "usuario"}</h2>
      <p className="v2-lead">El acceso operativo v2 ya está aislado y funcionando sobre Supabase local.</p>
      <div className="v2-grid">
        <article className="v2-card">
          <h3>Tu acceso</h3>
          <p>Estado: <strong>Conectado</strong></p>
          <p>Permisos efectivos:</p>
          <ul>{Array.from(permissions).sort().map((permission) => <li key={permission}>{permission}</li>)}</ul>
        </article>
        {permissions.has("users.invite") && <article className="v2-card"><h3>Administración de usuarios</h3><p>Creá invitaciones locales y asigná un rol permitido.</p><Link to="/usuarios">Abrir usuarios</Link></article>}
      </div>
    </section>
  );
}
