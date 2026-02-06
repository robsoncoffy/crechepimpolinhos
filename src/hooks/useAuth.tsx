import { createContext, useContext, ReactNode, useMemo } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";
import { logger } from "@/lib/logger";
import { useAuthSession } from "./useAuthSession";
import { useUserProfile } from "./useUserProfile";
import { useUserRoles } from "./useUserRoles";

type AppRole = Database["public"]["Enums"]["app_role"];
type ApprovalStatus = Database["public"]["Enums"]["approval_status"];

interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  phone: string | null;
  avatar_url: string | null;
  status: ApprovalStatus;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  roles: AppRole[];
  loading: boolean;
  isAdmin: boolean;
  isDiretor: boolean;
  isTeacher: boolean;
  isCook: boolean;
  isNutritionist: boolean;
  isPedagogue: boolean;
  isAuxiliar: boolean;
  isContador: boolean;
  isStaff: boolean;
  isParent: boolean;
  isApproved: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const authLogger = logger.withContext("Auth");

export function AuthProvider({ children }: { children: ReactNode }) {
  // ⚡ Usa hooks auxiliares externos
  const { user, loading: sessionLoading, signOut: authSignOut } = useAuthSession();
  const { profile, isLoading: profileLoading } = useUserProfile(user?.id);
  const { roles, isLoading: rolesLoading, isAdmin: adminRole, isDiretor, isTeacher, isCook, isNutritionist, isPedagogue, isAuxiliar, isContador, isStaff, isParent } = useUserRoles(user?.id);

  // Loading é true se qualquer um dos sub-hooks ainda está carregando
  const loading = sessionLoading || profileLoading || rolesLoading;

  // SignOut wrapper com logging
  const signOut = async () => {
    authLogger.info("Fazendo logout");
    await authSignOut();
  };

  // ⚡ Memoiza computed values
  const computedValues = useMemo(() => ({
    // isAdmin inclui diretor para compatibilidade
    isAdmin: adminRole || isDiretor,
    isDiretor,
    isTeacher,
    isCook,
    isNutritionist,
    isPedagogue,
    isAuxiliar,
    isContador,
    isStaff,
    isParent,
    isApproved: profile?.status === "approved",
  }), [adminRole, isDiretor, isTeacher, isCook, isNutritionist, isPedagogue, isAuxiliar, isContador, isStaff, isParent, profile?.status]);

  // ⚡ Memoiza o value do context para evitar re-renders
  const contextValue = useMemo<AuthContextType>(() => ({
    user,
    profile: profile as Profile | null,
    roles,
    loading,
    signOut,
    ...computedValues,
  }), [user, profile, roles, loading, signOut, computedValues]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
