import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useDashboardView } from "@/hooks/useDashboardView";
import { ShieldCheck, Leaf, BookOpen, ChefHat, GraduationCap, User, Users, ChevronDown, Calculator } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type ViewType = "admin" | "nutritionist" | "pedagogue" | "cook" | "teacher" | "auxiliar" | "contador" | "parent";

const viewConfig: Record<ViewType, { label: string; icon: React.ElementType; color: string }> = {
  admin: { label: "Administração", icon: ShieldCheck, color: "text-blue-600" },
  nutritionist: { label: "Nutricionista", icon: Leaf, color: "text-emerald-600" },
  pedagogue: { label: "Pedagoga", icon: BookOpen, color: "text-purple-600" },
  cook: { label: "Cozinheira", icon: ChefHat, color: "text-orange-600" },
  teacher: { label: "Professor(a)", icon: GraduationCap, color: "text-sky-600" },
  auxiliar: { label: "Auxiliar", icon: User, color: "text-amber-600" },
  contador: { label: "Contador(a)", icon: Calculator, color: "text-teal-600" },
  parent: { label: "Responsável", icon: Users, color: "text-pink-600" },
};

interface DashboardViewToggleProps {
  isCollapsed?: boolean;
}

export function DashboardViewToggle({ isCollapsed = false }: DashboardViewToggleProps) {
  const { currentView, setView, availableViews } = useDashboardView();
  
  // Only show if user has multiple views available
  if (availableViews.length <= 1) return null;
  
  const currentConfig = viewConfig[currentView];
  const CurrentIcon = currentConfig?.icon || ShieldCheck;
  
  if (isCollapsed) {
    return (
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full"
              >
                <CurrentIcon className={`h-4 w-4 ${currentConfig?.color}`} />
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>Alternar Dashboard</p>
          </TooltipContent>
        </Tooltip>
        <DropdownMenuContent side="right" align="start">
          {availableViews.map((view) => {
            const config = viewConfig[view];
            const Icon = config.icon;
            return (
              <DropdownMenuItem
                key={view}
                onClick={() => setView(view)}
                className={currentView === view ? "bg-accent" : ""}
              >
                <Icon className={`h-4 w-4 mr-2 ${config.color}`} />
                {config.label}
                {currentView === view && (
                  <Badge variant="secondary" className="ml-auto text-[10px]">Ativo</Badge>
                )}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }
  
  return (
    <div className="px-2 py-2">
      <div className="flex items-center gap-2 mb-2 px-2">
        <CurrentIcon className={`h-3.5 w-3.5 ${currentConfig?.color}`} />
        <span className="text-xs font-medium text-sidebar-foreground/60 uppercase tracking-wide">
          Alternar Dashboard
        </span>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="w-full justify-between gap-2 h-10 bg-sidebar-accent/50 hover:bg-sidebar-accent border border-sidebar-border"
          >
            <div className="flex items-center gap-2">
              <div className={`p-1 rounded bg-sidebar-accent`}>
                <CurrentIcon className={`h-4 w-4 ${currentConfig?.color}`} />
              </div>
              <span className="text-sm font-medium">
                {currentConfig?.label}
              </span>
            </div>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          {availableViews.map((view) => {
            const config = viewConfig[view];
            const Icon = config.icon;
            return (
              <DropdownMenuItem
                key={view}
                onClick={() => setView(view)}
                className={currentView === view ? "bg-accent" : ""}
              >
                <Icon className={`h-4 w-4 mr-2 ${config.color}`} />
                {config.label}
                {currentView === view && (
                  <Badge variant="secondary" className="ml-auto text-[10px]">Ativo</Badge>
                )}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
      <p className="text-[10px] text-muted-foreground mt-1 px-2">
        Você tem acesso a {availableViews.length} dashboards
      </p>
    </div>
  );
}