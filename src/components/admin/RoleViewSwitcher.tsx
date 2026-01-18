import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  ChefHat, 
  GraduationCap, 
  Users, 
  Baby,
  Apple,
  ShieldCheck,
  Eye
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

export type ViewRole = "admin" | "teacher" | "parent" | "cook" | "nutritionist" | "pedagogue";

interface RoleOption {
  id: ViewRole;
  label: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
}

const roleOptions: RoleOption[] = [
  { 
    id: "admin", 
    label: "Administrador", 
    icon: ShieldCheck, 
    color: "text-blue-600",
    bgColor: "bg-blue-100"
  },
  { 
    id: "teacher", 
    label: "Professor(a)", 
    icon: GraduationCap, 
    color: "text-purple-600",
    bgColor: "bg-purple-100"
  },
  { 
    id: "parent", 
    label: "Pais", 
    icon: Users, 
    color: "text-green-600",
    bgColor: "bg-green-100"
  },
  { 
    id: "cook", 
    label: "Cozinheira", 
    icon: ChefHat, 
    color: "text-orange-600",
    bgColor: "bg-orange-100"
  },
  { 
    id: "nutritionist", 
    label: "Nutricionista", 
    icon: Apple, 
    color: "text-emerald-600",
    bgColor: "bg-emerald-100"
  },
  { 
    id: "pedagogue", 
    label: "Pedagoga", 
    icon: Baby, 
    color: "text-pink-600",
    bgColor: "bg-pink-100"
  },
];

interface RoleViewSwitcherProps {
  isCollapsed?: boolean;
}

export function RoleViewSwitcher({ isCollapsed = false }: RoleViewSwitcherProps) {
  const navigate = useNavigate();
  const [currentView, setCurrentView] = useState<ViewRole>("admin");

  const currentRole = roleOptions.find(r => r.id === currentView) || roleOptions[0];

  const handleViewChange = (roleId: ViewRole) => {
    setCurrentView(roleId);
    
    // Navigate to demo with the selected role
    const roleParam = roleId === "admin" ? "" : `?role=${roleId}`;
    navigate(`/demo${roleParam}`);
  };

  if (isCollapsed) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-full"
          >
            <Eye className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="right" align="start" className="w-48">
          <DropdownMenuLabel className="text-xs text-muted-foreground">
            Alternar Visão
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {roleOptions.map((role) => (
            <DropdownMenuItem
              key={role.id}
              onClick={() => handleViewChange(role.id)}
              className="cursor-pointer"
            >
              <role.icon className={cn("h-4 w-4 mr-2", role.color)} />
              <span>{role.label}</span>
              {currentView === role.id && (
                <Badge variant="secondary" className="ml-auto text-xs">
                  Atual
                </Badge>
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <div className="px-2 py-2">
      <div className="flex items-center gap-2 mb-2 px-2">
        <Eye className="h-3.5 w-3.5 text-sidebar-foreground/60" />
        <span className="text-xs font-medium text-sidebar-foreground/60 uppercase tracking-wide">
          Alternar Visão
        </span>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className={cn(
              "w-full justify-start gap-2 h-10",
              "bg-sidebar-accent/50 hover:bg-sidebar-accent",
              "border border-sidebar-border"
            )}
          >
            <div className={cn("p-1 rounded", currentRole.bgColor)}>
              <currentRole.icon className={cn("h-4 w-4", currentRole.color)} />
            </div>
            <span className="flex-1 text-left text-sm font-medium">
              {currentRole.label}
            </span>
            <Badge variant="outline" className="text-[10px] px-1.5">
              Demo
            </Badge>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-52">
          <DropdownMenuLabel className="text-xs text-muted-foreground">
            Selecione uma visão para testar
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {roleOptions.map((role) => (
            <DropdownMenuItem
              key={role.id}
              onClick={() => handleViewChange(role.id)}
              className={cn(
                "cursor-pointer gap-2",
                currentView === role.id && "bg-accent"
              )}
            >
              <div className={cn("p-1 rounded", role.bgColor)}>
                <role.icon className={cn("h-4 w-4", role.color)} />
              </div>
              <span className="flex-1">{role.label}</span>
              {currentView === role.id && (
                <Badge variant="secondary" className="text-[10px]">
                  Atual
                </Badge>
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}