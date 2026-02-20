import { memo, ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import type { LucideIcon } from "lucide-react";

interface DashboardHeaderProps {
  icon?: LucideIcon;
  iconColor?: string;
  greeting: string;
  subtitle: string;
  actions?: ReactNode;
}

export const DashboardHeader = memo(function DashboardHeader({
  icon: Icon,
  iconColor = "text-primary",
  greeting,
  subtitle,
  actions,
}: DashboardHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 className="font-fredoka text-2xl lg:text-3xl font-bold text-foreground flex flex-wrap items-center gap-2 min-w-0">
          {Icon && <Icon className={`w-7 h-7 lg:w-8 lg:h-8 ${iconColor} shrink-0`} />}
          <span className="min-w-0 break-words">{greeting}</span>
        </h1>
        <p className="text-muted-foreground mt-1">{subtitle}</p>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
});

export function DashboardHeaderSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-5 w-48" />
    </div>
  );
}
