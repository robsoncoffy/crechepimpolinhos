import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Newspaper, ImageIcon } from "lucide-react";

interface FeedPost {
  id: string;
  content: string;
  image_url: string | null;
  class_type: string | null;
  all_classes: boolean;
  created_at: string;
  author_name?: string;
  author_avatar?: string | null;
}

interface SchoolFeedTabProps {
  childClassType: string;
}

const classTypeLabels: Record<string, string> = {
  bercario: "Berçário",
  maternal: "Maternal",
  jardim: "Jardim",
};

export function SchoolFeedTab({ childClassType }: SchoolFeedTabProps) {
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPosts();
    
    // Set up realtime subscription
    const channel = supabase
      .channel('school-feed-parent')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'school_feed',
        },
        () => {
          fetchPosts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [childClassType]);

  const fetchPosts = async () => {
    try {
      // Fetch posts relevant to the child's class
      const { data, error } = await supabase
        .from("school_feed")
        .select("*")
        .or(`all_classes.eq.true,class_type.eq.${childClassType}`)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      // Fetch author info
      const authorIds = [...new Set(data?.map((p) => p.created_by) || [])];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url")
        .in("user_id", authorIds);

      const postsWithAuthors = (data || []).map((post) => {
        const authorProfile = profiles?.find((p) => p.user_id === post.created_by);
        return {
          ...post,
          author_name: authorProfile?.full_name || "Equipe",
          author_avatar: authorProfile?.avatar_url || null,
        };
      });

      setPosts(postsWithAuthors);
    } catch (error) {
      console.error("Error fetching feed:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="space-y-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
            <Skeleton className="h-16 w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Newspaper className="w-12 h-12 text-muted-foreground/50 mb-3" />
        <p className="text-muted-foreground">Nenhuma publicação ainda</p>
        <p className="text-sm text-muted-foreground/70">
          Fique atento! As novidades da escola aparecerão aqui.
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[500px] pr-3">
      <div className="space-y-4">
        {posts.map((post) => (
          <article key={post.id} className="border rounded-lg overflow-hidden bg-card">
            {/* Image */}
            {post.image_url && (
              <div className="relative aspect-video bg-muted">
                <img
                  src={post.image_url}
                  alt="Foto da publicação"
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
            )}

            <div className="p-4">
              {/* Author info */}
              <div className="flex items-center gap-3 mb-3">
                <Avatar className="h-9 w-9">
                  {post.author_avatar && <AvatarImage src={post.author_avatar} />}
                  <AvatarFallback className="bg-primary/10 text-primary text-sm">
                    {post.author_name?.charAt(0) || "E"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{post.author_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(post.created_at), {
                      addSuffix: true,
                      locale: ptBR,
                    })}
                  </p>
                </div>
                {!post.all_classes && post.class_type && (
                  <Badge variant="outline" className="text-xs shrink-0">
                    {classTypeLabels[post.class_type] || post.class_type}
                  </Badge>
                )}
              </div>

              {/* Content */}
              <p className="text-sm whitespace-pre-wrap leading-relaxed">
                {post.content}
              </p>
            </div>
          </article>
        ))}
      </div>
    </ScrollArea>
  );
}
