import { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

const rolesLogger = logger.withContext("UserRoles");

// Staff roles that have access to admin panel
const STAFF_ROLES: AppRole[] = [
  "admin",
  "diretor",
  "teacher",
  "cook",
  "nutritionist",
  "pedagogue",
  "auxiliar",
  "contador",
];

// HR admin roles for sensitive operations
const HR_ADMIN_ROLES: AppRole[] = ["admin", "diretor", "contador"];

interface UseUserRolesOptions {
  enabled?: boolean;
}

export function useUserRoles(userId: string | undefined, options: UseUserRolesOptions = {}) {
  const { enabled = true } = options;
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["user-roles", userId],
    queryFn: async (): Promise<AppRole[]> => {
      if (!userId) return [];

      rolesLogger.info("Fetching roles for user:", userId);

      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);

      if (error) {
        rolesLogger.error("Error fetching roles:", error);
        throw error;
      }

      const roles = data?.map((r) => r.role) || [];
      rolesLogger.info("Roles loaded:", roles.join(", ") || "None");
      return roles;
    },
    enabled: enabled && !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
  });

  // Derived role checks - memoized
  const roleChecks = useMemo(() => {
    const roles = query.data ?? [];
    
    return {
      isAdmin: roles.includes("admin"),
      isDiretor: roles.includes("diretor"),
      isTeacher: roles.includes("teacher"),
      isCook: roles.includes("cook"),
      isNutritionist: roles.includes("nutritionist"),
      isPedagogue: roles.includes("pedagogue"),
      isAuxiliar: roles.includes("auxiliar"),
      isContador: roles.includes("contador"),
      isParent: roles.includes("parent"),
      isStaff: roles.some((r) => STAFF_ROLES.includes(r)),
      isHrAdmin: roles.some((r) => HR_ADMIN_ROLES.includes(r)),
    };
  }, [query.data]);

  const hasRole = (role: AppRole): boolean => {
    return query.data?.includes(role) ?? false;
  };

  const hasAnyRole = (checkRoles: AppRole[]): boolean => {
    return query.data?.some((r) => checkRoles.includes(r)) ?? false;
  };

  const refetchRoles = () => {
    if (userId) {
      queryClient.invalidateQueries({ queryKey: ["user-roles", userId] });
    }
  };

  return {
    roles: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    hasRole,
    hasAnyRole,
    refetchRoles,
    ...roleChecks,
  };
}
