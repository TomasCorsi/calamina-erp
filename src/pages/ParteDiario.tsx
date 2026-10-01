import { useState, useMemo, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Loader2, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { TopNavbar } from "@/components/layout/TopNavbar";
import { useAuth } from "@/hooks/useAuth";
import { useEmpleadoProfile } from "@/hooks/useEmpleadoProfile";
import { useParteDiario, type ParteDiario as ParteDiarioType } from "@/hooks/useParteDiario";
import { useObras } from "@/hooks/useObras";
import { useMaquinarias } from "@/hooks/useMaquinarias";
import { saveToOfflineCache, loadFromOfflineCache } from "@/hooks/useOfflineCache";
import { supabase } from "@/integrations/supabase/client";
import { useCargasRepartidor } from "@/hooks/useCargasRepartidor";
import { ParteDiarioHomeView } from "@/components/parte-diario/ParteDiarioHomeView";
import { ParteDiarioListView } from "@/components/parte-diario/ParteDiarioListView";
import { ParteDiarioFormView } from "@/components/parte-diario/ParteDiarioFormView";
import { ParteDiarioAdminView } from "@/components/parte-diario/ParteDiarioAdminView";
import { MecanicoObservacionesView } from "@/components/parte-diario/MecanicoObservacionesView";
import { MecanicoMantenimientoForm } from "@/components/parte-diario/MecanicoMantenimientoForm";
import { CargaCombustibleRepartidorDialog } from "@/components/parte-diario/CargaCombustibleRepartidorDialog";
import { DeleteConfirmDialog } from "@/components/shared/DeleteConfirmDialog";
import { useObservacionesMaquina } from "@/hooks/useObservacionesMaquina";
import type { ObservacionMaquina } from "@/hooks/useObservacionesMaquina";
import { useMantenimientos, type MantenimientoWithRelations } from "@/hooks/useMantenimientos";
import { useServiceAlerts } from "@/hooks/useServiceAlerts";


type RolPersonal = 'maquinista' | 'chofer' | 'capataz' | 'mecanico' | 'sereno' | 'topografo' | 'ayudante' | 'administrativo' | 'repartidor_calecita';

const ROL_LABELS: Record<RolPersonal, string> = {
  maquinista: 'Maquinista',
  chofer: 'Chofer',
  capataz: 'Capataz',
  mecanico: 'Mecánico',
  sereno: 'Sereno',
  topografo: 'Topógrafo',
  ayudante: 'Ayudante',
  administrativo: 'Administrativo',
  repartidor_calecita: 'Repartidor Calecita',
};

type ViewMode = 'home' | 'form' | 'list' | 'alerts' | 'mantenimiento';

const SERGIO_USER_ID = "c92028bd-dd42-416d-8892-f00b5ef90f8f";

const ParteDiario = () => {
  const navigate = useNavigate();
  const { user, role, loading: loadingAuth } = useAuth();
  const { empleado, rolPersonal, loading: loadingEmpleado } = useEmpleadoProfile();
  const { 
    partes = [], 
    partesHoy = [],
    borradorHoy,
    partesCompletadosHoy = [],
    saveDraft, 
    completeParte, 
    discardDraft,
    isSaving,
    isDeleting,
    isLoading: loadingPartes,
  } = useParteDiario();
  const { obras: obrasFromDB = [] } = useObras();
  const { maquinarias: maquinariasFromDB = [] } = useMaquinarias();
  const { pendientes: alertasPendientes } = useObservacionesMaquina();
  const { mantenimientos, deleteMantenimiento } = useMantenimientos();
  const { alerts: serviceAlerts } = useServiceAlerts();


  // Offline cache: save when we have fresh data, fall back to cache when empty
  useEffect(() => {
    if (obrasFromDB.length > 0) saveToOfflineCache('obras', obrasFromDB);
  }, [obrasFromDB]);
  useEffect(() => {
    if (maquinariasFromDB.length > 0) saveToOfflineCache('maquinarias', maquinariasFromDB);
  }, [maquinariasFromDB]);

  const obras = obrasFromDB.length > 0
    ? obrasFromDB
    : (loadFromOfflineCache<typeof obrasFromDB>('obras') ?? []);
  const maquinarias = maquinariasFromDB.length > 0
    ? maquinariasFromDB
    : (loadFromOfflineCache<typeof maquinariasFromDB>('maquinarias') ?? []);

  const { data: personalFromDB = [] } = useQuery({
    queryKey: ['personal_selector'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("personal_selector" as any)
        .select("id, nombre, apellido, legajo, rol")
        .eq("activo", true)
        .order("apellido");
      if (error) throw error;
      return (data || []) as unknown as { id: string; nombre: string | null; apellido: string | null; legajo: string | null; rol: string | null }[];
    },
  });

  // Offline cache for personal selector
  useEffect(() => {
    if (personalFromDB.length > 0) saveToOfflineCache('personal_selector', personalFromDB);
  }, [personalFromDB]);

  const personal = personalFromDB.length > 0
    ? personalFromDB
    : (loadFromOfflineCache<typeof personalFromDB>('personal_selector') ?? []);
  const [view, setView] = useState<ViewMode>('home');
  const [editingParte, setEditingParte] = useState<ParteDiarioType | null>(null);
  const [showEntregaDialog, setShowEntregaDialog] = useState(false);
  const [editingCarga, setEditingCarga] = useState<any>(null);
  const [deletingCarga, setDeletingCarga] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [obsPreload, setObsPreload] = useState<ObservacionMaquina | null>(null);
  const [editingMantenimiento, setEditingMantenimiento] = useState<MantenimientoWithRelations | null>(null);
  const [deletingMantenimiento, setDeletingMantenimiento] = useState<MantenimientoWithRelations | null>(null);
  const [preloadMaquinariaId, setPreloadMaquinariaId] = useState<string | undefined>(undefined);
  const [selectedDateMec, setSelectedDateMec] = useState<Date>(new Date());


  // todayStr needed by both repartidor and mechanic (memoized: stable per mount)
  const todayStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  const mantenimientosPendientes = useMemo(() => {
    return mantenimientos.filter(m => m.estado === 'pendiente');
  }, [mantenimientos]);

  // Mechanic date nav
  const selectedDateMecStr = useMemo(() => {
    return `${selectedDateMec.getFullYear()}-${String(selectedDateMec.getMonth() + 1).padStart(2, '0')}-${String(selectedDateMec.getDate()).padStart(2, '0')}`;
  }, [selectedDateMec]);
  const isTodayMec = selectedDateMecStr === todayStr;

  const mantenimientosDia = useMemo(() => {
    if (!empleado) return [];
    return mantenimientos.filter(m => m.tecnico_id === empleado.id && m.fecha === selectedDateMecStr);
  }, [mantenimientos, empleado, selectedDateMecStr]);

  const handlePrevDayMec = useCallback(() => {
    setSelectedDateMec(prev => {
      const d = new Date(prev);
      d.setDate(d.getDate() - 1);
      return d;
    });
  }, []);

  const handleNextDayMec = useCallback(() => {
    setSelectedDateMec(prev => {
      const d = new Date(prev);
      d.setDate(d.getDate() + 1);
      const today = new Date();
      const todayLocal = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      const dLocal = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      return dLocal > todayLocal ? prev : d;
    });
  }, []);

  const rol = rolPersonal as RolPersonal | null;
  const isAdmin = role === 'admin';
  const isRepartidor = rol === 'repartidor_calecita' || user?.id === SERGIO_USER_ID;
  const isMecanico = rol === 'mecanico' || rol === 'ayudante';

  // For repartidor: query by repartidor_id to get all their loads
  const { 
    cargas: cargasRepartidor, 
    totalLitros,
    createCarga, 
    updateCarga,
    deleteCarga,
    isCreating: isCreatingCarga,
    isUpdating: isUpdatingCarga,
    isDeleting: isDeletingCarga,
  } = useCargasRepartidor(null, isRepartidor ? empleado?.id : null);

  // Filter deliveries by selected date (using local date to avoid UTC timezone bugs)
  const selectedDateStr = useMemo(() => {
    return `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
  }, [selectedDate]);
  const isToday = selectedDateStr === todayStr;

  const cargasFiltered = useMemo(() => {
    return cargasRepartidor.filter(c => c.fecha === selectedDateStr);
  }, [cargasRepartidor, selectedDateStr]);

  const totalLitrosFiltered = useMemo(() => {
    return cargasFiltered.reduce((sum, c) => sum + (c.litros || 0), 0);
  }, [cargasFiltered]);

  const handlePrevDay = useCallback(() => {
    setSelectedDate(prev => {
      const d = new Date(prev);
      d.setDate(d.getDate() - 1);
      return d;
    });
  }, []);

  const handleNextDay = useCallback(() => {
    setSelectedDate(prev => {
      const d = new Date(prev);
      d.setDate(d.getDate() + 1);
      const today = new Date();
      const todayLocal = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      const dLocal = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      return dLocal > todayLocal ? prev : d;
    });
  }, []);

  // Loading state (evitar "flicker" en admin y en refreshes silenciosos)
  if (loadingAuth) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Admin/Capataz view - show all partes
  if (isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <TopNavbar />
        <main className="container mx-auto px-4 py-4">
          <ParteDiarioAdminView />
        </main>
      </div>
    );
  }

  // Para roles no-admin, esperamos el perfil de empleado solo si aún no existe
  if (loadingEmpleado && !empleado) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // No profile found
  if (!empleado) {
    return (
      <div className="min-h-screen bg-background">
        <TopNavbar />
        <main className="container mx-auto px-4 py-8">
          <Card className="max-w-md mx-auto">
            <CardContent className="pt-8 text-center space-y-4">
              <AlertCircle className="w-16 h-16 text-amber-500 mx-auto" />
              <h2 className="text-xl font-bold">Perfil no encontrado</h2>
              <p className="text-muted-foreground">
                Tu cuenta no está vinculada a un empleado. Contacta al administrador.
              </p>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const handleNewParte = () => {
    setEditingParte(null);
    setView('form');
  };

  const handleContinueDraft = () => {
    setEditingParte(borradorHoy);
    setView('form');
  };

  const handleEditCompletado = (parte: ParteDiarioType) => {
    setEditingParte(parte);
    setView('form');
  };

  const handleDiscardDraft = async () => {
    await discardDraft();
  };

  const handleViewList = () => {
    setView('list');
  };

  const handleBack = () => {
    setEditingParte(null);
    setObsPreload(null);
    setView('home');
  };

  const handleEditParte = (parte: ParteDiarioType) => {
    setEditingParte(parte);
    setView('form');
  };

  const handleSaveDraft = async (data: any) => {
    try {
      await saveDraft(data, editingParte?.id);
      handleBack();
    } catch (error) {
      console.error('Error saving draft:', error);
    }
  };

  const handleComplete = async (data: any) => {
    try {
      await completeParte(data, editingParte?.id);
      handleBack();
    } catch (error) {
      console.error('Error completing parte:', error);
    }
  };

  const handleGoToAlerts = () => {
    setView('alerts');
  };

  const handleGoToMantenimiento = (obs?: ObservacionMaquina) => {
    setObsPreload(obs || null);
    setPreloadMaquinariaId(undefined);
    setView('mantenimiento');
  };

  const handleServiceAlertClick = (maquinariaId: string) => {
    setObsPreload(null);
    setEditingMantenimiento(null);
    setPreloadMaquinariaId(maquinariaId);
    setView('mantenimiento');
  };

  const handleBackFromMantenimiento = () => {
    setObsPreload(null);
    setEditingMantenimiento(null);
    setPreloadMaquinariaId(undefined);
    setView('home');
  };

  const handleMantenimientoSuccess = () => {
    setObsPreload(null);
    setEditingMantenimiento(null);
    setPreloadMaquinariaId(undefined);
    setView('home');
  };

  const handleRetomarMantenimiento = (mant: MantenimientoWithRelations) => {
    setEditingMantenimiento(mant);
    setObsPreload(null);
    setPreloadMaquinariaId(undefined);
    setView('mantenimiento');
  };


  return (
    <div className="min-h-screen bg-background">
      <TopNavbar />
      
      <main className="container mx-auto px-4 py-4 max-w-lg">
        {view === 'home' && (
          <>
            <ParteDiarioHomeView
              borradorHoy={borradorHoy}
              partesCompletadosHoy={partesCompletadosHoy}
              nombreEmpleado={empleado.nombreCompleto}
              rolLabel={rol ? ROL_LABELS[rol] : 'Empleado'}
              isRepartidor={isRepartidor}
              isMecanico={isMecanico}
              alertasPendientesCount={alertasPendientes.length}
              entregasHoyCount={cargasFiltered.length}
              cargasHoy={cargasFiltered}
              totalLitrosHoy={totalLitrosFiltered}
              isDeletingCarga={isDeletingCarga}
              selectedDate={selectedDate}
              isToday={isToday}
              onPrevDay={handlePrevDay}
              onNextDay={handleNextDay}
              onNewParte={handleNewParte}
              onViewList={handleViewList}
              onContinueDraft={handleContinueDraft}
              onDiscardDraft={handleDiscardDraft}
              onEditCompletado={handleEditCompletado}
              onRegistrarEntrega={() => { setEditingCarga(null); setShowEntregaDialog(true); }}
              onEditCarga={(carga) => { setEditingCarga(carga); setShowEntregaDialog(true); }}
              onDeleteCarga={(carga) => setDeletingCarga(carga)}
              onVerAlertas={handleGoToAlerts}
              onNuevoMantenimiento={() => handleGoToMantenimiento()}
              mantenimientosPendientes={mantenimientosPendientes}
              serviceAlerts={serviceAlerts}
              onServiceAlertClick={handleServiceAlertClick}
              onRetomarMantenimiento={handleRetomarMantenimiento}

              isDiscarding={isDeleting}
              selectedDateMecanico={selectedDateMec}
              isTodayMecanico={isTodayMec}
              mantenimientosDia={mantenimientosDia}
              onPrevDayMec={handlePrevDayMec}
              onNextDayMec={handleNextDayMec}
              onEditMantenimiento={handleRetomarMantenimiento}
              onDeleteMantenimiento={(mant) => setDeletingMantenimiento(mant)}
              showRemitosButton={user?.id === SERGIO_USER_ID}
              onIrRemitos={() => navigate('/remitos')}
            />
            {isMecanico && (
              <DeleteConfirmDialog
                open={!!deletingMantenimiento}
                onOpenChange={(open) => { if (!open) setDeletingMantenimiento(null); }}
                onConfirm={async () => {
                  if (deletingMantenimiento) {
                    await deleteMantenimiento(deletingMantenimiento.id);
                    setDeletingMantenimiento(null);
                  }
                }}
                title="¿Eliminar mantenimiento?"
                description="Se eliminará permanentemente este registro de mantenimiento."
              />
            )}
            {isRepartidor && (
              <>
                <CargaCombustibleRepartidorDialog
                  open={showEntregaDialog}
                  onOpenChange={setShowEntregaDialog}
                  carga={editingCarga}
                  fechaParte={todayStr}
                  personal={personal}
                  maquinarias={maquinarias}
                  obras={obras}
                  onSave={async (data) => {
                    if (editingCarga) {
                      await updateCarga({ id: editingCarga.id, ...data });
                    } else {
                      await createCarga({
                        ...data,
                        repartidor_id: empleado.id,
                      });
                    }
                  }}
                  isSaving={isCreatingCarga || isUpdatingCarga}
                />
                <DeleteConfirmDialog
                  open={!!deletingCarga}
                  onOpenChange={(open) => { if (!open) setDeletingCarga(null); }}
                  onConfirm={async () => {
                    if (deletingCarga) {
                      await deleteCarga(deletingCarga.id);
                      setDeletingCarga(null);
                    }
                  }}
                  title="¿Eliminar entrega?"
                  description="Se eliminará permanentemente esta entrega de combustible."
                />
              </>
            )}
          </>
        )}

        {view === 'alerts' && (
          <MecanicoObservacionesView
            onBack={handleBack}
            onCrearMantenimiento={(obs) => handleGoToMantenimiento(obs)}
            nombreMecanico={empleado.nombreCompleto}
          />
        )}

        {view === 'mantenimiento' && (
          <MecanicoMantenimientoForm
            onBack={handleBackFromMantenimiento}
            onSuccess={handleMantenimientoSuccess}
            obsPreload={obsPreload}
            nombreMecanico={empleado.nombreCompleto}
            empleadoId={empleado.id}
            editData={editingMantenimiento}
            preloadMaquinariaId={preloadMaquinariaId}
          />
        )}


        {view === 'list' && (
          <ParteDiarioListView
            partes={partes}
            onBack={handleBack}
            onEdit={handleEditParte}
          />
        )}

        {view === 'form' && (
          <ParteDiarioFormView
            parte={editingParte}
            empleadoId={empleado.id}
            rol={rol}
            obras={obras}
            maquinarias={maquinarias}
            personal={personal}
            onBack={handleBack}
            onSaveDraft={handleSaveDraft}
            onComplete={handleComplete}
            isSaving={isSaving}
          />
        )}
      </main>
    </div>
  );
};

export default ParteDiario;
