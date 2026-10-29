import { AccountingSectionLayout } from "@/components/contabilidad/AccountingSectionLayout";
import { ComprobantesTab } from "@/components/contabilidad/ComprobantesTab";
export default function Ventas(){return <AccountingSectionLayout title="Ventas" subtitle="Facturas y notas de clientes"><ComprobantesTab esVenta /></AccountingSectionLayout>}
