import { useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  Eye, 
  X, 
  User, 
  GraduationCap, 
  Shield,
  ChevronUp,
  ChevronDown 
} from "lucide-react";

export type DemoRole = "parent" | "teacher" | "admin";

interface DemoModeToggleProps {
  currentRole: DemoRole;
  onRoleChange: (role: DemoRole) => void;
}

const roleConfig = {
  parent: {
    label: "Pai/Mãe",
    icon: User,
    color: "bg-pimpo-blue text-white hover:bg-pimpo-blue/90",
  },
  teacher: {
    label: "Professor(a)",
    icon: GraduationCap,
    color: "bg-pimpo-green text-white hover:bg-pimpo-green/90",
  },
  admin: {
    label: "Administração",
    icon: Shield,
    color: "bg-pimpo-red text-white hover:bg-pimpo-red/90",
  },
};

export function DemoModeToggle({ currentRole, onRoleChange }: DemoModeToggleProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const roles: DemoRole[] = ["parent", "teacher", "admin"];
  const CurrentIcon = roleConfig[currentRole].icon;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
      {/* Role Selection Panel */}
      {isExpanded && (
        <div className="bg-card rounded-xl shadow-2xl border p-4 animate-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
              <Eye className="w-4 h-4" />
              Modo Demo
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setIsExpanded(false)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Alterne entre as visões para testar
          </p>
          <div className="flex flex-col gap-2 min-w-[180px]">
            {roles.map((role) => {
              const config = roleConfig[role];
              const Icon = config.icon;
              const isActive = currentRole === role;
              return (
                <Button
                  key={role}
                  variant={isActive ? "default" : "outline"}
                  className={`justify-start gap-2 ${isActive ? config.color : ""}`}
                  onClick={() => {
                    onRoleChange(role);
                    setIsExpanded(false);
                  }}
                >
                  <Icon className="w-4 h-4" />
                  {config.label}
                  {isActive && (
                    <span className="ml-auto text-xs opacity-75">Ativo</span>
                  )}
                </Button>
              );
            })}
          </div>
        </div>
      )}

      {/* Floating Toggle Button */}
      <Button
        size="lg"
        className={`rounded-full shadow-xl gap-2 px-4 ${roleConfig[currentRole].color}`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <CurrentIcon className="w-5 h-5" />
        <span className="font-semibold">{roleConfig[currentRole].label}</span>
        {isExpanded ? (
          <ChevronDown className="w-4 h-4" />
        ) : (
          <ChevronUp className="w-4 h-4" />
        )}
      </Button>
    </div>
  );
}
