import { AccountingSectionLayout } from "@/components/contabilidad/AccountingSectionLayout";
import { ComprobantesTab } from "@/components/contabilidad/ComprobantesTab";
export default function Compras(){return <AccountingSectionLayout title="Compras" subtitle="Facturas y notas de proveedores"><ComprobantesTab esVenta={false} /></AccountingSectionLayout>}
