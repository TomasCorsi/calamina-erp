import { useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { TopNavbar } from "@/components/layout/TopNavbar";
import { ParteDiarioAdminView } from "@/components/parte-diario/ParteDiarioAdminView";
import { ParteDiarioFormView } from "@/components/parte-diario/ParteDiarioFormView";
import { ParteDiarioHomeView } from "@/components/parte-diario/ParteDiarioHomeView";
import { ParteDiarioListView } from "@/components/parte-diario/ParteDiarioListView";
import { useAuth } from "@/hooks/useAuth";
import { useEmpleadoProfile } from "@/hooks/useEmpleadoProfile";
import { useParteDiario, type ParteDiario as ParteDiarioType, type ParteDiarioInsert } from "@/hooks/useParteDiario";
import { useParteDiarioCatalogs } from "@/hooks/useParteDiarioCatalogs";
import { WORK_ROLE_LABELS, type WorkRole } from "@/types/workRole";
import { toast } from "sonner";

type ViewMode = "home" | "form" | "list";

export default function ParteDiario() {
  const { roles, loading: loadingAuth } = useAuth();
  const isAdmin = roles.includes("admin");
  const { empleado, rolPersonal, loading: loadingEmpleado } = useEmpleadoProfile();
  const { obras, maquinarias, personal } = useParteDiarioCatalogs();
  const {
    partes, borradorHoy, partesCompletadosHoy, saveDraft, completeParte, discardDraft,
    isSaving, isDeleting,
  } = useParteDiario();
  const [view, setView] = useState<ViewMode>("home");
  const [editingParte, setEditingParte] = useState<ParteDiarioType | null>(null);

  if (loadingAuth) return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  if (isAdmin) return <div className="min-h-screen bg-background"><TopNavbar /><main className="container mx-auto px-4 py-4"><ParteDiarioAdminView /></main></div>;

  if (loadingEmpleado && !empleado) return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  if (!empleado || !rolPersonal) return (
    <div className="min-h-screen bg-background"><TopNavbar /><main className="container mx-auto px-4 py-8">
      <Card className="max-w-md mx-auto"><CardContent className="pt-8 text-center space-y-4"><AlertCircle className="w-16 h-16 text-amber-500 mx-auto" /><h2 className="text-xl font-bold">Perfil operativo incompleto</h2><p className="text-muted-foreground">Tu cuenta necesita personal vinculado y rol operativo para utilizar Parte Diario.</p></CardContent></Card>
    </main></div>
  );

  const back = () => { setEditingParte(null); setView("home"); };
  const persist = async (data: ParteDiarioInsert, complete: boolean) => {
    try {
      if (complete) await completeParte(data, editingParte?.id);
      else await saveDraft(data, editingParte?.id);
      back();
    } catch (error) {
      console.error("Parte Diario persistence failed", error);
    }
  };

  return <div className="min-h-screen bg-background"><TopNavbar /><main className="container mx-auto px-4 py-4 max-w-lg">
    {view === "home" && <ParteDiarioHomeView
      borradorHoy={borradorHoy}
      partesCompletadosHoy={partesCompletadosHoy}
      nombreEmpleado={empleado.nombreCompleto}
      rolLabel={WORK_ROLE_LABELS[rolPersonal as WorkRole]}
      isRepartidor={rolPersonal === "repartidor_calecita"}
      isMecanico={rolPersonal === "mecanico" || rolPersonal === "ayudante"}
      extensionsDisabled
      onNewParte={() => { setEditingParte(null); setView("form"); }}
      onViewList={() => setView("list")}
      onContinueDraft={() => { setEditingParte(borradorHoy); setView("form"); }}
      onDiscardDraft={() => void discardDraft()}
      onEditCompletado={(parte) => { setEditingParte(parte); setView("form"); }}
      onRegistrarEntrega={() => toast.info("Combustible está pendiente de migración v2")}
      onVerAlertas={() => toast.info("Alertas están pendientes de migración v2")}
      onNuevoMantenimiento={() => toast.info("Mantenimiento está pendiente de migración v2")}
      isDiscarding={isDeleting}
    />}
    {view === "list" && <ParteDiarioListView partes={partes} onBack={back} onEdit={(parte) => { setEditingParte(parte); setView("form"); }} />}
    {view === "form" && <ParteDiarioFormView
      parte={editingParte} empleadoId={empleado.id} rol={rolPersonal}
      obras={obras} maquinarias={maquinarias} personal={personal}
      onBack={back} onSaveDraft={(data) => persist(data, false)} onComplete={(data) => persist(data, true)} isSaving={isSaving}
    />}
  </main></div>;
}
