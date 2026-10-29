import { AccountingSectionLayout } from "@/components/contabilidad/AccountingSectionLayout";
import { CurrentAccountView } from "@/components/contabilidad/OperationalAccountingViews";
export default function Clientes(){return <AccountingSectionLayout title="Clientes" subtitle="Cuenta corriente y cobranzas"><CurrentAccountView kind="receivable"/></AccountingSectionLayout>}
