import { AccountingSectionLayout } from "@/components/contabilidad/AccountingSectionLayout";
import { TreasuryView } from "@/components/contabilidad/OperationalAccountingViews";
export default function CajaBancos(){return <AccountingSectionLayout title="Caja / Bancos" subtitle="Saldos, movimientos y transferencias"><TreasuryView/></AccountingSectionLayout>}
