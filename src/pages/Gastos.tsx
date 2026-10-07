import { MainLayout } from "@/components/layout/MainLayout";
import { CombustibleRepartidorTab } from "@/components/gastos/CombustibleRepartidorTab";

export default function Gastos() {
  return (
    <MainLayout title="Gastos" subtitle="Control de combustible">
      <CombustibleRepartidorTab />
    </MainLayout>
  );
}
