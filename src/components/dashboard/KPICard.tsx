import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: "default" | "primary" | "success" | "warning";
  compact?: boolean;
  tv?: boolean;
}

export function KPICard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  variant = "default",
  compact,
  tv,
}: KPICardProps) {
  const iconColors = {
    default: "bg-muted text-muted-foreground",
    primary: "bg-primary/20 text-primary",
    success: "bg-success/20 text-success",
    warning: "bg-warning/20 text-warning",
  };

  if (compact) {
    return (
      <div className="kpi-card !p-3 animate-fade-in">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "rounded-lg flex items-center justify-center flex-shrink-0",
              tv ? "w-11 h-11" : "w-9 h-9",
              iconColors[variant]
            )}
          >
            <Icon className={cn(tv ? "w-6 h-6" : "w-4 h-4")} />
          </div>
          <div className="min-w-0">
            <p className={cn("text-muted-foreground truncate", tv ? "text-sm" : "text-xs")}>{title}</p>
            <p
              className={cn(
                "font-bold text-foreground font-mono-numbers leading-tight",
                tv ? "text-3xl" : "text-lg"
              )}
            >
              {value}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="kpi-card animate-fade-in">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-muted-foreground font-medium mb-1">{title}</p>
          <p className="text-2xl font-bold text-foreground font-mono-numbers">
            {value}
          </p>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
          )}
          {trend && (
            <div className="flex items-center gap-1 mt-2">
              <span
                className={cn(
                  "text-xs font-medium",
                  trend.isPositive ? "text-success" : "text-destructive"
                )}
              >
                {trend.isPositive ? "+" : ""}{trend.value}%
              </span>
              <span className="text-xs text-muted-foreground">vs mes anterior</span>
            </div>
          )}
        </div>
        <div
          className={cn(
            "w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0",
            iconColors[variant]
          )}
        >
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}
