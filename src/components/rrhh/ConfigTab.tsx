import { useEffect, useState } from "react";
import { Plus, Trash2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import {
  useJornada, useUpsertJornada, useFeriados, useCreateFeriado, useDeleteFeriado,
} from "@/hooks/useRrhh";

const DIAS = [
  { key: "lunes", label: "Lunes" },
  { key: "martes", label: "Martes" },
  { key: "miercoles", label: "Miércoles" },
  { key: "jueves", label: "Jueves" },
  { key: "viernes", label: "Viernes" },
  { key: "sabado", label: "Sábado" },
  { key: "domingo", label: "Domingo" },
] as const;

export function ConfigTab() {
  const { data: jornada } = useJornada();
  const upsert = useUpsertJornada();
  const { data: feriados = [] } = useFeriados();
  const crearFeriado = useCreateFeriado();
  const borrarFeriado = useDeleteFeriado();

  const [horas, setHoras] = useState<Record<string, number>>({
    lunes: 8, martes: 8, miercoles: 8, jueves: 8, viernes: 8, sabado: 4, domingo: 0,
  });
  const [fecha, setFecha] = useState("");
  const [descripcion, setDescripcion] = useState("");

  useEffect(() => {
    if (jornada) {
      setHoras({
        lunes: Number(jornada.lunes), martes: Number(jornada.martes), miercoles: Number(jornada.miercoles),
        jueves: Number(jornada.jueves), viernes: Number(jornada.viernes),
        sabado: Number(jornada.sabado), domingo: Number(jornada.domingo),
      });
    }
  }, [jornada]);

  const totalSemanal = Object.values(horas).reduce((s, h) => s + Number(h || 0), 0);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader><CardTitle className="text-base">Jornada habitual</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {DIAS.map((d) => (
              <div key={d.key} className="space-y-1.5">
                <Label>{d.label}</Label>
                <Input
                  type="number" step="0.5" min="0"
                  value={horas[d.key]}
                  onChange={(e) => setHoras({ ...horas, [d.key]: Number(e.target.value) })}
                />
              </div>
            ))}
          </div>
          <p className="text-sm text-muted-foreground">Total semanal: <strong>{totalSemanal} hs</strong></p>
          <Button
            className="gap-2"
            disabled={upsert.isPending}
            onClick={() => upsert.mutate({ id: jornada?.id, ...(horas as any) })}
          >
            <Save className="w-4 h-4" /> Guardar jornada
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Feriados</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-2">
            <div className="space-y-1.5">
              <Label>Fecha</Label>
              <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
            </div>
            <div className="space-y-1.5 flex-1 min-w-[160px]">
              <Label>Descripción</Label>
              <Input value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Feriado nacional" />
            </div>
            <Button
              className="gap-2"
              disabled={!fecha || crearFeriado.isPending}
              onClick={() => {
                crearFeriado.mutate({ fecha, descripcion });
                setFecha(""); setDescripcion("");
              }}
            >
              <Plus className="w-4 h-4" /> Agregar
            </Button>
          </div>

          <div className="space-y-1.5 max-h-72 overflow-y-auto">
            {feriados.length === 0 && <p className="text-sm text-muted-foreground">Sin feriados cargados</p>}
            {feriados.map((f) => (
              <div key={f.id} className="flex items-center justify-between rounded-md border px-3 py-1.5">
                <span className="text-sm">
                  <strong>{formatDate(f.fecha)}</strong>{f.descripcion ? ` · ${f.descripcion}` : ""}
                </span>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"
                  onClick={() => borrarFeriado.mutate(f.id)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
