import { MainLayout } from "@/components/layout/MainLayout";
import { Construction } from "lucide-react";

interface PlaceholderProps {
  title: string;
  subtitle?: string;
}

export default function Placeholder({ title, subtitle }: PlaceholderProps) {
  return (
    <MainLayout title={title} subtitle={subtitle}>
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <div className="w-20 h-20 bg-primary/20 rounded-2xl flex items-center justify-center mb-6 animate-pulse">
          <Construction className="w-10 h-10 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Módulo en Desarrollo</h2>
        <p className="text-muted-foreground max-w-md">
          Esta sección está siendo construida. Pronto podrás gestionar {title.toLowerCase()} desde aquí.
        </p>
      </div>
    </MainLayout>
  );
}
