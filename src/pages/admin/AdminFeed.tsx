import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Plus,
  ImagePlus,
  Trash2,
  Edit,
  Loader2,
  Newspaper,
  Heart,
  MessageCircle,
  Send,
} from "lucide-react";

interface FeedPost {
  id: string;
  content: string;
  image_url: string | null;
  class_type: string | null;
  all_classes: boolean;
  created_by: string;
  created_at: string;
  author_name?: string;
}

const classTypeLabels: Record<string, string> = {
  bercario: "Berçário",
  maternal: "Maternal",
  jardim: "Jardim",
};

export default function AdminFeed() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<FeedPost | null>(null);

  // Form state
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [classType, setClassType] = useState<string>("");
  const [allClasses, setAllClasses] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      const { data, error } = await supabase
        .from("school_feed")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch author names
      const authorIds = [...new Set(data?.map((p) => p.created_by) || [])];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", authorIds);

      const postsWithAuthors = (data || []).map((post) => ({
        ...post,
        author_name:
          profiles?.find((p) => p.user_id === post.created_by)?.full_name ||
          "Equipe",
      }));

      setPosts(postsWithAuthors);
    } catch (error) {
      console.error("Error fetching posts:", error);
      toast.error("Erro ao carregar publicações");
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `feed/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("gallery")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("gallery").getPublicUrl(filePath);
      setImageUrl(data.publicUrl);
      toast.success("Imagem carregada!");
    } catch (error) {
      console.error("Error uploading:", error);
      toast.error("Erro ao carregar imagem");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!content.trim()) {
      toast.error("Digite o conteúdo da publicação");
      return;
    }

    setCreating(true);
    try {
      const classTypeValue = allClasses ? null : (classType as "bercario" | "maternal" | "jardim" | null) || null;
      
      const postData = {
        content: content.trim(),
        image_url: imageUrl || null,
        class_type: classTypeValue,
        all_classes: allClasses,
        created_by: user?.id!,
      };

      if (editingPost) {
        const { error } = await supabase
          .from("school_feed")
          .update(postData)
          .eq("id", editingPost.id);

        if (error) throw error;
        toast.success("Publicação atualizada!");
      } else {
        const { error } = await supabase.from("school_feed").insert([postData]);

        if (error) throw error;
        toast.success("Publicação criada!");
      }

      resetForm();
      setIsDialogOpen(false);
      fetchPosts();
    } catch (error) {
      console.error("Error saving post:", error);
      toast.error("Erro ao salvar publicação");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("school_feed").delete().eq("id", id);
      if (error) throw error;
      toast.success("Publicação excluída!");
      fetchPosts();
    } catch (error) {
      console.error("Error deleting:", error);
      toast.error("Erro ao excluir publicação");
    }
  };

  const resetForm = () => {
    setContent("");
    setImageUrl("");
    setClassType("");
    setAllClasses(true);
    setEditingPost(null);
  };

  const openEditDialog = (post: FeedPost) => {
    setEditingPost(post);
    setContent(post.content);
    setImageUrl(post.image_url || "");
    setClassType(post.class_type || "");
    setAllClasses(post.all_classes);
    setIsDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-fredoka text-3xl lg:text-4xl font-bold text-foreground">
            Feed da Escola
          </h1>
          <p className="text-muted-foreground mt-1">
            Compartilhe momentos e novidades com os pais
          </p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Nova Publicação
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingPost ? "Editar Publicação" : "Nova Publicação"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Conteúdo</Label>
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Compartilhe um momento especial..."
                  rows={4}
                />
              </div>

              <div>
                <Label>Imagem (opcional)</Label>
                <div className="mt-2 flex items-center gap-3">
                  {imageUrl ? (
                    <div className="relative">
                      <img
                        src={imageUrl}
                        alt="Preview"
                        className="w-24 h-24 object-cover rounded-lg"
                      />
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute -top-2 -right-2 h-6 w-6"
                        onClick={() => setImageUrl("")}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  ) : (
                    <label className="cursor-pointer">
                      <div className="w-24 h-24 border-2 border-dashed rounded-lg flex flex-col items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors">
                        {uploading ? (
                          <Loader2 className="w-6 h-6 animate-spin" />
                        ) : (
                          <>
                            <ImagePlus className="w-6 h-6" />
                            <span className="text-xs mt-1">Adicionar</span>
                          </>
                        )}
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageUpload}
                        disabled={uploading}
                      />
                    </label>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <Label>Visível para todas as turmas</Label>
                <Switch checked={allClasses} onCheckedChange={setAllClasses} />
              </div>

              {!allClasses && (
                <div>
                  <Label>Turma específica</Label>
                  <Select value={classType} onValueChange={setClassType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a turma" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bercario">Berçário</SelectItem>
                      <SelectItem value="maternal">Maternal</SelectItem>
                      <SelectItem value="jardim">Jardim</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <Button
                onClick={handleSubmit}
                disabled={creating || !content.trim()}
                className="w-full"
              >
                {creating ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                {editingPost ? "Salvar Alterações" : "Publicar"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Posts Grid */}
      {posts.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Newspaper className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhuma publicação ainda</h3>
            <p className="text-muted-foreground mb-4">
              Comece a compartilhar momentos especiais com os pais!
            </p>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Criar primeira publicação
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <Card key={post.id} className="overflow-hidden">
              {post.image_url && (
                <div className="aspect-video bg-muted">
                  <img
                    src={post.image_url}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-primary/10 text-primary text-xs">
                        {post.author_name?.charAt(0) || "E"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{post.author_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(post.created_at), "d 'de' MMM 'às' HH:mm", {
                          locale: ptBR,
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openEditDialog(post)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir publicação?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta ação não pode ser desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(post.id)}>
                            Excluir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>

                <p className="text-sm mb-3 whitespace-pre-wrap">{post.content}</p>

                <div className="flex items-center justify-between">
                  {post.all_classes ? (
                    <Badge variant="secondary">Todas as turmas</Badge>
                  ) : (
                    <Badge variant="outline">
                      {classTypeLabels[post.class_type || ""] || post.class_type}
                    </Badge>
                  )}
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <span className="flex items-center gap-1 text-xs">
                      <Heart className="w-3.5 h-3.5" /> 0
                    </span>
                    <span className="flex items-center gap-1 text-xs">
                      <MessageCircle className="w-3.5 h-3.5" /> 0
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
