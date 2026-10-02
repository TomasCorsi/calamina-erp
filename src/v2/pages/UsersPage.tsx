import { FormEvent, useCallback, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { v2Supabase } from "../supabase";

type Role = { role_key: string; role_name: string };
type Person = { id: string; internal_code: string; first_name: string; last_name: string; work_email: string | null };
type Invitation = { invitation_id: string; email: string; role_key: string; personal_id: string | null; state: string; expires_at: string; created_at: string };

export function UsersPage() {
  const { permissions } = useAuth();
  const [roles, setRoles] = useState<Role[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [email, setEmail] = useState("");
  const [roleKey, setRoleKey] = useState("");
  const [personalId, setPersonalId] = useState("");
  const [inviteUrl, setInviteUrl] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    const [rolesResult, invitationsResult, peopleResult] = await Promise.all([
      v2Supabase.schema("api").rpc("assignable_roles"),
      v2Supabase.schema("api").rpc("list_registration_invitations"),
      v2Supabase.from("personal").select("id, internal_code, first_name, last_name, work_email").eq("status", "active").order("last_name"),
    ]);
    if (!rolesResult.error && Array.isArray(rolesResult.data)) {
      const availableRoles = rolesResult.data as Role[];
      setRoles(availableRoles);
      setRoleKey((current) => current || availableRoles[0]?.role_key || "");
    }
    if (!invitationsResult.error && Array.isArray(invitationsResult.data)) setInvitations(invitationsResult.data as Invitation[]);
    if (!peopleResult.error && Array.isArray(peopleResult.data)) setPeople(peopleResult.data as Person[]);
  }, []);

  useEffect(() => { void loadData(); }, [loadData]);
  if (!permissions.has("users.invite")) return <Navigate to="/" replace />;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true); setError(""); setMessage(""); setInviteUrl("");
    const { data, error: invocationError } = await v2Supabase.functions.invoke("create-registration-invitation", {
      body: { email: email.trim(), role_key: roleKey, personal_id: personalId || null },
    });
    setSubmitting(false);
    if (invocationError || !data?.invite_url) {
      setError("No se pudo crear la invitación. Revisá el email, rol y personal elegido.");
      return;
    }
    setInviteUrl(data.invite_url);
    setMessage("Invitación creada. Compartí el enlace por un canal seguro.");
    setEmail(""); setPersonalId("");
    await loadData();
  };

  const copyInvite = async () => {
    await navigator.clipboard.writeText(inviteUrl);
    setMessage("Enlace copiado al portapapeles.");
  };

  const revoke = async (invitationId: string) => {
    setError("");
    const { error: invocationError } = await v2Supabase.functions.invoke("revoke-registration-invitation", {
      body: { invitation_id: invitationId },
    });
    if (invocationError) return setError("No se pudo revocar la invitación.");
    setMessage("Invitación revocada."); setInviteUrl("");
    await loadData();
  };

  return (
    <section>
      <p className="v2-eyebrow">Administración</p><h2>Usuarios e invitaciones</h2>
      <div className="v2-grid v2-grid-wide">
        <article className="v2-card">
          <h3>Nueva invitación</h3>
          <form className="v2-form" onSubmit={handleSubmit}>
            <label>Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
            <label>Rol<select value={roleKey} onChange={(event) => setRoleKey(event.target.value)} required>
              {roles.map((role) => <option key={role.role_key} value={role.role_key}>{role.role_name}</option>)}
            </select></label>
            <label>Personal (opcional)<select value={personalId} onChange={(event) => {
              const selected = people.find((person) => person.id === event.target.value);
              setPersonalId(event.target.value);
              if (selected?.work_email) setEmail(selected.work_email);
            }}>
              <option value="">Sin vincular</option>
              {people.map((person) => <option key={person.id} value={person.id} disabled={!person.work_email}>
                {person.internal_code} · {person.last_name}, {person.first_name}{person.work_email ? "" : " · sin email"}
              </option>)}
            </select></label>
            <button className="v2-button" type="submit" disabled={submitting || !roleKey}>{submitting ? "Creando…" : "Crear invitación"}</button>
          </form>
          {error && <p className="v2-error" role="alert">{error}</p>}
          {message && <p className="v2-success" role="status">{message}</p>}
          {inviteUrl && <div className="v2-invite-link">
            <label>Enlace local<input readOnly value={inviteUrl} onFocus={(event) => event.currentTarget.select()} /></label>
            <button type="button" className="v2-button v2-button-secondary" onClick={() => void copyInvite()}>Copiar</button>
          </div>}
        </article>
        <article className="v2-card">
          <h3>Invitaciones activas</h3>
          {invitations.length === 0 ? <p className="v2-muted">No hay invitaciones activas.</p> : <div className="v2-table-wrap"><table>
            <thead><tr><th>Email</th><th>Rol</th><th>Estado</th><th>Vence</th><th /></tr></thead>
            <tbody>{invitations.map((invitation) => <tr key={invitation.invitation_id}>
              <td>{invitation.email}</td><td>{invitation.role_key}</td><td>{invitation.state}</td>
              <td>{new Date(invitation.expires_at).toLocaleString("es-AR")}</td>
              <td>{invitation.state === "pending" && <button type="button" className="v2-link-button" onClick={() => void revoke(invitation.invitation_id)}>Revocar</button>}</td>
            </tr>)}</tbody>
          </table></div>}
        </article>
      </div>
    </section>
  );
}
