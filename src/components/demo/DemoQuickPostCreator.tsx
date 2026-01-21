import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Camera, Send, X, Loader2, Newspaper } from "lucide-react";

const classTypeLabels: Record<string, string> = {
  bercario: "Berçário",
  maternal: "Maternal",
  jardim: "Jardim",
};

interface DemoQuickPostCreatorProps {
  userName?: string;
  userInitial?: string;
  defaultClassType?: string;
  onPostCreated?: (post: { content: string; imageUrl: string | null }) => void;
}

export function DemoQuickPostCreator({ 
  userName = "Usuário", 
  userInitial = "U",
  defaultClassType,
  onPostCreated 
}: DemoQuickPostCreatorProps) {
  const [content, setContent] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [allClasses, setAllClasses] = useState(true);
  const [classType, setClassType] = useState(defaultClassType || "");
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
      toast.success("Foto carregada!");
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = () => {
    if (!content.trim()) {
      toast.error("Digite algo para publicar");
      return;
    }

    setIsLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      toast.success("Publicação criada com sucesso! 🎉");
      onPostCreated?.({ content: content.trim(), imageUrl: imagePreview });
      setContent("");
      setImagePreview(null);
      setAllClasses(true);
      setClassType("");
      setIsLoading(false);
    }, 1000);
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
            <AvatarFallback className="bg-primary/10 text-primary">
              {userInitial}
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
              >
                <Camera className="w-4 h-4 mr-2" />
                Foto
              </Button>

              <div className="flex items-center gap-2">
                <Switch
                  id="demo-all-classes"
                  checked={allClasses}
                  onCheckedChange={setAllClasses}
                />
                <Label htmlFor="demo-all-classes" className="text-sm">
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
