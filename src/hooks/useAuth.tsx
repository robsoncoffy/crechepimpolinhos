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

    // Check if user should be logged out (session-only mode)
    const shouldClearSession = sessionStorage.getItem('pimpolinhos_session_only') === 'true';
    const isRemembered = localStorage.getItem('pimpolinhos_remember_me') === 'true';
    
    // If session-only flag exists but localStorage remember flag doesn't, 
    // this is a new browser session - clear auth
    if (!isRemembered && !sessionStorage.getItem('pimpolinhos_session_active')) {
      // This is a fresh browser session, check if we should clear
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
        
        return true;
      } catch (error) {
        console.error("Error fetching user data:", error);
        return false;
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
