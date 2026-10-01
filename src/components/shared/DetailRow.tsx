import { ReactNode } from "react";

interface DetailRowProps {
  label: string;
  value: ReactNode;
}

export function DetailRow({ label, value }: DetailRowProps) {
  return (
    <div className="flex justify-between py-2 border-b border-border/50 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground text-right">{value}</span>
    </div>
  );
}

interface DetailSectionProps {
  title: string;
  children: ReactNode;
}

export function DetailSection({ title, children }: DetailSectionProps) {
  return (
    <div className="mb-6 last:mb-0">
      <h4 className="text-sm font-semibold text-primary mb-3 uppercase tracking-wide">
        {title}
      </h4>
      <div className="space-y-1">{children}</div>
    </div>
  );
}
