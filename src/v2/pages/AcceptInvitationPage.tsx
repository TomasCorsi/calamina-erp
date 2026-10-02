import { FormEvent, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { v2Supabase } from "../supabase";

function tokenFromLocation(): string {
  const hash = new URLSearchParams(window.location.hash.replace(/^#/u, ""));
  return hash.get("token") ?? new URLSearchParams(window.location.search).get("token") ?? "";
}

export function AcceptInvitationPage() {
  const token = useMemo(tokenFromLocation, []);
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    if (!token) return setError("El enlace de invitación no contiene un token válido.");
    if (password !== confirmation) return setError("Las contraseñas no coinciden.");
    setSubmitting(true);
    const { error: invocationError } = await v2Supabase.functions.invoke("accept-registration-invitation", {
      body: { token, password, display_name: displayName.trim() },
    });
    setSubmitting(false);
    if (invocationError) return setError("La invitación no está disponible o no pudo aceptarse.");
    window.history.replaceState(null, "", "/aceptar-invitacion");
    setAccepted(true);
  };

  return (
    <div className="v2-auth-page"><section className="v2-card v2-auth-card">
      <p className="v2-eyebrow">CALAMINA ERP v2</p><h1>Aceptar invitación</h1>
      {accepted ? <div className="v2-success" role="status"><p>Tu usuario fue creado correctamente.</p><Link className="v2-button v2-inline-button" to="/login">Ir al inicio de sesión</Link></div> : (
        <form onSubmit={handleSubmit} className="v2-form">
          <label>Nombre visible<input value={displayName} maxLength={120} onChange={(event) => setDisplayName(event.target.value)} required /></label>
          <label>Contraseña<input type="password" minLength={8} maxLength={128} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
          <label>Repetir contraseña<input type="password" minLength={8} maxLength={128} autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} required /></label>
          {error && <p className="v2-error" role="alert">{error}</p>}
          <button className="v2-button" type="submit" disabled={submitting}>{submitting ? "Creando usuario…" : "Crear usuario"}</button>
        </form>
      )}
      <p className="v2-muted v2-small"><Link to="/login">Volver al inicio de sesión</Link></p>
    </section></div>
  );
}
