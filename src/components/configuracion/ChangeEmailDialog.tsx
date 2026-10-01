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
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ChangeEmailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string;
  onSuccess?: () => void;
}

export function ChangeEmailDialog({
  open,
  onOpenChange,
  userId,
  userName,
  onSuccess,
}: ChangeEmailDialogProps) {
  const [newEmail, setNewEmail] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const reset = () => {
    setNewEmail("");
    setConfirmEmail("");
  };

  const handleSubmit = async () => {
    const email = newEmail.trim().toLowerCase();
    const confirm = confirmEmail.trim().toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Email inválido");
      return;
    }
    if (email !== confirm) {
      toast.error("Los emails no coinciden");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "admin-update-user-email",
        { body: { userId, newEmail: email } }
      );
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);

      toast.success("Email actualizado correctamente");
      reset();
      onOpenChange(false);
      onSuccess?.();
    } catch (err: any) {
      console.error(err);
      toast.error("Error al cambiar email: " + (err?.message || "desconocido"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!loading) {
          onOpenChange(o);
          if (!o) reset();
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cambiar email</DialogTitle>
          <DialogDescription>
            Cambiar el email de inicio de sesión de{" "}
            <span className="font-medium text-foreground">{userName}</span>. La
            contraseña no se modifica.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="new-email">Nuevo email</Label>
            <Input
              id="new-email"
              type="email"
              autoComplete="off"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="usuario@ejemplo.com"
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-email">Confirmar nuevo email</Label>
            <Input
              id="confirm-email"
              type="email"
              autoComplete="off"
              value={confirmEmail}
              onChange={(e) => setConfirmEmail(e.target.value)}
              placeholder="usuario@ejemplo.com"
              disabled={loading}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Cambiar email
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
