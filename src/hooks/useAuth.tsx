import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";

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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);

  // Initialize session and listen for changes
  useEffect(() => {
    let mounted = true;

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (mounted) {
        setUser(session?.user ?? null);
        setSessionLoading(false);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) {
        setUser(session?.user ?? null);
        setSessionLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Fetch profile data using React Query
  const { data: profile = null, isLoading: profileLoading } = useQuery({
    queryKey: ["auth-profile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Error fetching profile:", error);
        return null;
      }
      return data;
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Fetch user roles using React Query
  const { data: roles = [], isLoading: rolesLoading } = useQuery({
    queryKey: ["auth-roles", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      if (error) {
        console.error("Error fetching roles:", error);
        return [];
      }
      return data.map(r => r.role);
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const loading = sessionLoading || (!!user && (profileLoading || rolesLoading));

  const isAdmin = roles.includes("admin") || roles.includes("diretor");
  const isDiretor = roles.includes("diretor");
  const isTeacher = roles.includes("teacher");
  const isCook = roles.includes("cook");
  const isNutritionist = roles.includes("nutritionist");
  const isPedagogue = roles.includes("pedagogue");
  const isAuxiliar = roles.includes("auxiliar");
  const isContador = roles.includes("contador");
  const isStaff = isAdmin || isDiretor || isTeacher || isCook || isNutritionist || isPedagogue || isAuxiliar || isContador;
  const isParent = roles.includes("parent");
  const isApproved = profile?.status === "approved";

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        roles,
        loading,
        isAdmin,
        isDiretor,
        isTeacher,
        isCook,
        isNutritionist,
        isPedagogue,
        isAuxiliar,
        isContador,
        isStaff,
        isParent,
        isApproved,
        signOut,
      }}
    >
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
