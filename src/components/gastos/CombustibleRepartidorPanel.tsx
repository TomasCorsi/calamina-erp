import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Fuel, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useEmpleadoProfile } from "@/hooks/useEmpleadoProfile";
import { useCargasRepartidor, type CargaRepartidor } from "@/hooks/useCargasRepartidor";
import { useMaquinarias } from "@/hooks/useMaquinarias";
import { useObras } from "@/hooks/useObras";
import { CargaCombustibleRepartidorDialog } from "@/components/parte-diario/CargaCombustibleRepartidorDialog";
import { CargasCombustibleRepartidorList } from "@/components/parte-diario/CargasCombustibleRepartidorList";
import { DeleteConfirmDialog } from "@/components/shared/DeleteConfirmDialog";

/**
 * Panel de entregas de combustible para un repartidor:
 * sólo muestra y permite editar las cargas registradas por el propio usuario.
 */
export function CombustibleRepartidorPanel() {
  const { empleado, loading: loadingEmpleado } = useEmpleadoProfile();
  const { maquinarias } = useMaquinarias();
  const { obras } = useObras();

  const [showDialog, setShowDialog] = useState(false);
  const [editingCarga, setEditingCarga] = useState<CargaRepartidor | null>(null);
  const [deletingCarga, setDeletingCarga] = useState<CargaRepartidor | null>(null);

  const {
    cargas,
    totalLitros,
    isLoading,
    createCarga,
    updateCarga,
    deleteCarga,
    isCreating,
    isUpdating,
    isDeleting,
  } = useCargasRepartidor(null, empleado?.id ?? null);

  const { data: personal = [] } = useQuery({
    queryKey: ["personal_selector"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("personal_selector" as any)
        .select("id, nombre, apellido, legajo, rol")
        .eq("activo", true)
        .order("apellido");
      if (error) throw error;
      return (data || []) as unknown as {
        id: string;
        nombre: string | null;
        apellido: string | null;
        legajo: string | null;
        rol: string | null;
      }[];
    },
  });

  const todayStr = new Date().toLocaleDateString("en-CA");

  if (loadingEmpleado) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!empleado) {
    return (
      <div className="card-industrial p-6 text-center text-muted-foreground">
        No encontramos tu ficha de personal, por eso no se pueden registrar entregas.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Fuel className="w-5 h-5 text-primary" />
          <div>
            <p className="font-semibold text-foreground leading-tight">Mis entregas de combustible</p>
            <p className="text-sm text-muted-foreground">
              {cargas.length} entrega{cargas.length === 1 ? "" : "s"} · {totalLitros.toLocaleString("es-AR")} L/Kg
            </p>
          </div>
        </div>
        <Button
          className="gap-2"
          onClick={() => {
            setEditingCarga(null);
            setShowDialog(true);
          }}
        >
          <Plus className="w-4 h-4" />
          Nueva entrega
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : (
        <CargasCombustibleRepartidorList
          cargas={cargas}
          totalLitros={totalLitros}
          onEdit={(carga) => {
            setEditingCarga(carga);
            setShowDialog(true);
          }}
          onDelete={(carga) => setDeletingCarga(carga)}
          isDeleting={isDeleting}
        />
      )}

      <CargaCombustibleRepartidorDialog
        open={showDialog}
        onOpenChange={(open) => {
          setShowDialog(open);
          if (!open) setEditingCarga(null);
        }}
        carga={editingCarga}
        fechaParte={todayStr}
        personal={personal}
        maquinarias={maquinarias as any}
        obras={obras as any}
        onSave={async (data) => {
          if (editingCarga) {
            await updateCarga({ id: editingCarga.id, ...data });
          } else {
            await createCarga({ ...data, repartidor_id: empleado.id });
          }
        }}
        isSaving={isCreating || isUpdating}
      />

      <DeleteConfirmDialog
        open={!!deletingCarga}
        onOpenChange={(open) => {
          if (!open) setDeletingCarga(null);
        }}
        onConfirm={async () => {
          if (deletingCarga) {
            await deleteCarga(deletingCarga.id);
            setDeletingCarga(null);
          }
        }}
        title="¿Eliminar entrega?"
        description="Se eliminará permanentemente esta entrega de combustible."
      />
    </div>
  );
}
