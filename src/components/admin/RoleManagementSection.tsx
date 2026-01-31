import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Shield, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { roleLabels, roleBadgeColors } from "@/lib/constants";
import { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

// All available roles that can be assigned
const ALL_ROLES: AppRole[] = [
  "admin",
  "diretor",
  "teacher",
  "pedagogue",
  "nutritionist",
  "cook",
  "auxiliar",
  "parent",
];

interface RoleManagementSectionProps {
  userId: string;
  currentRoles: string[];
  onRolesChange: () => void;
  disabled?: boolean;
}

export function RoleManagementSection({
  userId,
  currentRoles,
  onRolesChange,
  disabled = false,
}: RoleManagementSectionProps) {
  const [loading, setLoading] = useState<string | null>(null);

  const hasRole = (role: AppRole) => currentRoles.includes(role);

  const toggleRole = async (role: AppRole) => {
    if (disabled) return;
    
    setLoading(role);
    try {
      if (hasRole(role)) {
        // Remove role
        const { error } = await supabase
          .from("user_roles")
          .delete()
          .eq("user_id", userId)
          .eq("role", role);

        if (error) throw error;
        toast.success(`Cargo "${roleLabels[role]}" removido`);
      } else {
        // Add role
        const { error } = await supabase
          .from("user_roles")
          .insert({ user_id: userId, role });

        if (error) {
          if (error.message?.includes("duplicate")) {
            toast.info("Este cargo já está atribuído");
          } else {
            throw error;
          }
        } else {
          toast.success(`Cargo "${roleLabels[role]}" atribuído`);
        }
      }

      onRolesChange();
    } catch (error) {
      console.error("Error toggling role:", error);
      toast.error("Erro ao alterar cargo");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
        <Shield className="w-4 h-4" />
        Gerenciar Cargos
      </div>
      
      <div className="grid grid-cols-2 gap-2">
        {ALL_ROLES.map((role) => {
          const isActive = hasRole(role);
          const isLoading = loading === role;
          const isAdminRole = role === "admin" || role === "diretor";

          return (
            <label
              key={role}
              className={`
                flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-all
                ${isActive 
                  ? "bg-primary/5 border-primary/30" 
                  : "bg-muted/30 border-transparent hover:border-muted-foreground/20"
                }
                ${disabled || isLoading ? "opacity-50 cursor-not-allowed" : ""}
              `}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
              ) : (
                <Checkbox
                  checked={isActive}
                  onCheckedChange={() => toggleRole(role)}
                  disabled={disabled || isLoading}
                  className="data-[state=checked]:bg-primary"
                />
              )}
              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                {isAdminRole && isActive && (
                  <ShieldCheck className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                )}
                <span className="text-sm font-medium truncate">
                  {roleLabels[role]}
                </span>
              </div>
            </label>
          );
        })}
      </div>

      {/* Current roles summary */}
      {currentRoles.length > 0 && (
        <div className="pt-2">
          <p className="text-xs text-muted-foreground mb-1.5">Cargos ativos:</p>
          <div className="flex flex-wrap gap-1">
            {currentRoles.map((role) => (
              <Badge
                key={role}
                variant="secondary"
                className={`text-xs ${roleBadgeColors[role as AppRole] || "bg-gray-100 text-gray-800"}`}
              >
                {roleLabels[role as AppRole] || role}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
