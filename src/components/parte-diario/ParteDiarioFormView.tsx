import { useState, useEffect, useMemo, useCallback } from "react";
import { es } from "date-fns/locale";
import { format, parseISO } from "date-fns";
import { useFormDraftPersistence } from "@/hooks/useFormDraftPersistence";
import { ArrowLeft, Calendar, Clock, Fuel, ClipboardCheck, FileEdit, CheckCircle, Loader2, Users, Search, X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { ParteDiario, ParteDiarioInsert } from "@/hooks/useParteDiario";

type RolPersonal = 'maquinista' | 'chofer' | 'capataz' | 'mecanico' | 'sereno' | 'topografo' | 'ayudante' | 'administrativo' | 'repartidor_calecita';

interface PersonalItem {
  id: string;
  nombre: string | null;
  apellido: string | null;
  legajo: string | null;
}

interface ParteDiarioFormViewProps {
  parte: ParteDiario | null;
  empleadoId: string;
  rol: RolPersonal | null;
  obras: Array<{ id: string; nombre: string; estado: string }>;
  maquinarias: Array<{ id: string; codigo: string | null; tipo: string; patente: string | null }>;
  personal: PersonalItem[];
  onBack: () => void;
  onSaveDraft: (data: ParteDiarioInsert) => Promise<void>;
  onComplete: (data: ParteDiarioInsert) => Promise<void>;
  isSaving: boolean;
}

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

export const ParteDiarioFormView = ({
  parte,
  empleadoId,
  rol,
  obras,
  maquinarias,
  personal,
  onBack,
  onSaveDraft,
  onComplete,
  isSaving,
}: ParteDiarioFormViewProps) => {
  const [savingType, setSavingType] = useState<'draft' | 'complete' | null>(null);
  const [searchAusencia, setSearchAusencia] = useState('');
  const [showObsError, setShowObsError] = useState(false);
  const [usoMaquina, setUsoMaquina] = useState(false);
  
  const defaultFormData = useMemo(() => ({
    fecha: format(new Date(), 'yyyy-MM-dd'),
    obra_id: '',
    maquinaria_id: '',
    hora_entrada: '',
    hora_salida: '',
    horometro_inicio: '',
    horometro_fin: '',
    combustible: '',
    cantidad_viajes: '',
    cantidad_movimiento_interno: '',
    estado_maquina: 'OK' as 'OK' | 'OBSERVACION',
    observacion_maquina: '',
    check_filtro_aire: false,
    check_aceite_motor: false,
    check_aceite_hidraulico: false,
    check_liquido_refrigerante: false,
    check_uria: false,
    novedades: '',
    ausencias: [] as string[],
    tareas: '',
    observaciones_inconvenientes: '',
    km_camion: '',
  }), []);

  const [formData, setFormData] = useState(defaultFormData);

  // Draft persistence for new partes (auto-save to localStorage)
  const { clearDraft } = useFormDraftPersistence({
    empleadoId,
    formData,
    setFormData,
    defaultData: defaultFormData,
    isEditing: !!parte,
  });

  // Load existing parte data
  useEffect(() => {
    if (parte) {
      setFormData({
        fecha: parte.fecha,
        obra_id: parte.obra_id || '',
        maquinaria_id: parte.maquinaria_id || '',
        hora_entrada: parte.hora_entrada || '',
        hora_salida: parte.hora_salida || '',
        horometro_inicio: parte.horometro_inicio?.toString() || '',
        horometro_fin: parte.horometro_fin?.toString() || '',
        combustible: parte.combustible?.toString() || '',
        cantidad_viajes: parte.cantidad_viajes?.toString() || '',
        cantidad_movimiento_interno: parte.cantidad_movimiento_interno?.toString() || '',
        estado_maquina: (parte.estado_maquina as 'OK' | 'OBSERVACION') || 'OK',
        observacion_maquina: parte.observacion_maquina || '',
        check_filtro_aire: parte.check_filtro_aire || false,
        check_aceite_motor: parte.check_aceite_motor || false,
        check_aceite_hidraulico: parte.check_aceite_hidraulico || false,
        check_liquido_refrigerante: parte.check_liquido_refrigerante || false,
        check_uria: parte.check_uria || false,
        // New fields
        novedades: parte.novedades || '',
        ausencias: parte.ausencias || [],
        tareas: parte.tareas || '',
        observaciones_inconvenientes: parte.observaciones_inconvenientes || '',
        km_camion: parte.km_camion?.toString() || '',
      });
      if (parte.maquinaria_id) setUsoMaquina(true);
    }
  }, [parte]);

  // Role-based field visibility
  const isCapataz = rol === 'capataz';
  const isMecanicoAyudante = rol === 'mecanico' || rol === 'ayudante';
  const isMaquinista = rol === 'maquinista';
  const isChofer = rol === 'chofer';
  const isSerenoTopografo = rol === 'sereno' || rol === 'topografo';
  const isRepartidorCalecita = rol === 'repartidor_calecita';

  // Hook for repartidor fuel loads - always called but only used when needed



  // Capataz puede activar opcionalmente uso de máquina
  const capatazUsaMaquina = isCapataz && usoMaquina;

  // Fields visibility
  const showObraField = isMaquinista || isCapataz || isMecanicoAyudante || isSerenoTopografo;
  const showMaquinaField = isMaquinista || isChofer || capatazUsaMaquina;
  const showHorometro = isMaquinista || capatazUsaMaquina;
  const showViajes = isChofer;
  const showCombustible = isMaquinista || isChofer || capatazUsaMaquina;
  const showEstadoMaquina = isMaquinista || isChofer || capatazUsaMaquina;
  const showChecklist = isMaquinista || isChofer || capatazUsaMaquina;
  const showNovedades = isCapataz || isRepartidorCalecita;
  const showAusencias = isCapataz;
  const showTareas = isMecanicoAyudante;

  const checklistItems = [
    { id: 'check_filtro_aire', label: 'Revisión filtro de aire', roles: ['maquinista'] },
    { id: 'check_aceite_motor', label: 'Control aceite motor', roles: ['maquinista', 'chofer'] },
    { id: 'check_aceite_hidraulico', label: 'Control aceite hidráulico', roles: ['maquinista'] },
    { id: 'check_liquido_refrigerante', label: 'Control líquido refrigerante', roles: ['maquinista', 'chofer'] },
    { id: 'check_uria', label: 'Control Uría', roles: ['chofer'] },
  ].filter(item => {
    if (capatazUsaMaquina) return ['check_filtro_aire', 'check_aceite_motor', 'check_aceite_hidraulico', 'check_liquido_refrigerante'].includes(item.id);
    return rol && item.roles.includes(rol);
  });

  // Filter personal for ausencias (exclude current employee)
  const personalForAusencias = useMemo(() => {
    return personal.filter(p => p.id !== empleadoId);
  }, [personal, empleadoId]);

  // Debounce the absence search input (200ms) to avoid filtering on every keystroke
  const [debouncedSearchAusencia, setDebouncedSearchAusencia] = useState('');
  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedSearchAusencia(searchAusencia), 200);
    return () => window.clearTimeout(id);
  }, [searchAusencia]);

  // Filtered personal based on (debounced) search
  const filteredPersonalForAusencias = useMemo(() => {
    if (!debouncedSearchAusencia.trim()) return personalForAusencias;
    const searchLower = debouncedSearchAusencia.toLowerCase().trim();
    return personalForAusencias.filter(p => {
      const nombre = (p.nombre || '').toLowerCase();
      const apellido = (p.apellido || '').toLowerCase();
      const legajo = (p.legajo || '').toLowerCase();
      const fullName = `${apellido} ${nombre}`.toLowerCase();
      return nombre.includes(searchLower) || 
             apellido.includes(searchLower) || 
             legajo.includes(searchLower) ||
             fullName.includes(searchLower);
    });
  }, [personalForAusencias, debouncedSearchAusencia]);

  // Get selected employees info for display
  const selectedAusenciasInfo = useMemo(() => {
    return formData.ausencias
      .map(id => personalForAusencias.find(p => p.id === id))
      .filter(Boolean) as typeof personalForAusencias;
  }, [formData.ausencias, personalForAusencias]);

  // Generate combobox options for obras (only active)
  const obraOptions: ComboboxOption[] = useMemo(() => {
    return obras
      .filter(o => o.estado === 'activa')
      .map(obra => ({
        value: obra.id,
        label: obra.nombre,
        searchValue: obra.nombre.toLowerCase(),
      }));
  }, [obras]);

  // Generate combobox options for maquinarias
  const maquinariaOptions: ComboboxOption[] = useMemo(() => {
    return maquinarias.map(maq => {
      const label = `${maq.codigo || maq.tipo}${maq.patente ? ` - ${maq.patente}` : ''}`;
      return {
        value: maq.id,
        label,
        searchValue: `${maq.codigo || ''} ${maq.tipo} ${maq.patente || ''}`.toLowerCase(),
      };
    });
  }, [maquinarias]);

  const handleChange = (field: string, value: string | boolean | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleAusencia = (empleadoIdToToggle: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      ausencias: checked 
        ? [...prev.ausencias, empleadoIdToToggle]
        : prev.ausencias.filter(id => id !== empleadoIdToToggle)
    }));
  };

  const buildParteData = (): ParteDiarioInsert => {
    return {
      fecha: formData.fecha,
      personal_id: empleadoId,
      obra_id: formData.obra_id || null,
      maquinaria_id: formData.maquinaria_id || null,
      hora_entrada: formData.hora_entrada || null,
      hora_salida: formData.hora_salida || null,
      horometro_inicio: parseFloat(formData.horometro_inicio) || 0,
      horometro_fin: parseFloat(formData.horometro_fin) || 0,
      combustible: parseFloat(formData.combustible) || 0,
      cantidad_viajes: parseInt(formData.cantidad_viajes) || 0,
      cantidad_movimiento_interno: parseInt(formData.cantidad_movimiento_interno) || 0,
      estado_maquina: showEstadoMaquina ? formData.estado_maquina : null,
      observacion_maquina: formData.estado_maquina === 'OBSERVACION' ? formData.observacion_maquina : null,
      check_filtro_aire: formData.check_filtro_aire,
      check_aceite_motor: formData.check_aceite_motor,
      check_aceite_hidraulico: formData.check_aceite_hidraulico,
      check_liquido_refrigerante: formData.check_liquido_refrigerante,
      check_uria: formData.check_uria,
      // New role-specific fields
      novedades: showNovedades ? formData.novedades || null : null,
      ausencias: isCapataz && formData.ausencias.length > 0 ? formData.ausencias : null,
      tareas: isMecanicoAyudante ? formData.tareas || null : null,
      observaciones_inconvenientes: formData.observaciones_inconvenientes || null,
      km_camion: isChofer ? parseFloat(formData.km_camion) || 0 : 0,
    };
  };

  const validateForComplete = (): boolean => {
    if (showEstadoMaquina && formData.maquinaria_id && formData.estado_maquina === 'OBSERVACION' && !formData.observacion_maquina.trim()) {
      setShowObsError(true);
      toast.error('Debés describir la observación de la máquina');
      return false;
    }
    if (showHorometro) {
      const inicio = parseFloat(formData.horometro_inicio) || 0;
      const fin = parseFloat(formData.horometro_fin) || 0;
      if (fin > 0 && fin < inicio) {
        toast.error('El horómetro fin debe ser mayor al inicio');
        return false;
      }
    }
    if (isChofer && !(parseFloat(formData.km_camion) > 0)) {
      toast.error('Debés completar los KM del camión');
      return false;
    }
    return true;
  };

  const handleSaveDraft = async () => {
    if (savingType !== null || isSaving) return;
    
    setSavingType('draft');
    const timeout = setTimeout(() => {
      setSavingType(null);
      toast.error('La operación tardó demasiado. Intenta nuevamente.');
    }, 15000);
    try {
      await onSaveDraft(buildParteData());
      clearDraft();
    } catch {
      // Error already handled by hook
    } finally {
      clearTimeout(timeout);
      setSavingType(null);
    }
  };

  const handleComplete = async () => {
    if (savingType !== null || isSaving) return;
    
    if (!validateForComplete()) return;
    setSavingType('complete');
    const timeout = setTimeout(() => {
      setSavingType(null);
      toast.error('La operación tardó demasiado. Intenta nuevamente.');
    }, 15000);
    try {
      await onComplete(buildParteData());
      clearDraft();
    } catch {
      // Error already handled by hook
    } finally {
      clearTimeout(timeout);
      setSavingType(null);
    }
  };

  return (
    <div className="pb-28">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-xl font-bold text-foreground">
            {parte ? 'Editar Parte' : 'Nuevo Parte'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {format(parseISO(formData.fecha), "EEEE d 'de' MMMM", { locale: es })}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Fecha */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-primary" />
              <div className="flex-1">
                <Label htmlFor="fecha" className="text-sm text-muted-foreground">Fecha</Label>
                <Input
                  id="fecha"
                  type="date"
                  value={formData.fecha}
                  onChange={(e) => handleChange('fecha', e.target.value)}
                  className="h-12 text-lg border-0 p-0 focus-visible:ring-0"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Rol (automático) */}
        <Card>
          <CardContent className="pt-4">
            <Label className="text-sm text-muted-foreground mb-2 block">👤 Rol</Label>
            <div className="h-14 flex items-center text-lg font-medium text-foreground bg-muted/30 rounded-md px-3">
              {rol ? ROL_LABELS[rol] : 'Empleado'}
            </div>
          </CardContent>
        </Card>

        {/* Obra */}
        {showObraField && (
          <Card>
            <CardContent className="pt-4">
              <Label className="text-sm text-muted-foreground mb-2 block">🏗️ Obra</Label>
              <Combobox
                options={obraOptions}
                value={formData.obra_id}
                onValueChange={(v) => handleChange('obra_id', v)}
                placeholder="Seleccionar obra..."
                searchPlaceholder="Buscar obra..."
                emptyText="No se encontró la obra"
                className="h-14 text-lg"
              />
            </CardContent>
          </Card>
        )}

        {/* Capataz: ¿usaste una máquina? */}
        {isCapataz && (
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <Label className="text-sm font-medium block mb-1">🚜 ¿Usaste una máquina o camión hoy?</Label>
                  <p className="text-xs text-muted-foreground">
                    Activalo si además de tus tareas de capataz operaste una máquina.
                  </p>
                </div>
                <Switch
                  checked={usoMaquina}
                  onCheckedChange={setUsoMaquina}
                />
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-5 h-5 text-primary" />
              <Label className="text-sm text-muted-foreground">Horarios</Label>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="hora_entrada" className="text-xs text-muted-foreground">Entrada</Label>
                <Input
                  id="hora_entrada"
                  type="time"
                  value={formData.hora_entrada}
                  onChange={(e) => handleChange('hora_entrada', e.target.value)}
                  className="h-14 text-lg"
                />
              </div>
              <div>
                <Label htmlFor="hora_salida" className="text-xs text-muted-foreground">Salida</Label>
                <Input
                  id="hora_salida"
                  type="time"
                  value={formData.hora_salida}
                  onChange={(e) => handleChange('hora_salida', e.target.value)}
                  className="h-14 text-lg"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Máquina/Camión */}
        {showMaquinaField && (
          <Card>
            <CardContent className="pt-4">
              <Label className="text-sm text-muted-foreground mb-2 block">
                🚜 {rol === 'chofer' ? 'Camión' : 'Máquina'}
              </Label>
              <Combobox
                options={maquinariaOptions}
                value={formData.maquinaria_id}
                onValueChange={(v) => handleChange('maquinaria_id', v)}
                placeholder="Seleccionar..."
                searchPlaceholder={`Buscar ${rol === 'chofer' ? 'camión' : 'máquina'}...`}
                emptyText="No se encontró"
                className="h-14 text-lg"
              />
            </CardContent>
          </Card>
        )}

        {/* Horómetro */}
        {showHorometro && (
          <Card>
            <CardContent className="pt-4">
              <Label className="text-sm text-muted-foreground mb-3 block">📊 Horómetro</Label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="horometro_inicio" className="text-xs text-muted-foreground">Inicio</Label>
                  <Input
                    id="horometro_inicio"
                    type="number"
                    inputMode="decimal"
                    placeholder="0"
                    value={formData.horometro_inicio}
                    onChange={(e) => handleChange('horometro_inicio', e.target.value)}
                    className="h-14 text-lg"
                  />
                </div>
                <div>
                  <Label htmlFor="horometro_fin" className="text-xs text-muted-foreground">Fin</Label>
                  <Input
                    id="horometro_fin"
                    type="number"
                    inputMode="decimal"
                    placeholder="0"
                    value={formData.horometro_fin}
                    onChange={(e) => handleChange('horometro_fin', e.target.value)}
                    className="h-14 text-lg"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Combustible */}
        {showCombustible && (
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-2">
                <Fuel className="w-5 h-5 text-primary" />
                <Label htmlFor="combustible" className="text-sm text-muted-foreground">Combustible (litros)</Label>
              </div>
              <Input
                id="combustible"
                type="number"
                inputMode="decimal"
                placeholder="0"
                value={formData.combustible}
                onChange={(e) => handleChange('combustible', e.target.value)}
                className="h-14 text-lg"
              />
            </CardContent>
          </Card>
        )}

        {/* Viajes */}
        {showViajes && (
          <Card>
            <CardContent className="pt-4">
              <Label className="text-sm text-muted-foreground mb-3 block">🚚 Viajes</Label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="cantidad_viajes" className="text-xs text-muted-foreground">Cant. Viajes</Label>
                  <Input
                    id="cantidad_viajes"
                    type="number"
                    inputMode="numeric"
                    placeholder="0"
                    value={formData.cantidad_viajes}
                    onChange={(e) => handleChange('cantidad_viajes', e.target.value)}
                    className="h-14 text-lg"
                  />
                </div>
                <div>
                  <Label htmlFor="cantidad_movimiento_interno" className="text-xs text-muted-foreground">Mov. Interno</Label>
                  <Input
                    id="cantidad_movimiento_interno"
                    type="number"
                    inputMode="numeric"
                    placeholder="0"
                    value={formData.cantidad_movimiento_interno}
                    onChange={(e) => handleChange('cantidad_movimiento_interno', e.target.value)}
                    className="h-14 text-lg"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* KM Camión (solo choferes) */}
        {isChofer && (
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">📏</span>
                <Label htmlFor="km_camion" className="text-sm text-muted-foreground">KM Camión <span className="text-destructive">*</span></Label>
              </div>
              <Input
                id="km_camion"
                type="number"
                inputMode="decimal"
                placeholder="0"
                value={formData.km_camion}
                onChange={(e) => handleChange('km_camion', e.target.value)}
                className="h-14 text-lg"
              />
            </CardContent>
          </Card>
        )}

        {/* Estado Máquina */}
        {showEstadoMaquina && (
          <Card>
            <CardContent className="pt-4">
              <Label className="text-sm text-muted-foreground mb-3 block">
                🔧 Estado {rol === 'chofer' ? 'Camión' : 'Máquina'}
              </Label>
              <RadioGroup
                value={formData.estado_maquina}
                onValueChange={(v) => handleChange('estado_maquina', v)}
                className="grid grid-cols-2 gap-4"
              >
                <Label
                  htmlFor="estado-ok"
                  className={cn(
                    "flex items-center justify-center h-14 rounded-xl border-2 cursor-pointer transition-all",
                    formData.estado_maquina === 'OK'
                      ? "border-green-500 bg-green-500/10 text-green-600"
                      : "border-border hover:border-green-500/50"
                  )}
                >
                  <RadioGroupItem value="OK" id="estado-ok" className="sr-only" />
                  <span className="font-semibold text-lg">✓ OK</span>
                </Label>
                <Label
                  htmlFor="estado-obs"
                  className={cn(
                    "flex items-center justify-center h-14 rounded-xl border-2 cursor-pointer transition-all",
                    formData.estado_maquina === 'OBSERVACION'
                      ? "border-amber-500 bg-amber-500/10 text-amber-600"
                      : "border-border hover:border-amber-500/50"
                  )}
                >
                  <RadioGroupItem value="OBSERVACION" id="estado-obs" className="sr-only" />
                  <span className="font-semibold">⚠ OBSERVACIÓN</span>
                </Label>
              </RadioGroup>

              {formData.estado_maquina === 'OBSERVACION' && (
                <div className="mt-4">
                  <Textarea
                    placeholder="Describa la observación de la máquina..."
                    value={formData.observacion_maquina}
                    onChange={(e) => {
                      handleChange('observacion_maquina', e.target.value);
                      if (e.target.value.trim()) setShowObsError(false);
                    }}
                    className={cn(
                      "min-h-24 text-base",
                      showObsError && "border-destructive focus-visible:ring-destructive"
                    )}
                  />
                  {showObsError && (
                    <p className="text-sm text-destructive mt-1 flex items-center gap-1">
                      <span>⚠</span> Debés escribir la observación antes de continuar
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Checklist */}
        {showChecklist && checklistItems.length > 0 && (
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-4">
                <ClipboardCheck className="w-5 h-5 text-primary" />
                <Label className="text-sm text-muted-foreground">Checklist Diario</Label>
              </div>
              <div className="space-y-3">
                {checklistItems.map(item => (
                  <Label
                    key={item.id}
                    htmlFor={item.id}
                    className={cn(
                      "flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all",
                      formData[item.id as keyof typeof formData]
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <Checkbox
                      id={item.id}
                      checked={formData[item.id as keyof typeof formData] as boolean}
                      onCheckedChange={(checked) => handleChange(item.id, !!checked)}
                      className="h-7 w-7"
                    />
                    <span className="text-base font-medium">{item.label}</span>
                  </Label>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Novedades (Capataz only) */}
        {showNovedades && (
          <Card>
            <CardContent className="pt-4">
              <Label className="text-sm text-muted-foreground mb-2 block">📝 Novedades</Label>
              <p className="text-xs text-muted-foreground mb-3">
                Describa el trabajo realizado en la obra
              </p>
              <Textarea
                placeholder="Describa todo lo que se haya hecho en la obra..."
                value={formData.novedades}
                onChange={(e) => handleChange('novedades', e.target.value)}
                className="min-h-32 text-base"
              />
            </CardContent>
          </Card>
        )}

        {/* Ausencias (Capataz only) */}
        {showAusencias && (
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-5 h-5 text-primary" />
                <Label className="text-sm text-muted-foreground">Ausencias</Label>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                Seleccione los empleados que faltaron hoy
              </p>

              {/* Selected employees badges */}
              {selectedAusenciasInfo.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {selectedAusenciasInfo.map(emp => (
                    <button
                      key={emp.id}
                      type="button"
                      onClick={() => toggleAusencia(emp.id, false)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20 transition-colors"
                    >
                      {emp.apellido}, {emp.nombre?.charAt(0)}.
                      {emp.legajo && <span className="opacity-70">#{emp.legajo}</span>}
                      <X className="w-3 h-3" />
                    </button>
                  ))}
                </div>
              )}

              {personalForAusencias.length > 0 ? (
                <>
                  {/* Search input */}
                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Buscar por nombre o legajo..."
                      value={searchAusencia}
                      onChange={(e) => setSearchAusencia(e.target.value)}
                      className="pl-9 h-11"
                    />
                    {searchAusencia && (
                      <button
                        type="button"
                        onClick={() => setSearchAusencia('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Filtered list */}
                  <ScrollArea className="h-48 border rounded-lg">
                    <div className="p-2 space-y-1">
                      {filteredPersonalForAusencias.length > 0 ? (
                        filteredPersonalForAusencias.map(emp => (
                          <Label
                            key={emp.id}
                            htmlFor={`ausencia-${emp.id}`}
                            className={cn(
                              "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                              formData.ausencias.includes(emp.id)
                                ? "border-destructive bg-destructive/10"
                                : "border-transparent hover:bg-muted/50"
                            )}
                          >
                            <Checkbox
                              id={`ausencia-${emp.id}`}
                              checked={formData.ausencias.includes(emp.id)}
                              onCheckedChange={(checked) => toggleAusencia(emp.id, !!checked)}
                              className="h-5 w-5"
                            />
                            <span className="text-sm font-medium">
                              {emp.apellido}, {emp.nombre}
                              {emp.legajo && <span className="text-muted-foreground ml-1">(#{emp.legajo})</span>}
                            </span>
                          </Label>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground p-4 text-center">
                          No se encontró "{searchAusencia}"
                        </p>
                      )}
                    </div>
                  </ScrollArea>
                </>
              ) : (
                <p className="text-sm text-muted-foreground p-4 text-center border rounded-lg">
                  No hay empleados cargados
                </p>
              )}

              {formData.ausencias.length > 0 && (
                <p className="text-xs text-muted-foreground mt-2">
                  {formData.ausencias.length} empleado(s) marcado(s) como ausente(s)
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Tareas (Mecánico/Ayudante only) */}
        {showTareas && (
          <Card>
            <CardContent className="pt-4">
              <Label className="text-sm text-muted-foreground mb-2 block">🔧 Tareas</Label>
              <p className="text-xs text-muted-foreground mb-3">
                Describa las tareas realizadas durante el día
              </p>
              <Textarea
                placeholder="Describa las tareas realizadas..."
                value={formData.tareas}
                onChange={(e) => handleChange('tareas', e.target.value)}
                className="min-h-32 text-base"
              />
            </CardContent>
          </Card>
        )}

        {/* Observaciones/Inconvenientes (TODOS) */}
        <Card>
          <CardContent className="pt-4">
            <Label className="text-sm text-muted-foreground mb-2 block">⚠️ Observaciones / Inconvenientes</Label>
            <p className="text-xs text-muted-foreground mb-3">
              Registre cualquier observación o inconveniente del día
            </p>
            <Textarea
              placeholder="Registre cualquier observación o inconveniente..."
              value={formData.observaciones_inconvenientes}
              onChange={(e) => handleChange('observaciones_inconvenientes', e.target.value)}
              className="min-h-24 text-base"
            />
          </CardContent>
        </Card>
      </div>

      {/* Sticky footer with two buttons */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur border-t border-border">
        <div className="flex gap-3 max-w-lg mx-auto">
          <Button 
            variant="outline" 
            onClick={handleSaveDraft}
            disabled={isSaving}
            className="flex-1 h-14"
          >
            {savingType === 'draft' ? (
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            ) : (
              <FileEdit className="w-5 h-5 mr-2" />
            )}
            Guardar Borrador
          </Button>
          
          <Button 
            onClick={handleComplete}
            disabled={isSaving}
            className="flex-1 h-14"
          >
            {savingType === 'complete' ? (
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            ) : (
              <CheckCircle className="w-5 h-5 mr-2" />
            )}
            Completar Parte
          </Button>
        </div>
      </div>

    </div>
  );
};
