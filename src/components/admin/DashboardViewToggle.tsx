import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useDashboardView } from "@/hooks/useDashboardView";
import { ShieldCheck, Leaf, BookOpen, ChefHat, GraduationCap, ArrowLeftRight } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const roleConfig: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  nutritionist: { label: "Nutricionista", icon: Leaf, color: "text-emerald-600" },
  pedagogue: { label: "Pedagoga", icon: BookOpen, color: "text-purple-600" },
  cook: { label: "Cozinheira", icon: ChefHat, color: "text-orange-600" },
  teacher: { label: "Professor(a)", icon: GraduationCap, color: "text-blue-600" },
};

interface DashboardViewToggleProps {
  isCollapsed?: boolean;
}

export function DashboardViewToggle({ isCollapsed = false }: DashboardViewToggleProps) {
  const { currentView, toggleView, canToggle, specializedRole } = useDashboardView();
  
  if (!canToggle || !specializedRole) return null;
  
  const config = roleConfig[specializedRole];
  const SpecializedIcon = config?.icon || BookOpen;
  
  const isAdminView = currentView === "admin";
  const CurrentIcon = isAdminView ? ShieldCheck : SpecializedIcon;
  const currentLabel = isAdminView ? "Administração" : config?.label;
  const nextLabel = isAdminView ? config?.label : "Administração";
  
  if (isCollapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleView}
            className="h-9 w-9 rounded-full"
          >
            <ArrowLeftRight className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right">
          <p>Alternar para {nextLabel}</p>
        </TooltipContent>
      </Tooltip>
    );
  }
  
  return (
    <div className="px-2 py-2">
      <div className="flex items-center gap-2 mb-2 px-2">
        <ArrowLeftRight className="h-3.5 w-3.5 text-sidebar-foreground/60" />
        <span className="text-xs font-medium text-sidebar-foreground/60 uppercase tracking-wide">
          Alternar Visão
        </span>
      </div>
      <Button
        variant="ghost"
        onClick={toggleView}
        className="w-full justify-start gap-2 h-10 bg-sidebar-accent/50 hover:bg-sidebar-accent border border-sidebar-border"
      >
        <div className={`p-1 rounded ${isAdminView ? "bg-blue-100" : "bg-emerald-100"}`}>
          <CurrentIcon className={`h-4 w-4 ${isAdminView ? "text-blue-600" : config?.color}`} />
        </div>
        <span className="flex-1 text-left text-sm font-medium">
          {currentLabel}
        </span>
        <Badge variant="outline" className="text-[10px] px-1.5">
          Ativo
        </Badge>
      </Button>
      <p className="text-[10px] text-muted-foreground mt-1 px-2">
        Clique para alternar para {nextLabel}
      </p>
    </div>
  );
}
