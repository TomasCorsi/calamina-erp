import { AccountingSectionLayout } from "@/components/contabilidad/AccountingSectionLayout";
import { AccountingSummaryView } from "@/components/contabilidad/OperationalAccountingViews";
export default function Resumen(){return <AccountingSectionLayout title="Resumen contable" subtitle="Saldos, resultados y vencimientos"><AccountingSummaryView/></AccountingSectionLayout>}
