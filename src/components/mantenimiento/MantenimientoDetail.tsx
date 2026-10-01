import { Badge } from "@/components/ui/badge";
import { Check, X } from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import { DetailRow, DetailSection } from "@/components/shared/DetailRow";
import type { MantenimientoWithRelations } from "@/hooks/useMantenimientos";
import {
  CHECKLIST_CAMBIO_ITEMS,
  CHECKLIST_CHEQUEO_ITEMS,
  ESTADO_CONFIG,
  TIPO_CONFIG,
  formatCurrency,
  isChecked,
  getLitros,
  type ChecklistCambio,
  type ChecklistChequeo,
} from "./mantenimientoConstants";

interface MantenimientoDetailProps {
  mant: MantenimientoWithRelations;
}

function ChecklistSection({ title, items, data, colorClass }: {
  title: string;
  items: readonly { key: string; label: string; hasLitros?: boolean }[];
  data: Record<string, any> | null;
  colorClass: string;
}) {
  if (!data) return null;
  const checked = items.filter(i => isChecked(data[i.key]));

  return (
    <DetailSection title={`${title} (${checked.length}/${items.length})`}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
        {items.map(item => {
          const val = data[item.key];
          const ok = isChecked(val);
          const litros = getLitros(val);
          return (
            <div key={item.key} className="flex items-center gap-2 text-sm">
              {ok ? (
                <Check className={cn("w-4 h-4 shrink-0", colorClass)} />
              ) : (
                <X className="w-4 h-4 shrink-0 text-muted-foreground/40" />
              )}
              <span className={ok ? "text-foreground" : "text-muted-foreground/60"}>
                {item.label}
                {ok && litros != null && litros > 0 && (
                  <span className="ml-1 text-muted-foreground font-medium">— {litros} lts</span>
                )}
              </span>
            </div>
          );
        })}
      </div>
    </DetailSection>
  );
}

export function MantenimientoDetail({ mant }: MantenimientoDetailProps) {
  const tipoCfg = TIPO_CONFIG[mant.tipo as keyof typeof TIPO_CONFIG];
  const estadoCfg = ESTADO_CONFIG[mant.estado as keyof typeof ESTADO_CONFIG];
  const tecnicoDisplay = mant.tecnico_personal
    ? `${mant.tecnico_personal.nombre || ""} ${mant.tecnico_personal.apellido || ""}`.trim()
    : mant.tecnico;

  return (
    <div className="space-y-4">
      <DetailSection title="Información General">
        <DetailRow label="Fecha" value={formatDate(mant.fecha)} />
        <DetailRow label="Máquina" value={[mant.maquinaria?.codigo, mant.maquinaria?.nombre].filter(Boolean).join(" · ")} />
        <DetailRow label="Tipo" value={<Badge className={cn("status-badge", tipoCfg?.className)}>{tipoCfg?.label}</Badge>} />
        <DetailRow label="Estado" value={<Badge className={cn("status-badge", estadoCfg?.className)}>{estadoCfg?.emoji} {estadoCfg?.label}</Badge>} />
        <DetailRow label="Técnico" value={tecnicoDisplay} />
      </DetailSection>

      {/* Checklists (only for services) */}
      {mant.tipo === "preventivo" && (
        <>
          <ChecklistSection
            title="Checklist de Cambio"
            items={CHECKLIST_CAMBIO_ITEMS}
            data={mant.checklist_cambio as ChecklistCambio}
            colorClass="text-blue-500"
          />
          <ChecklistSection
            title="Checklist de Chequeo"
            items={CHECKLIST_CHEQUEO_ITEMS}
            data={mant.checklist_chequeo as ChecklistChequeo}
            colorClass="text-green-500"
          />
        </>
      )}

      <DetailSection title={mant.tipo === "preventivo" ? "Informe Técnico" : "Tareas Realizadas"}>
        <p className="text-sm text-foreground/80 whitespace-pre-wrap">
          {mant.tipo === "preventivo" ? (mant.informe_tecnico || mant.descripcion) : mant.descripcion}
        </p>
        {mant.repuestos && <DetailRow label="Repuestos" value={mant.repuestos} />}
      </DetailSection>

      <DetailSection title="Mediciones">
        <DetailRow label="Horas máquina" value={`${mant.horas_maquina} h`} />
        {mant.kilometros > 0 && <DetailRow label="Kilómetros" value={`${mant.kilometros} km`} />}
        {mant.proximo_service_hr && <DetailRow label="Próx. service (HR)" value={`${mant.proximo_service_hr} h`} />}
        {mant.proximo_service_km && <DetailRow label="Próx. service (KM)" value={`${mant.proximo_service_km} km`} />}
      </DetailSection>

      {(mant.costo_total > 0) && (
        <DetailSection title="Costos">
          <DetailRow label="Repuestos" value={formatCurrency(mant.costo_repuestos)} />
          <DetailRow label="Mano de Obra" value={formatCurrency(mant.costo_mano_obra)} />
          <DetailRow label="Total" value={formatCurrency(mant.costo_total)} />
        </DetailSection>
      )}

      {mant.alerta_campo && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4">
          <p className="text-sm font-semibold text-destructive mb-1">⚠️ Alerta de campo</p>
          <p className="text-sm text-foreground/80">{mant.alerta_campo}</p>
        </div>
      )}

      {mant.observaciones && (
        <DetailSection title="Observaciones">
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{mant.observaciones}</p>
        </DetailSection>
      )}
    </div>
  );
}
