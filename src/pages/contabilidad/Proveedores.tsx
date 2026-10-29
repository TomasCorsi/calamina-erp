import { AccountingSectionLayout } from "@/components/contabilidad/AccountingSectionLayout";
import { CurrentAccountView } from "@/components/contabilidad/OperationalAccountingViews";
export default function Proveedores(){return <AccountingSectionLayout title="Proveedores" subtitle="Cuenta corriente y vencimientos"><CurrentAccountView kind="payable"/></AccountingSectionLayout>}
