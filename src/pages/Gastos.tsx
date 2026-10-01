import { MainLayout } from "@/components/layout/MainLayout";
import { CombustibleRepartidorTab } from "@/components/gastos/CombustibleRepartidorTab";

export default function Gastos() {
  return (
    <MainLayout title="Combustible" subtitle="Control de entregas de combustible">
      <CombustibleRepartidorTab />
    </MainLayout>
  );
}
