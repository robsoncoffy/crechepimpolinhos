import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Camera, Image as ImageIcon, Send, X, Loader2, Newspaper } from "lucide-react";

const classTypeLabels: Record<string, string> = {
  bercario: "Berçário",
  maternal: "Maternal",
  jardim: "Jardim",
};

interface QuickPostCreatorProps {
  onPostCreated?: () => void;
  defaultClassType?: string;
}

export function QuickPostCreator({ onPostCreated, defaultClassType }: QuickPostCreatorProps) {
  const { user, profile } = useAuth();
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [allClasses, setAllClasses] = useState(true);
  const [classType, setClassType] = useState(defaultClassType || "");
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    setIsUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `feed/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("gallery-photos")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("gallery-photos")
        .getPublicUrl(fileName);

      setImageUrl(urlData.publicUrl);
      toast.success("Foto carregada!");
    } catch (error) {
      console.error("Error uploading image:", error);
      toast.error("Erro ao carregar imagem");
      setImagePreview(null);
    } finally {
      setIsUploading(false);
    }
  };

  const removeImage = () => {
    setImageUrl(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async () => {
    if (!content.trim()) {
      toast.error("Digite algo para publicar");
      return;
    }

    if (!user) {
      toast.error("Você precisa estar logado");
      return;
    }

    setIsLoading(true);
    try {
      const postData = {
        content: content.trim(),
        image_url: imageUrl,
        class_type: allClasses ? null : (classType as "bercario" | "maternal" | "jardim" | null) || null,
        all_classes: allClasses,
        created_by: user.id,
      };

      const { error } = await supabase.from("school_feed").insert(postData);

      if (error) throw error;

      toast.success("Publicação criada com sucesso! 🎉");
      setContent("");
      setImageUrl(null);
      setImagePreview(null);
      setAllClasses(true);
      setClassType("");
      onPostCreated?.();
    } catch (error) {
      console.error("Error creating post:", error);
      toast.error("Erro ao criar publicação");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Newspaper className="w-5 h-5 text-primary" />
          Compartilhar com os Pais
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-3">
          <Avatar className="h-10 w-10">
            {profile?.avatar_url && <AvatarImage src={profile.avatar_url} />}
            <AvatarFallback className="bg-primary/10 text-primary">
              {profile?.full_name?.charAt(0) || "?"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-3">
            <Textarea
              placeholder="Compartilhe uma foto ou novidade do dia..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[80px] resize-none"
            />

            {/* Image Preview */}
            {imagePreview && (
              <div className="relative inline-block">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="max-h-40 rounded-lg border"
                />
                <Button
                  size="icon"
                  variant="destructive"
                  className="absolute -top-2 -right-2 h-6 w-6"
                  onClick={removeImage}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            )}

            {/* Options Row */}
            <div className="flex flex-wrap items-center gap-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                {isUploading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Camera className="w-4 h-4 mr-2" />
                )}
                Foto
              </Button>

              <div className="flex items-center gap-2">
                <Switch
                  id="all-classes"
                  checked={allClasses}
                  onCheckedChange={setAllClasses}
                />
                <Label htmlFor="all-classes" className="text-sm">
                  Todas as turmas
                </Label>
              </div>

              {!allClasses && (
                <Select value={classType} onValueChange={setClassType}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Turma" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(classTypeLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={isLoading || !content.trim()}
                className="ml-auto"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                Publicar
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
