import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Search, Link2 } from "lucide-react";
import { toast } from "sonner";

interface PersonalRecord {
  id: string;
  legajo: string | null;
  nombre: string | null;
  apellido: string | null;
}

interface LinkUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string;
  availablePersonal: PersonalRecord[];
  onSuccess: () => void;
}

export function LinkUserDialog({
  open,
  onOpenChange,
  userId,
  userName,
  availablePersonal,
  onSuccess,
}: LinkUserDialogProps) {
  const [search, setSearch] = useState("");
  const [selectedPersonalId, setSelectedPersonalId] = useState<string | null>(null);
  const [isLinking, setIsLinking] = useState(false);

  const filteredPersonal = useMemo(() => {
    if (!search.trim()) return availablePersonal;
    const searchLower = search.toLowerCase();
    return availablePersonal.filter((p) => {
      const fullName = `${p.nombre || ""} ${p.apellido || ""}`.toLowerCase();
      const legajo = p.legajo?.toLowerCase() || "";
      return fullName.includes(searchLower) || legajo.includes(searchLower);
    });
  }, [availablePersonal, search]);

  const handleLink = async () => {
    if (!selectedPersonalId) {
      toast.error("Selecciona un empleado para vincular");
      return;
    }

    setIsLinking(true);
    try {
      const { error } = await supabase
        .from("personal")
        .update({ user_id: userId })
        .eq("id", selectedPersonalId);

      if (error) throw error;

      toast.success("Usuario vinculado correctamente");
      onSuccess();
      onOpenChange(false);
      setSelectedPersonalId(null);
      setSearch("");
    } catch (error) {
      console.error("Error linking user:", error);
      toast.error("Error al vincular usuario");
    } finally {
      setIsLinking(false);
    }
  };

  const handleClose = () => {
    if (!isLinking) {
      onOpenChange(false);
      setSelectedPersonalId(null);
      setSearch("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Link2 className="w-5 h-5 text-primary" />
            Vincular Usuario con Empleado
          </DialogTitle>
          <DialogDescription>
            Selecciona el empleado que corresponde a <strong>{userName}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por legajo o nombre..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-muted border-border"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-muted-foreground text-sm">
              Empleados disponibles ({filteredPersonal.length})
            </Label>
            <ScrollArea className="h-[200px] rounded-md border border-border">
              {filteredPersonal.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground text-sm">
                  {search ? "No se encontraron resultados" : "No hay empleados sin vincular"}
                </div>
              ) : (
                <RadioGroup
                  value={selectedPersonalId || ""}
                  onValueChange={setSelectedPersonalId}
                  className="p-2 space-y-1"
                >
                  {filteredPersonal.map((personal) => (
                    <div
                      key={personal.id}
                      className="flex items-center space-x-3 rounded-md p-2 hover:bg-muted/50 cursor-pointer"
                      onClick={() => setSelectedPersonalId(personal.id)}
                    >
                      <RadioGroupItem value={personal.id} id={personal.id} />
                      <Label
                        htmlFor={personal.id}
                        className="flex-1 cursor-pointer font-normal"
                      >
                        <span className="font-medium text-primary">
                          {personal.legajo || "S/N"}
                        </span>
                        {" - "}
                        <span className="text-foreground">
                          {personal.nombre} {personal.apellido}
                        </span>
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              )}
            </ScrollArea>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isLinking}
            className="bg-muted border-border"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleLink}
            disabled={!selectedPersonalId || isLinking}
            className="bg-primary hover:bg-primary/90"
          >
            {isLinking ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Vinculando...
              </>
            ) : (
              <>
                <Link2 className="w-4 h-4 mr-2" />
                Vincular
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
