import { createContext, useContext, ReactNode, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Database } from "@/integrations/supabase/types";
import { logger } from "@/lib/logger";

type Child = Database["public"]["Tables"]["children"]["Row"];
type Profile = Database["public"]["Tables"]["profiles"]["Row"];

interface AppDataContextType {
  // Children data
  children: Child[];
  childrenLoading: boolean;
  refetchChildren: () => void;
  
  // Approved profiles (parents)
  approvedProfiles: Profile[];
  profilesLoading: boolean;
  refetchProfiles: () => void;
  
  // Parent-children mappings
  parentChildrenMap: Map<string, string[]>;
  childParentsMap: Map<string, string[]>;
  parentChildrenLoading: boolean;
}

const AppDataContext = createContext<AppDataContextType | undefined>(undefined);

const STALE_TIME = 1000 * 60 * 5; // 5 minutes

export function AppDataProvider({ children }: { children: ReactNode }) {
  const { user, isStaff } = useAuth();
  const dataLogger = logger.withContext('AppData');

  // Fetch all children (staff only)
  const {
    data: allChildren = [],
    isLoading: childrenLoading,
    refetch: refetchChildren,
  } = useQuery({
    queryKey: ["app-children"],
    queryFn: async () => {
      dataLogger.info("Buscando crianças");
      const { data, error } = await supabase
        .from("children")
        .select("*")
        .order("full_name");
      
      if (error) {
        dataLogger.error("Erro ao buscar crianças:", error);
        throw error;
      }
      
      dataLogger.info(`${data?.length || 0} crianças carregadas`);
      return data || [];
    },
    staleTime: STALE_TIME,
    enabled: !!user && isStaff,
  });

  // Fetch approved profiles
  const {
    data: approvedProfiles = [],
    isLoading: profilesLoading,
    refetch: refetchProfiles,
  } = useQuery({
    queryKey: ["app-profiles-approved"],
    queryFn: async () => {
      dataLogger.info("Buscando perfis aprovados");
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("status", "approved")
        .order("full_name");
      
      if (error) {
        dataLogger.error("Erro ao buscar perfis:", error);
        throw error;
      }
      
      dataLogger.info(`${data?.length || 0} perfis aprovados carregados`);
      return data || [];
    },
    staleTime: STALE_TIME,
    enabled: !!user && isStaff,
  });

  // Fetch parent-children mappings
  const {
    data: parentChildrenData = [],
    isLoading: parentChildrenLoading,
  } = useQuery({
    queryKey: ["app-parent-children"],
    queryFn: async () => {
      dataLogger.info("Buscando relações pais-filhos");
      const { data, error } = await supabase
        .from("parent_children")
        .select("parent_id, child_id");
      
      if (error) {
        dataLogger.error("Erro ao buscar relações:", error);
        throw error;
      }
      
      dataLogger.info(`${data?.length || 0} relações carregadas`);
      return data || [];
    },
    staleTime: STALE_TIME,
    enabled: !!user && isStaff,
  });

  // ⚡ OTIMIZAÇÃO: Usar useMemo para evitar recalcular os Maps em todo render
  const parentChildrenMap = useMemo(() => {
    const map = new Map<string, string[]>();
    
    parentChildrenData.forEach(({ parent_id, child_id }) => {
      if (!map.has(parent_id)) {
        map.set(parent_id, []);
      }
      map.get(parent_id)!.push(child_id);
    });

    return map;
  }, [parentChildrenData]);

  const childParentsMap = useMemo(() => {
    const map = new Map<string, string[]>();
    
    parentChildrenData.forEach(({ parent_id, child_id }) => {
      if (!map.has(child_id)) {
        map.set(child_id, []);
      }
      map.get(child_id)!.push(parent_id);
    });

    return map;
  }, [parentChildrenData]);

  const value: AppDataContextType = useMemo(() => ({
    children: allChildren,
    childrenLoading,
    refetchChildren,
    approvedProfiles,
    profilesLoading,
    refetchProfiles,
    parentChildrenMap,
    childParentsMap,
    parentChildrenLoading,
  }), [
    allChildren,
    childrenLoading,
    refetchChildren,
    approvedProfiles,
    profilesLoading,
    refetchProfiles,
    parentChildrenMap,
    childParentsMap,
    parentChildrenLoading,
  ]);

  return (
    <AppDataContext.Provider value={value}>
      {children}
    </AppDataContext.Provider>
  );
}

export function useAppData() {
  const context = useContext(AppDataContext);
  if (context === undefined) {
    throw new Error("useAppData must be used within an AppDataProvider");
  }
  return context;
}

// Optional hook that returns undefined if outside provider (for gradual migration)
export function useAppDataOptional() {
  return useContext(AppDataContext);
}
