import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "./useAuth";

export interface ShoppingItem {
  id: string;
  name: string;
  quantity: string;
  unit: string;
  checked: boolean;
  added_by: string | null;
  added_by_role: string;
  created_at: string;
  updated_at: string;
}

export const unitOptions = [
  { value: "un", label: "un" },
  { value: "kg", label: "kg" },
  { value: "g", label: "g" },
  { value: "L", label: "L" },
  { value: "ml", label: "ml" },
  { value: "cx", label: "cx" },
  { value: "pct", label: "pct" },
  { value: "dz", label: "dz" },
];

export function useShoppingList() {
  const { user, roles } = useAuth();
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Determine role for added_by_role field
  const getUserRole = () => {
    if (roles.includes("cook")) return "cook";
    if (roles.includes("nutritionist")) return "nutritionist";
    if (roles.includes("admin")) return "admin";
    return "admin";
  };

  const fetchItems = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("shopping_list")
        .select("*")
        .order("checked", { ascending: true })
        .order("created_at", { ascending: false });

      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      console.error("Error fetching shopping list:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();

    // Subscribe to realtime changes
    const channel = supabase
      .channel("shopping-list-sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "shopping_list" },
        () => fetchItems()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchItems]);

  const addItem = async (name: string, quantity: string, unit: string) => {
    if (!name.trim() || !user) return false;

    try {
      const { error } = await supabase.from("shopping_list").insert({
        name: name.trim(),
        quantity,
        unit,
        added_by: user.id,
        added_by_role: getUserRole(),
      });

      if (error) throw error;
      toast.success("Item adicionado à lista");
      return true;
    } catch (error) {
      console.error("Error adding item:", error);
      toast.error("Erro ao adicionar item");
      return false;
    }
  };

  const toggleItem = async (id: string, checked: boolean) => {
    try {
      const { error } = await supabase
        .from("shopping_list")
        .update({ checked: !checked })
        .eq("id", id);

      if (error) throw error;
    } catch (error) {
      console.error("Error toggling item:", error);
      toast.error("Erro ao atualizar item");
    }
  };

  const removeItem = async (id: string) => {
    try {
      const { error } = await supabase
        .from("shopping_list")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Item removido");
    } catch (error) {
      console.error("Error removing item:", error);
      toast.error("Erro ao remover item");
    }
  };

  const clearChecked = async () => {
    try {
      const { error } = await supabase
        .from("shopping_list")
        .delete()
        .eq("checked", true);

      if (error) throw error;
      toast.success("Itens comprados removidos");
    } catch (error) {
      console.error("Error clearing checked items:", error);
      toast.error("Erro ao limpar itens");
    }
  };

  const pendingCount = items.filter((i) => !i.checked).length;
  const completedCount = items.filter((i) => i.checked).length;

  return {
    items,
    loading,
    addItem,
    toggleItem,
    removeItem,
    clearChecked,
    pendingCount,
    completedCount,
    refetch: fetchItems,
  };
}
