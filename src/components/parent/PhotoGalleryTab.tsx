import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Camera, Loader2, X, ChevronLeft, ChevronRight, Image as ImageIcon } from "lucide-react";

interface GalleryPhoto {
  id: string;
  title: string;
  description: string | null;
  photo_url: string;
  class_type: string | null;
  created_at: string;
}

interface PhotoGalleryTabProps {
  childClassType?: string;
}

export function PhotoGalleryTab({ childClassType }: PhotoGalleryTabProps) {
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<GalleryPhoto | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    const fetchPhotos = async () => {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('gallery_photos')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (!error && data) {
        setPhotos(data);
      }
      setLoading(false);
    };

    fetchPhotos();
  }, [childClassType]);

  const openPhoto = (photo: GalleryPhoto, index: number) => {
    setSelectedPhoto(photo);
    setSelectedIndex(index);
  };

  const goToPrevious = () => {
    if (selectedIndex > 0) {
      setSelectedIndex(selectedIndex - 1);
      setSelectedPhoto(photos[selectedIndex - 1]);
    }
  };

  const goToNext = () => {
    if (selectedIndex < photos.length - 1) {
      setSelectedIndex(selectedIndex + 1);
      setSelectedPhoto(photos[selectedIndex + 1]);
    }
  };

  const getClassLabel = (classType: string | null) => {
    switch (classType) {
      case 'bercario': return 'Berçário';
      case 'maternal': return 'Maternal';
      case 'jardim': return 'Jardim';
      default: return 'Todas as turmas';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-pimpo-blue" />
      </div>
    );
  }

  if (photos.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 rounded-full bg-pimpo-yellow/10 flex items-center justify-center mx-auto mb-4">
          <Camera className="w-8 h-8 text-pimpo-yellow" />
        </div>
        <h3 className="font-semibold text-lg mb-2">Nenhuma foto ainda</h3>
        <p className="text-muted-foreground text-sm">
          A escola compartilhará fotos e momentos especiais aqui ✨
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Camera className="w-5 h-5 text-pimpo-yellow" />
        <h3 className="font-semibold">Galeria de Momentos</h3>
        <Badge variant="secondary" className="ml-auto">
          {photos.length} {photos.length === 1 ? 'foto' : 'fotos'}
        </Badge>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {photos.map((photo, index) => (
          <Dialog key={photo.id}>
            <DialogTrigger asChild>
              <Card 
                className="overflow-hidden cursor-pointer hover:shadow-lg transition-all group"
                onClick={() => openPhoto(photo, index)}
              >
                <div className="aspect-square relative">
                  <img
                    src={photo.photo_url}
                    alt={photo.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="absolute bottom-2 left-2 right-2">
                      <p className="text-white text-sm font-medium truncate">{photo.title}</p>
                      <p className="text-white/70 text-xs">
                        {format(new Date(photo.created_at), "d 'de' MMM", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                </div>
              </Card>
            </DialogTrigger>
            <DialogContent className="max-w-4xl p-0 bg-black/95 border-none">
              <div className="relative">
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 z-10 text-white hover:bg-white/20"
                  onClick={() => setSelectedPhoto(null)}
                >
                  <X className="w-5 h-5" />
                </Button>
                
                {index > 0 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute left-2 top-1/2 -translate-y-1/2 z-10 text-white hover:bg-white/20"
                    onClick={(e) => { e.stopPropagation(); goToPrevious(); }}
                  >
                    <ChevronLeft className="w-8 h-8" />
                  </Button>
                )}
                
                {index < photos.length - 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-1/2 -translate-y-1/2 z-10 text-white hover:bg-white/20"
                    onClick={(e) => { e.stopPropagation(); goToNext(); }}
                  >
                    <ChevronRight className="w-8 h-8" />
                  </Button>
                )}

                <img
                  src={photo.photo_url}
                  alt={photo.title}
                  className="w-full max-h-[80vh] object-contain"
                />
                
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6">
                  <h3 className="text-white font-semibold text-lg">{photo.title}</h3>
                  {photo.description && (
                    <p className="text-white/80 text-sm mt-1">{photo.description}</p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="secondary" className="bg-white/20 text-white">
                      {getClassLabel(photo.class_type)}
                    </Badge>
                    <span className="text-white/60 text-xs">
                      {format(new Date(photo.created_at), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
                    </span>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        ))}
      </div>
    </div>
  );
}
