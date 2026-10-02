import { type FormEvent, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabaseV2 as supabase } from "@/integrations/supabase/client";
import logoFull from "@/assets/logo-full.png";

function tokenFromLocation() {
  const hash = new URLSearchParams(window.location.hash.replace(/^#/u, ""));
  return hash.get("token") ?? new URLSearchParams(window.location.search).get("token") ?? "";
}

export default function AcceptInvitation() {
  const token = useMemo(tokenFromLocation, []);
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    if (!token) return setError("El enlace de invitación no contiene un token válido.");
    if (password !== confirmation) return setError("Las contraseñas no coinciden.");
    setSubmitting(true);
    const { error: invocationError } = await supabase.functions.invoke("accept-registration-invitation", { body: { token, password, display_name: displayName.trim() } });
    setSubmitting(false);
    if (invocationError) return setError("La invitación no está disponible o no pudo aceptarse.");
    window.history.replaceState(null, "", "/aceptar-invitacion");
    setAccepted(true);
  };

  return <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 p-4">
    <Card className="w-full max-w-md shadow-xl border-border/50">
      <CardHeader className="text-center space-y-4">
        <img src={logoFull} alt="Calamina Sur" className="h-20 w-auto mx-auto" />
        <div><CardTitle>Aceptar invitación</CardTitle><CardDescription>Completá tus datos para activar el acceso</CardDescription></div>
      </CardHeader>
      {accepted ? <CardContent className="space-y-4 text-center"><p>Tu usuario fue creado correctamente.</p><Button asChild className="w-full"><Link to="/login">Ir al inicio de sesión</Link></Button></CardContent> : <form onSubmit={submit}>
        <CardContent className="space-y-4">
          <div className="space-y-2"><Label htmlFor="display-name">Nombre visible</Label><Input id="display-name" value={displayName} maxLength={120} onChange={(event) => setDisplayName(event.target.value)} required /></div>
          <div className="space-y-2"><Label htmlFor="password">Contraseña</Label><Input id="password" type="password" minLength={8} maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} required /></div>
          <div className="space-y-2"><Label htmlFor="confirmation">Repetir contraseña</Label><Input id="confirmation" type="password" minLength={8} maxLength={128} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} required /></div>
          {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
        </CardContent>
        <CardFooter className="flex-col gap-3"><Button type="submit" className="w-full" disabled={submitting}>{submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <UserPlus className="h-4 w-4 mr-2" />}{submitting ? "Creando usuario…" : "Crear usuario"}</Button><Link to="/login" className="text-sm text-muted-foreground hover:text-primary">Volver al inicio de sesión</Link></CardFooter>
      </form>}
    </Card>
  </main>;
}
