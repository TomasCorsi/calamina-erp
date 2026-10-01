import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Eye, EyeOff, Copy, Wand2, KeyRound } from "lucide-react";
import { toast } from "sonner";

interface ChangePasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string;
}

function generatePassword(length = 10): string {
  const chars =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let pwd = "";
  const arr = new Uint32Array(length);
  crypto.getRandomValues(arr);
  for (let i = 0; i < length; i++) {
    pwd += chars[arr[i] % chars.length];
  }
  return pwd;
}

export function ChangePasswordDialog({
  open,
  onOpenChange,
  userId,
  userName,
}: ChangePasswordDialogProps) {
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(true);
  const [saving, setSaving] = useState(false);

  const handleGenerate = () => {
    setPassword(generatePassword(10));
    setShow(true);
  };

  const handleCopy = async () => {
    if (!password) return;
    try {
      await navigator.clipboard.writeText(password);
      toast.success("Contraseña copiada");
    } catch {
      toast.error("No se pudo copiar");
    }
  };

  const handleSubmit = async () => {
    if (password.length < 6) {
      toast.error("La contraseña debe tener al menos 6 caracteres");
      return;
    }
    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "admin-update-user-password",
        { body: { userId, newPassword: password } }
      );
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast.success("Contraseña actualizada correctamente");
    } catch (err: any) {
      console.error(err);
      toast.error("Error al actualizar: " + (err?.message || "Desconocido"));
    } finally {
      setSaving(false);
    }
  };

  const handleClose = (val: boolean) => {
    if (!val) {
      setPassword("");
      setShow(true);
    }
    onOpenChange(val);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <KeyRound className="w-5 h-5 text-primary" />
            Cambiar contraseña
          </DialogTitle>
          <DialogDescription>
            Establecé una nueva contraseña para <strong>{userName}</strong>. Luego
            podés copiarla y enviársela al empleado.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="new-password">Nueva contraseña</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="new-password"
                  type={show ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="bg-muted border-border pr-10 font-mono"
                  autoComplete="new-password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full w-10"
                  onClick={() => setShow((s) => !s)}
                >
                  {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleCopy}
                disabled={!password}
                title="Copiar"
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full"
              onClick={handleGenerate}
            >
              <Wand2 className="w-4 h-4 mr-2" />
              Generar contraseña segura
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={saving || password.length < 6}
            className="bg-primary hover:bg-primary/90"
          >
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Guardar contraseña
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
