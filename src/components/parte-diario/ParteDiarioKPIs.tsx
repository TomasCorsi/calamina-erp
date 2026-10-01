import { ClipboardList, CheckCircle, AlertCircle, Users, UserX } from "lucide-react";
import { KPICard } from "@/components/dashboard/KPICard";

interface ParteDiarioKPIsProps {
  total: number;
  completados: number;
  borradores: number;
  empleadosUnicos: number;
  sinParteHoy?: number;
}

export function ParteDiarioKPIs({ 
  total, 
  completados, 
  borradores, 
  empleadosUnicos,
  sinParteHoy 
}: ParteDiarioKPIsProps) {
  const porcentajeCompletados = total > 0 ? Math.round((completados / total) * 100) : 0;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
      <KPICard
        title="Total Partes"
        value={total}
        subtitle="en el período"
        icon={ClipboardList}
        variant="primary"
      />
      <KPICard
        title="Completados"
        value={completados}
        subtitle={`${porcentajeCompletados}% del total`}
        icon={CheckCircle}
        variant="success"
      />
      <KPICard
        title="Borradores"
        value={borradores}
        subtitle="pendientes"
        icon={AlertCircle}
        variant="warning"
      />
      <KPICard
        title="Empleados"
        value={empleadosUnicos}
        subtitle="activos en período"
        icon={Users}
        variant="default"
      />
      {sinParteHoy !== undefined && (
        <KPICard
          title="Sin Parte Hoy"
          value={sinParteHoy}
          subtitle="empleados faltantes"
          icon={UserX}
          variant="warning"
        />
      )}
    </div>
  );
}