import { AccountingSectionLayout } from "@/components/contabilidad/AccountingSectionLayout";
import { VatView } from "@/components/contabilidad/OperationalAccountingViews";
export default function Iva(){return <AccountingSectionLayout title="IVA" subtitle="Libros y posición mensual"><VatView/></AccountingSectionLayout>}
