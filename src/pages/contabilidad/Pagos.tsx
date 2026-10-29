import { AccountingSectionLayout } from "@/components/contabilidad/AccountingSectionLayout";
import { PagosTab } from "@/components/contabilidad/PagosTab";
export default function Pagos(){return <AccountingSectionLayout title="Pagos / Egresos" subtitle="Cancelación de cuentas por pagar"><PagosTab esCobro={false}/></AccountingSectionLayout>}
