import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface SystemSetting {
  id: string;
  key: string;
  value: string | null;
  created_at: string;
  updated_at: string;
}

export function useSystemSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: settings, isLoading, error } = useQuery({
    queryKey: ["system-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("system_settings")
        .select("*")
        .order("key");

      if (error) throw error;
      return data as SystemSetting[];
    },
  });

  const getSetting = (key: string): string | null => {
    const setting = settings?.find((s) => s.key === key);
    return setting?.value ?? null;
  };

  const getSettingWithDefault = (key: string, defaultValue: string): string => {
    return getSetting(key) ?? defaultValue;
  };

  const updateSettingMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      const existing = settings?.find((s) => s.key === key);

      if (existing) {
        const { error } = await supabase
          .from("system_settings")
          .update({ value, updated_at: new Date().toISOString() })
          .eq("key", key);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("system_settings")
          .insert({ key, value });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["system-settings"] });
    },
    onError: (error) => {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMultipleSettings = async (
    settingsToUpdate: { key: string; value: string }[]
  ) => {
    try {
      for (const setting of settingsToUpdate) {
        await updateSettingMutation.mutateAsync(setting);
      }
      toast({
        title: "Configurações salvas",
        description: "As alterações foram salvas com sucesso.",
      });
    } catch (error) {
      // Error already handled by mutation
    }
  };

  return {
    settings,
    isLoading,
    error,
    getSetting,
    getSettingWithDefault,
    updateSetting: updateSettingMutation.mutate,
    updateMultipleSettings,
    isUpdating: updateSettingMutation.isPending,
  };
}
