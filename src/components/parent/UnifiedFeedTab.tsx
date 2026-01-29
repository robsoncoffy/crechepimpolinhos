import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDistanceToNow, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Newspaper, Camera, Bell, ChevronLeft, ChevronRight, X, Megaphone } from "lucide-react";
import { AnnouncementsWidget } from "./AnnouncementsWidget";

interface FeedPost {
  id: string;
  content: string;
  image_url: string | null;
  class_type: string | null;
  all_classes: boolean;
  created_at: string;
  author_name?: string;
  author_avatar?: string | null;
  type: "post";
}

interface GalleryPhoto {
  id: string;
  title: string;
  description: string | null;
  photo_url: string;
  class_type: string | null;
  created_at: string;
  type: "photo";
}

type FeedItem = FeedPost | GalleryPhoto;

interface UnifiedFeedTabProps {
  childClassType: string;
}

const classTypeLabels: Record<string, string> = {
  bercario: "Berçário",
  maternal: "Maternal",
  jardim: "Jardim",
};

export function UnifiedFeedTab({ childClassType }: UnifiedFeedTabProps) {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<GalleryPhoto | null>(null);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [filter, setFilter] = useState<"all" | "posts" | "photos">("all");

  useEffect(() => {
    fetchItems();
    
    const channel = supabase
      .channel('unified-feed-parent')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'school_feed' }, () => fetchItems())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gallery_photos' }, () => fetchItems())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [childClassType]);

  const fetchItems = async () => {
    try {
      // Fetch feed posts
      const { data: posts, error: postsError } = await supabase
        .from("school_feed")
        .select("*")
        .or(`all_classes.eq.true,class_type.eq.${childClassType}`)
        .order("created_at", { ascending: false })
        .limit(30);

      if (postsError) throw postsError;

      // Fetch gallery photos
      const { data: photos, error: photosError } = await supabase
        .from("gallery_photos")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(30);

      if (photosError) throw photosError;

      // Fetch author info for posts
      const authorIds = [...new Set(posts?.map((p) => p.created_by) || [])];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url")
        .in("user_id", authorIds);

      // Map posts with author info
      const mappedPosts: FeedPost[] = (posts || []).map((post) => {
        const authorProfile = profiles?.find((p) => p.user_id === post.created_by);
        return {
          ...post,
          author_name: authorProfile?.full_name || "Equipe",
          author_avatar: authorProfile?.avatar_url || null,
          type: "post" as const,
        };
      });

      // Map photos
      const mappedPhotos: GalleryPhoto[] = (photos || []).map((photo) => ({
        ...photo,
        type: "photo" as const,
      }));

      // Combine and sort by date
      const combined = [...mappedPosts, ...mappedPhotos].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setItems(combined);
    } catch (error) {
      console.error("Error fetching feed:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = items.filter((item) => {
    if (filter === "all") return true;
    if (filter === "posts") return item.type === "post";
    if (filter === "photos") return item.type === "photo";
    return true;
  });

  const photoItems = items.filter((item): item is GalleryPhoto => item.type === "photo");

  const openPhotoViewer = (photo: GalleryPhoto) => {
    const index = photoItems.findIndex((p) => p.id === photo.id);
    setSelectedPhoto(photo);
    setPhotoIndex(index);
  };

  const goToPrevious = () => {
    if (photoIndex > 0) {
      setPhotoIndex(photoIndex - 1);
      setSelectedPhoto(photoItems[photoIndex - 1]);
    }
  };

  const goToNext = () => {
    if (photoIndex < photoItems.length - 1) {
      setPhotoIndex(photoIndex + 1);
      setSelectedPhoto(photoItems[photoIndex + 1]);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-48 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Announcements at top */}
      <AnnouncementsWidget />

      {/* Filter tabs */}
      <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="all" className="gap-1.5">
            <Newspaper className="w-4 h-4" />
            Tudo
          </TabsTrigger>
          <TabsTrigger value="posts" className="gap-1.5">
            <Megaphone className="w-4 h-4" />
            Novidades
          </TabsTrigger>
          <TabsTrigger value="photos" className="gap-1.5">
            <Camera className="w-4 h-4" />
            Fotos
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {filteredItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Newspaper className="w-12 h-12 text-muted-foreground/50 mb-3" />
          <p className="text-muted-foreground">Nenhuma publicação ainda</p>
          <p className="text-sm text-muted-foreground/70">
            Fique atento! As novidades da escola aparecerão aqui.
          </p>
        </div>
      ) : (
        <ScrollArea className="h-[500px] pr-3">
          <div className="space-y-4">
            {filteredItems.map((item) => (
              item.type === "post" ? (
                <PostCard key={`post-${item.id}`} post={item} />
              ) : (
                <PhotoCard key={`photo-${item.id}`} photo={item} onClick={() => openPhotoViewer(item)} />
              )
            ))}
          </div>
        </ScrollArea>
      )}

      {/* Photo viewer dialog */}
      <Dialog open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
        <DialogContent className="max-w-4xl p-0 bg-black/95 border-none">
          {selectedPhoto && (
            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 z-10 text-white hover:bg-white/20"
                onClick={() => setSelectedPhoto(null)}
              >
                <X className="w-5 h-5" />
              </Button>
              
              {photoIndex > 0 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-2 top-1/2 -translate-y-1/2 z-10 text-white hover:bg-white/20"
                  onClick={goToPrevious}
                >
                  <ChevronLeft className="w-8 h-8" />
                </Button>
              )}
              
              {photoIndex < photoItems.length - 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2 z-10 text-white hover:bg-white/20"
                  onClick={goToNext}
                >
                  <ChevronRight className="w-8 h-8" />
                </Button>
              )}

              <img
                src={selectedPhoto.photo_url}
                alt={selectedPhoto.title}
                className="w-full max-h-[80vh] object-contain"
              />
              
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6">
                <h3 className="text-white font-semibold text-lg">{selectedPhoto.title}</h3>
                {selectedPhoto.description && (
                  <p className="text-white/80 text-sm mt-1">{selectedPhoto.description}</p>
                )}
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="secondary" className="bg-white/20 text-white">
                    {classTypeLabels[selectedPhoto.class_type || ""] || "Todas as turmas"}
                  </Badge>
                  <span className="text-white/60 text-xs">
                    {format(new Date(selectedPhoto.created_at), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Post card component
function PostCard({ post }: { post: FeedPost }) {
  return (
    <article className="border rounded-lg overflow-hidden bg-card">
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
              {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: ptBR })}
            </p>
          </div>
          {!post.all_classes && post.class_type && (
            <Badge variant="outline" className="text-xs shrink-0">
              {classTypeLabels[post.class_type] || post.class_type}
            </Badge>
          )}
        </div>

        <p className="text-sm whitespace-pre-wrap leading-relaxed">{post.content}</p>
      </div>
    </article>
  );
}

// Photo card component
function PhotoCard({ photo, onClick }: { photo: GalleryPhoto; onClick: () => void }) {
  return (
    <Card 
      className="overflow-hidden cursor-pointer hover:shadow-lg transition-all group"
      onClick={onClick}
    >
      <div className="aspect-video relative">
        <img
          src={photo.photo_url}
          alt={photo.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute top-2 left-2">
          <Badge className="bg-black/50 text-white border-none gap-1">
            <Camera className="w-3 h-3" />
            Foto
          </Badge>
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="absolute bottom-3 left-3 right-3">
            <p className="text-white text-sm font-medium truncate">{photo.title}</p>
            <p className="text-white/70 text-xs">
              {format(new Date(photo.created_at), "d 'de' MMM", { locale: ptBR })}
            </p>
          </div>
        </div>
      </div>
      <CardContent className="p-3">
        <p className="font-medium text-sm truncate">{photo.title}</p>
        {photo.description && (
          <p className="text-xs text-muted-foreground truncate mt-0.5">{photo.description}</p>
        )}
      </CardContent>
    </Card>
  );
}
