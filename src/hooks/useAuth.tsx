import { useState, useEffect, createContext, useContext, ReactNode } from "react";
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
  isTeacher: boolean;
  isCook: boolean;
  isNutritionist: boolean;
  isPedagogue: boolean;
  isAuxiliar: boolean;
  isStaff: boolean;
  isParent: boolean;
  isApproved: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchUserData = async (userId: string) => {
      try {
        // Fetch profile and roles in parallel
        const [profileResult, rolesResult] = await Promise.all([
          supabase
            .from("profiles")
            .select("*")
            .eq("user_id", userId)
            .maybeSingle(),
          supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", userId)
        ]);

        if (!isMounted) return;

        if (profileResult.data) {
          setProfile(profileResult.data);
        }

        if (rolesResult.data) {
          setRoles(rolesResult.data.map((r) => r.role));
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;

        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Fetch user data and THEN set loading to false
          await fetchUserData(session.user.id);
        } else {
          setProfile(null);
          setRoles([]);
        }
        
        // Only set loading false AFTER data is fully loaded
        if (isMounted) {
          setLoading(false);
        }
      }
    );

    // Check initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!isMounted) return;
      
      setUser(session?.user ?? null);
      
      if (session?.user) {
        await fetchUserData(session.user.id);
      }
      
      // Only set loading false AFTER data is fully loaded
      if (isMounted) {
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setRoles([]);
  };

  const isAdmin = roles.includes("admin");
  const isTeacher = roles.includes("teacher");
  const isCook = roles.includes("cook");
  const isNutritionist = roles.includes("nutritionist");
  const isPedagogue = roles.includes("pedagogue");
  const isAuxiliar = roles.includes("auxiliar");
  const isStaff = isAdmin || isTeacher || isCook || isNutritionist || isPedagogue || isAuxiliar;
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
        isTeacher,
        isCook,
        isNutritionist,
        isPedagogue,
        isAuxiliar,
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
