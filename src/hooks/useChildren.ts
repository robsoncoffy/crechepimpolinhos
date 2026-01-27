import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Database } from "@/integrations/supabase/types";

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

export function useChildren() {
  const [children, setChildren] = useState<Child[]>([]);
  const [parents, setParents] = useState<Profile[]>([]);
  const [parentLinks, setParentLinks] = useState<ParentChild[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [childrenRes, parentsRes, linksRes, rolesRes] = await Promise.all([
        supabase.from("children").select("*").order("full_name"),
        supabase.from("profiles").select("id, user_id, full_name").eq("status", "approved"),
        supabase.from("parent_children").select("*"),
        supabase.from("user_roles").select("user_id, role"),
      ]);

      // Auto-update children whose class doesn't match their age
      if (childrenRes.data) {
        const childrenToUpdate = childrenRes.data.filter((child) => {
          const suggestedClass = getSuggestedClassType(child.birth_date);
          return child.class_type !== suggestedClass;
        });

        if (childrenToUpdate.length > 0) {
          const updatePromises = childrenToUpdate.map((child) => {
            const suggestedClass = getSuggestedClassType(child.birth_date);
            return supabase
              .from("children")
              .update({ class_type: suggestedClass })
              .eq("id", child.id);
          });

          await Promise.all(updatePromises);

          const { data: updatedChildren } = await supabase
            .from("children")
            .select("*")
            .order("full_name");

          if (updatedChildren) {
            setChildren(updatedChildren);
            toast.info(`${childrenToUpdate.length} criança(s) teve(ram) a turma atualizada automaticamente`);
          }
        } else {
          setChildren(childrenRes.data);
        }
      }

      if (linksRes.data) setParentLinks(linksRes.data);

      // Filter parents: only include users who have the 'parent' role and NO staff roles
      if (parentsRes.data && rolesRes.data) {
        const staffRoles = ['admin', 'teacher', 'cook', 'nutritionist', 'pedagogue', 'auxiliar'];
        
        const userRolesMap = new Map<string, string[]>();
        rolesRes.data.forEach((r) => {
          const existing = userRolesMap.get(r.user_id) || [];
          existing.push(r.role);
          userRolesMap.set(r.user_id, existing);
        });

        const filteredParents = parentsRes.data.filter((p) => {
          const roles = userRolesMap.get(p.user_id) || [];
          const hasParentRole = roles.includes('parent');
          const hasStaffRole = roles.some((r) => staffRoles.includes(r));
          return hasParentRole && !hasStaffRole;
        });

        setParents(filteredParents);
      } else if (parentsRes.data) {
        setParents(parentsRes.data);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getChildParents = useCallback((childId: string) => {
    const links = parentLinks.filter((l) => l.child_id === childId);
    return links.map((link) => {
      const parent = parents.find((p) => p.user_id === link.parent_id);
      return { ...link, profile: parent };
    });
  }, [parentLinks, parents]);

  const getAvailableParentsForChild = useCallback((childId: string) => {
    const linkedParentIds = parentLinks
      .filter((l) => l.child_id === childId)
      .map((l) => l.parent_id);
    return parents.filter((p) => !linkedParentIds.includes(p.user_id));
  }, [parentLinks, parents]);

  return {
    children,
    parents,
    parentLinks,
    loading,
    refetch: fetchData,
    getChildParents,
    getAvailableParentsForChild,
  };
}
