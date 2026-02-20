import { createContext, useContext, ReactNode, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Database } from "@/integrations/supabase/types";

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

  // Fetch all children (staff only)
  const {
    data: allChildren = [],
    isLoading: childrenLoading,
    refetch: refetchChildren,
  } = useQuery({
    queryKey: ["app-children"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("children")
        .select("*")
        .order("full_name");
      if (error) throw error;
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
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("status", "approved")
        .order("full_name");
      if (error) throw error;
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
      const { data, error } = await supabase
        .from("parent_children")
        .select("parent_id, child_id");
      if (error) throw error;
      return data || [];
    },
    staleTime: STALE_TIME,
    enabled: !!user && isStaff,
  });

  // Create maps for quick lookups
  const { parentChildrenMap, childParentsMap } = useMemo(() => {
    const pMap = new Map<string, string[]>();
    const cMap = new Map<string, string[]>();

    parentChildrenData.forEach(({ parent_id, child_id }) => {
      // Parent -> Children
      if (!pMap.has(parent_id)) {
        pMap.set(parent_id, []);
      }
      pMap.get(parent_id)!.push(child_id);

      // Child -> Parents
      if (!cMap.has(child_id)) {
        cMap.set(child_id, []);
      }
      cMap.get(child_id)!.push(parent_id);
    });

    return { parentChildrenMap: pMap, childParentsMap: cMap };
  }, [parentChildrenData]);

  const value: AppDataContextType = {
    children: allChildren,
    childrenLoading,
    refetchChildren,
    approvedProfiles,
    profilesLoading,
    refetchProfiles,
    parentChildrenMap,
    childParentsMap,
    parentChildrenLoading,
  };

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
