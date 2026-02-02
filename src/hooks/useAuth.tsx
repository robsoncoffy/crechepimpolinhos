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
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    let dataFetched = false;

    // Check if this is a new browser session for users who didn't want to be remembered
    const isRemembered = localStorage.getItem('pimpolinhos_remember_me') === 'true';
    const sessionActive = sessionStorage.getItem('pimpolinhos_session_active');
    
    // If not remembered AND this is a fresh browser session (no sessionActive flag)
    // AND there was a previous session-only login, clear the auth
    if (!isRemembered && !sessionActive) {
      const wasSessionOnly = localStorage.getItem('pimpolinhos_was_session_only');
      if (wasSessionOnly === 'true') {
        // User didn't want to be remembered, clear session
        supabase.auth.signOut();
        localStorage.removeItem('pimpolinhos_was_session_only');
      }
    }
    
    // Mark this browser session as active
    sessionStorage.setItem('pimpolinhos_session_active', 'true');

    const fetchUserData = async (userId: string): Promise<boolean> => {
      if (dataFetched) return true; // Prevent duplicate fetches
      
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

        if (!isMounted) return false;

        if (profileResult.error) {
          console.error("Error fetching profile:", profileResult.error);
        } else if (profileResult.data) {
          setProfile(profileResult.data);
        }

        if (rolesResult.error) {
          console.error("Error fetching roles:", rolesResult.error);
        } else if (rolesResult.data) {
          setRoles(rolesResult.data.map((r) => r.role));
        }
        
        dataFetched = true;
        return true;
      } catch (error) {
        console.error("Error fetching user data:", error);
        return false;
      }
    };

    // Safety timeout to prevent infinite loading
    const safetyTimeout = setTimeout(() => {
      if (isMounted && loading) {
        console.warn("Auth loading timeout - forcing completion");
        setLoading(false);
      }
    }, 10000);

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

    // Handle beforeunload to set flag for session-only users
    const handleBeforeUnload = () => {
      const sessionOnly = sessionStorage.getItem('pimpolinhos_session_only');
      if (sessionOnly === 'true') {
        localStorage.setItem('pimpolinhos_was_session_only', 'true');
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      isMounted = false;
      clearTimeout(safetyTimeout);
      subscription.unsubscribe();
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setRoles([]);
  };

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
