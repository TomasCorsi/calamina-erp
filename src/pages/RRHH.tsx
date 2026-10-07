import { Link } from "react-router-dom";
import {
  CalendarDays,
  FileText,
  HardHat,
  ShieldCheck,
  UserCircle,
  Users,
  Wallet,
} from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const areas = [
  {
    title: "Personal",
    description: "Legajos, datos laborales y estado del personal.",
    icon: Users,
    to: "/personal?tab=empleados",
  },
  {
    title: "Vacaciones",
    description: "Períodos, solicitudes, estados y observaciones.",
    icon: CalendarDays,
    to: "/personal?tab=vacaciones",
  },
  {
    title: "Liquidaciones",
    description: "Períodos, configuración salarial, adelantos y préstamos.",
    icon: Wallet,
    to: "/liquidaciones",
  },
  {
    title: "Entrega de EPP",
    description: "Elementos entregados, cantidades y fechas.",
    icon: HardHat,
    to: "/personal?tab=epp",
  },
  {
    title: "Documentos",
    description: "Documentación laboral administrada por RRHH.",
    icon: FileText,
    to: "/personal?tab=documentos",
  },
  {
    title: "Mi Perfil",
    description: "Datos laborales propios del usuario actual.",
    icon: UserCircle,
    to: "/mi-perfil",
  },
  {
    title: "Mis Documentos",
    description: "Documentos propios, vistos y firmas.",
    icon: ShieldCheck,
    to: "/mis-documentos",
  },
] as const;

export default function RRHH() {
  return (
    <MainLayout title="RRHH" subtitle="Personal, documentación y liquidaciones">
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {areas.map((area) => (
            <Card key={area.title} className="card-industrial h-full">
              <CardHeader>
                <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10">
                  <area.icon className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-lg">{area.title}</CardTitle>
                <CardDescription>{area.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild className="w-full">
                  <Link to={area.to}>Abrir {area.title}</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="card-industrial">
          <CardHeader>
            <CardTitle className="text-base">Funciones del panel RRHH anterior</CardTitle>
            <CardDescription>
              Se conservan como referencia visual, sin montar consultas contra tablas legacy.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button variant="outline" disabled>Novedades</Button>
            <Button variant="outline" disabled>Planilla consolidada</Button>
            <Button variant="outline" disabled>Configuración de jornada</Button>
            <Badge variant="secondary" className="self-center">Pendiente no crítico</Badge>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
