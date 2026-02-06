import { useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Database } from "@/integrations/supabase/types";
import { logger } from "@/lib/logger";

type Child = Database["public"]["Tables"]["children"]["Row"];
type ClassType = Database["public"]["Enums"]["class_type"];

interface Profile {
  id: string;
  user_id: string;
  full_name: string;
}

interface ParentChild {
  id: string;
  parent_id: string;
  child_id: string;
  relationship: string;
  profile?: Profile;
}

// ✅ Função utilitária separada - mais fácil de testar
export function getSuggestedClassType(birthDate: string): ClassType {
  const birth = new Date(birthDate);
  const today = new Date();
  const ageInMonths =
    (today.getFullYear() - birth.getFullYear()) * 12 +
    (today.getMonth() - birth.getMonth());

  if (ageInMonths < 24) return "bercario";
  if (ageInMonths < 36) return "maternal_1";
  if (ageInMonths < 48) return "maternal_2";
  if (ageInMonths < 60) return "jardim_1";
  return "jardim_2";
}

export function isClassMismatch(child: Child): boolean {
  const suggested = getSuggestedClassType(child.birth_date);
  return child.class_type !== suggested;
}

// ✅ Hook separado para buscar crianças
function useFetchChildren() {
  return useQuery({
    queryKey: ["children"],
    queryFn: async () => {
      logger.info("Buscando crianças");
      const { data, error } = await supabase
        .from("children")
        .select("*")
        .order("full_name");

      if (error) {
        logger.error("Erro ao buscar crianças:", error);
        throw error;
      }

      return data || [];
    },
    staleTime: 1000 * 60 * 5,
  });
}

// ✅ Hook separado para atualização automática de turmas
function useAutoClassUpdate(children: Child[]) {
  const updateClasses = useCallback(async () => {
    const childrenToUpdate = children.filter((child) => {
      const suggestedClass = getSuggestedClassType(child.birth_date);
      return child.class_type !== suggestedClass;
    });

    if (childrenToUpdate.length === 0) return;

    logger.info(`Atualizando ${childrenToUpdate.length} crianças de turma`);

    const updatePromises = childrenToUpdate.map((child) => {
      const suggestedClass = getSuggestedClassType(child.birth_date);
      return supabase
        .from("children")
        .update({ class_type: suggestedClass })
        .eq("id", child.id);
    });

    await Promise.all(updatePromises);

    toast.info(
      `${childrenToUpdate.length} criança(s) teve(ram) a turma atualizada automaticamente`
    );

    return childrenToUpdate.length;
  }, [children]);

  return { updateClasses };
}

// ✅ Hook separado para buscar perfis de pais
function useFetchParentProfiles() {
  return useQuery({
    queryKey: ["parent-profiles"],
    queryFn: async () => {
      logger.info("Buscando perfis de pais");
      
      const [profilesRes, rolesRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, user_id, full_name")
          .eq("status", "approved"),
        supabase.from("user_roles").select("user_id, role"),
      ]);

      if (profilesRes.error) {
        logger.error("Erro ao buscar perfis:", profilesRes.error);
        throw profilesRes.error;
      }

      if (rolesRes.error) {
        logger.error("Erro ao buscar roles:", rolesRes.error);
        throw rolesRes.error;
      }

      // Filtrar apenas pais (sem staff)
      const staffRoles = [
        "admin",
        "diretor",
        "teacher",
        "cook",
        "nutritionist",
        "pedagogue",
        "auxiliar",
        "contador",
      ];

      const userRolesMap = new Map<string, string[]>();
      rolesRes.data?.forEach((r) => {
        const existing = userRolesMap.get(r.user_id) || [];
        existing.push(r.role);
        userRolesMap.set(r.user_id, existing);
      });

      const filteredParents =
        profilesRes.data?.filter((p) => {
          const roles = userRolesMap.get(p.user_id) || [];
          const hasParentRole = roles.includes("parent");
          const hasStaffRole = roles.some((r) => staffRoles.includes(r));
          return hasParentRole && !hasStaffRole;
        }) || [];

      logger.info(`${filteredParents.length} pais carregados`);
      return filteredParents;
    },
    staleTime: 1000 * 60 * 5,
  });
}

// ✅ Hook separado para buscar relações pais-filhos
function useFetchParentLinks() {
  return useQuery({
    queryKey: ["parent-children-links"],
    queryFn: async () => {
      logger.info("Buscando relações pais-filhos");
      const { data, error } = await supabase
        .from("parent_children")
        .select("*");

      if (error) {
        logger.error("Erro ao buscar relações:", error);
        throw error;
      }

      return data || [];
    },
    staleTime: 1000 * 60 * 5,
  });
}

// ✅ Hook principal refatorado - agora muito mais limpo!
export function useChildren() {
  const childrenLogger = logger.withContext("useChildren");

  const {
    data: children = [],
    isLoading: childrenLoading,
    refetch: refetchChildren,
  } = useFetchChildren();

  const { data: parents = [], isLoading: parentsLoading } =
    useFetchParentProfiles();

  const { data: parentLinks = [], isLoading: linksLoading } =
    useFetchParentLinks();

  const { updateClasses } = useAutoClassUpdate(children);

  const loading = childrenLoading || parentsLoading || linksLoading;

  // ⚡ OTIMIZAÇÃO: Memoizar funções que criam arrays/objetos
  const getChildParents = useCallback(
    (childId: string) => {
      const links = parentLinks.filter((l) => l.child_id === childId);
      return links.map((link) => {
        const parent = parents.find((p) => p.user_id === link.parent_id);
        return { ...link, profile: parent };
      });
    },
    [parentLinks, parents]
  );

  const getAvailableParentsForChild = useCallback(
    (childId: string) => {
      const linkedParentIds = parentLinks
        .filter((l) => l.child_id === childId)
        .map((l) => l.parent_id);
      return parents.filter((p) => !linkedParentIds.includes(p.user_id));
    },
    [parentLinks, parents]
  );

  // Refetch combinado
  const refetch = useCallback(async () => {
    childrenLogger.info("Refazendo fetch de todos os dados");
    await Promise.all([refetchChildren()]);
  }, [refetchChildren, childrenLogger]);

  return {
    children,
    parents,
    parentLinks,
    loading,
    refetch,
    updateClasses,
    getChildParents,
    getAvailableParentsForChild,
  };
}
