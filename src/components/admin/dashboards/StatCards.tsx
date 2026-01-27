import { memo, ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  icon: LucideIcon;
  iconColor?: string;
  bgColor?: string;
  borderColor?: string;
  value: number | string;
  label: string;
  className?: string;
}

export const StatCard = memo(function StatCard({
  icon: Icon,
  iconColor = "text-primary",
  bgColor = "",
  borderColor = "",
  value,
  label,
  className = "",
}: StatCardProps) {
  return (
    <Card className={`${bgColor} ${borderColor} ${className}`}>
      <CardContent className="p-3 sm:p-4 text-center">
        <Icon className={`w-5 h-5 sm:w-6 sm:h-6 mx-auto ${iconColor} mb-1 sm:mb-2`} />
        <p className={`text-2xl sm:text-3xl font-fredoka font-bold ${iconColor.replace('text-', 'text-')}`}>
          {value}
        </p>
        <p className="text-xs sm:text-sm text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
});

interface StatGridProps {
  children: ReactNode;
  columns?: 2 | 3 | 4;
}

export const StatGrid = memo(function StatGrid({ 
  children, 
  columns = 2 
}: StatGridProps) {
  const gridCols = {
    2: "grid-cols-2",
    3: "grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-2 lg:grid-cols-4",
  };

  return (
    <div className={`grid gap-3 ${gridCols[columns]}`}>
      {children}
    </div>
  );
});

export function StatCardSkeleton() {
  return <Skeleton className="h-28" />;
}

export function StatGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <StatCardSkeleton key={i} />
      ))}
    </div>
  );
}
