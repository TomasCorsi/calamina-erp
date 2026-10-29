import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, LayoutGrid } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";

export function AccountingSectionLayout({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return <MainLayout title={title} subtitle={subtitle}>
    <div className="mb-4 flex items-center gap-2">
      <Button asChild variant="outline" size="sm"><Link to="/contabilidad"><ArrowLeft className="h-4 w-4 mr-2" />Contabilidad</Link></Button>
      <Button asChild variant="ghost" size="icon"><Link to="/contabilidad" aria-label="Abrir launcher contable"><LayoutGrid className="h-4 w-4" /></Link></Button>
    </div>
    {children}
  </MainLayout>;
}
