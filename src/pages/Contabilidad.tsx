import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ComprobantesTab } from "@/components/contabilidad/ComprobantesTab";
import { PagosTab } from "@/components/contabilidad/PagosTab";
import { AsientosTab } from "@/components/contabilidad/AsientosTab";
import { ReportesTab } from "@/components/contabilidad/ReportesTab";
import { ConfigTab } from "@/components/contabilidad/ConfigTab";

export default function Contabilidad() {
  const [tab, setTab] = useState("ventas");
  return (
    <MainLayout title="Contabilidad" subtitle="Ventas, compras, pagos, asientos, IVA y reportes">
      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="grid grid-cols-6 w-full max-w-3xl">
          <TabsTrigger value="ventas">Ventas</TabsTrigger>
          <TabsTrigger value="compras">Compras</TabsTrigger>
          <TabsTrigger value="pagos">Pagos / Cobranzas</TabsTrigger>
          <TabsTrigger value="asientos">Asientos</TabsTrigger>
          <TabsTrigger value="reportes">Reportes</TabsTrigger>
          <TabsTrigger value="config">Configuración</TabsTrigger>
        </TabsList>
        <TabsContent value="ventas" className="mt-4">
          <ComprobantesTab esVenta={true} />
        </TabsContent>
        <TabsContent value="compras" className="mt-4">
          <ComprobantesTab esVenta={false} />
        </TabsContent>
        <TabsContent value="pagos" className="mt-4">
          <PagosTab />
        </TabsContent>
        <TabsContent value="asientos" className="mt-4">
          <AsientosTab />
        </TabsContent>
        <TabsContent value="reportes" className="mt-4">
          <ReportesTab />
        </TabsContent>
        <TabsContent value="config" className="mt-4">
          <ConfigTab />
        </TabsContent>
      </Tabs>
    </MainLayout>
  );
}
