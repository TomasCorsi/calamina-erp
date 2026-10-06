import { MainLayout } from "@/components/layout/MainLayout";
import { CombustibleRepartidorTab } from "@/components/gastos/CombustibleRepartidorTab";
import { GastosGeneralesTab } from "@/components/proveedores/GastosGeneralesTab";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Gastos() {
  return (
    <MainLayout title="Gastos" subtitle="Gastos generales y control de combustible">
      <Tabs defaultValue="generales" className="space-y-4">
        <TabsList>
          <TabsTrigger value="generales">Gastos Generales</TabsTrigger>
          <TabsTrigger value="combustible">Combustible</TabsTrigger>
        </TabsList>
        <TabsContent value="generales"><GastosGeneralesTab /></TabsContent>
        <TabsContent value="combustible"><CombustibleRepartidorTab /></TabsContent>
      </Tabs>
    </MainLayout>
  );
}
