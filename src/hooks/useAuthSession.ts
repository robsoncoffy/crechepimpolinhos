import { useState, useEffect, useCallback } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";

const authLogger = logger.withContext("AuthSession");

interface AuthSessionState {
  user: User | null;
  session: Session | null;
  loading: boolean;
}

export function useAuthSession() {
  const [state, setState] = useState<AuthSessionState>({
    user: null,
    session: null,
    loading: true,
  });

  useEffect(() => {
    let mounted = true;
    let timeoutId: NodeJS.Timeout;

    // Safety timeout to prevent infinite loading
    timeoutId = setTimeout(() => {
      if (mounted && state.loading) {
        authLogger.warn("Auth session loading timeout - forcing completion");
        setState(prev => ({ ...prev, loading: false }));
      }
    }, 10000);

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        authLogger.info(`Auth state changed: ${event}`);
        
        if (mounted) {
          setState({
            user: session?.user ?? null,
            session,
            loading: false,
          });
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        authLogger.error("Error getting session:", error);
      }
      
      if (mounted) {
        setState({
          user: session?.user ?? null,
          session,
          loading: false,
        });
      }
    });

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []);

  const signOut = useCallback(async () => {
    authLogger.info("Signing out user");
    const { error } = await supabase.auth.signOut();
    if (error) {
      authLogger.error("Error signing out:", error);
    }
    return { error };
  }, []);

  return {
    user: state.user,
    session: state.session,
    loading: state.loading,
    isAuthenticated: !!state.user,
    signOut,
  };
}
