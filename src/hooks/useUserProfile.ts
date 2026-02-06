import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";
import type { Database } from "@/integrations/supabase/types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

const profileLogger = logger.withContext("UserProfile");

interface UseUserProfileOptions {
  enabled?: boolean;
}

export function useUserProfile(userId: string | undefined, options: UseUserProfileOptions = {}) {
  const { enabled = true } = options;
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["user-profile", userId],
    queryFn: async (): Promise<Profile | null> => {
      if (!userId) return null;

      profileLogger.info("Fetching profile for user:", userId);

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) {
        profileLogger.error("Error fetching profile:", error);
        throw error;
      }

      profileLogger.info("Profile loaded:", data?.full_name || "Not found");
      return data;
    },
    enabled: enabled && !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
  });

  const refetchProfile = () => {
    if (userId) {
      queryClient.invalidateQueries({ queryKey: ["user-profile", userId] });
    }
  };

  return {
    profile: query.data ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetchProfile,
  };
}
