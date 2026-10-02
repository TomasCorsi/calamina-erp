import { FormEvent, useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export function LoginPage() {
  const { loading, session, hasAccess, signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  if (!loading && session) return <Navigate to={hasAccess ? "/" : "/sin-acceso"} replace />;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await signIn(email.trim(), password);
    } catch {
      setError("No se pudo iniciar sesión. Revisá tus credenciales.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="v2-auth-page"><section className="v2-card v2-auth-card">
      <p className="v2-eyebrow">CALAMINA ERP v2</p><h1>Iniciar sesión</h1>
      <p className="v2-muted">Entorno local de desarrollo.</p>
      <form onSubmit={handleSubmit} className="v2-form">
        <label>Email<input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
        <label>Contraseña<input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
        {error && <p className="v2-error" role="alert">{error}</p>}
        <button className="v2-button" type="submit" disabled={submitting}>{submitting ? "Ingresando…" : "Ingresar"}</button>
      </form>
      <p className="v2-muted v2-small">¿Tenés una invitación? <Link to="/aceptar-invitacion">Completá tu registro</Link>.</p>
    </section></div>
  );
}
