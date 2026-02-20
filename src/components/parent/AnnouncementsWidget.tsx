import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import {
  Megaphone,
  AlertTriangle,
  Info,
  AlertCircle,
  Bell,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: "low" | "normal" | "high" | "urgent";
  class_type: string | null;
  all_classes: boolean;
  created_at: string;
}

const priorityConfig = {
  low: { label: "Info", color: "bg-muted text-muted-foreground", icon: Info, borderColor: "border-muted" },
  normal: { label: "Aviso", color: "bg-pimpo-blue text-white", icon: Bell, borderColor: "border-pimpo-blue/30" },
  high: { label: "Importante", color: "bg-pimpo-yellow text-yellow-900", icon: AlertCircle, borderColor: "border-pimpo-yellow/50" },
  urgent: { label: "Urgente", color: "bg-pimpo-red text-white", icon: AlertTriangle, borderColor: "border-pimpo-red/50" },
};

export function AnnouncementsWidget() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);

  useEffect(() => {
    const fetchAnnouncements = async () => {
      const { data, error } = await supabase
        .from("announcements")
        .select("id, title, content, priority, class_type, all_classes, created_at")
        .eq("is_active", true)
        .order("priority", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(10);

      if (!error && data) {
        // Sort by priority (urgent first) then by date
        const sortedData = (data as Announcement[]).sort((a, b) => {
          const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 };
          if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
            return priorityOrder[a.priority] - priorityOrder[b.priority];
          }
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
        setAnnouncements(sortedData);
      }
      setLoading(false);
    };

    fetchAnnouncements();

    // Subscribe to realtime updates
    const channel = supabase
      .channel("announcements-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "announcements",
        },
        () => {
          fetchAnnouncements();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (loading) {
    return (
      <Card className="bg-gradient-to-br from-pimpo-yellow/5 to-pimpo-red/5 border-pimpo-yellow/20">
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-pimpo-yellow" />
        </CardContent>
      </Card>
    );
  }

  if (announcements.length === 0) {
    return null; // Don't show widget if no announcements
  }

  // Get the most urgent announcement for highlight
  const urgentAnnouncements = announcements.filter((a) => a.priority === "urgent" || a.priority === "high");

  return (
    <>
      <Card className="bg-gradient-to-br from-pimpo-yellow/5 via-background to-pimpo-red/5 border-pimpo-yellow/30 shadow-md overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-pimpo-yellow" />
            Avisos da Escola
            {urgentAnnouncements.length > 0 && (
              <Badge className="bg-pimpo-red text-white animate-pulse ml-auto">
                {urgentAnnouncements.length} {urgentAnnouncements.length === 1 ? "importante" : "importantes"}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          <ScrollArea className="max-h-[300px]">
            <div className="space-y-3">
              {announcements.map((announcement) => {
                const config = priorityConfig[announcement.priority];
                const PriorityIcon = config.icon;

                return (
                  <button
                    key={announcement.id}
                    onClick={() => setSelectedAnnouncement(announcement)}
                    className={`w-full text-left p-3 rounded-lg border-2 transition-all hover:shadow-md ${config.borderColor} ${
                      announcement.priority === "urgent"
                        ? "bg-pimpo-red/10 hover:bg-pimpo-red/20"
                        : announcement.priority === "high"
                        ? "bg-pimpo-yellow/10 hover:bg-pimpo-yellow/20"
                        : "bg-card hover:bg-muted/50"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-full ${config.color}`}>
                        <PriorityIcon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold truncate">{announcement.title}</h4>
                          <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                          {announcement.content}
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {formatDistanceToNow(new Date(announcement.created_at), {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Detail Modal */}
      <Dialog open={!!selectedAnnouncement} onOpenChange={() => setSelectedAnnouncement(null)}>
        <DialogContent className="sm:max-w-lg">
          {selectedAnnouncement && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 mb-2">
                  <Badge className={priorityConfig[selectedAnnouncement.priority].color}>
                    {priorityConfig[selectedAnnouncement.priority].label}
                  </Badge>
                </div>
                <DialogTitle className="text-xl">{selectedAnnouncement.title}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {selectedAnnouncement.content}
                </p>
                <div className="text-xs text-muted-foreground pt-4 border-t">
                  Publicado em{" "}
                  {format(new Date(selectedAnnouncement.created_at), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", {
                    locale: ptBR,
                  })}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
