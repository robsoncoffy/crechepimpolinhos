import { useInfiniteQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";

type Child = Database["public"]["Tables"]["children"]["Row"];

export interface ChildWithRelations extends Child {
    parent_children: {
        id: string;
        parent_id: string;
        relationship: string;
        profiles: {
            id: string;
            full_name: string;
            user_id: string;
        } | null;
    }[];
}

export function useChildrenInfinite(search?: string, classFilter?: string | "all", pageSize = 10) {
    return useInfiniteQuery({
        queryKey: ["children", "infinite", search, classFilter],
        queryFn: async ({ pageParam = 0 }) => {
            const from = pageParam * pageSize;
            const to = from + pageSize - 1;

            let query = supabase
                .from("children")
                .select("*, parent_children(id, parent_id, relationship, profiles(id, full_name, user_id))", { count: "exact" })
                .order("full_name");

            if (search) {
                query = query.ilike("full_name", `%${search}%`);
            }

            if (classFilter && classFilter !== "all") {
                query = query.eq("class_type", classFilter as any);
            }

            const { data, error, count } = await query.range(from, to);

            if (error) throw error;

            return {
                data: data as unknown as ChildWithRelations[],
                count: count || 0,
                nextPage: (data?.length === pageSize && (from + pageSize < (count || 0))) ? pageParam + 1 : undefined
            };
        },
        getNextPageParam: (lastPage) => lastPage.nextPage,
        initialPageParam: 0,
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
}
