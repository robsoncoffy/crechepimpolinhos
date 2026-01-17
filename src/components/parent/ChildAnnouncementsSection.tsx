import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Megaphone,
  AlertTriangle,
  Info,
  AlertCircle,
  Bell,
  Check,
  Loader2,
  Eye,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: "low" | "normal" | "high" | "urgent";
  class_type: string | null;
  all_classes: boolean;
  child_id: string | null;
  created_at: string;
}

interface ChildAnnouncementsSectionProps {
  childId: string;
  childName: string;
}

const priorityConfig = {
  low: { label: "Info", color: "bg-muted text-muted-foreground", icon: Info, borderColor: "border-muted" },
  normal: { label: "Aviso", color: "bg-pimpo-blue text-white", icon: Bell, borderColor: "border-pimpo-blue/30" },
  high: { label: "Importante", color: "bg-pimpo-yellow text-yellow-900", icon: AlertCircle, borderColor: "border-pimpo-yellow/50" },
  urgent: { label: "Urgente", color: "bg-pimpo-red text-white", icon: AlertTriangle, borderColor: "border-pimpo-red/50" },
};

export function ChildAnnouncementsSection({ childId, childName }: ChildAnnouncementsSectionProps) {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [markingRead, setMarkingRead] = useState<string | null>(null);

  const fetchData = async () => {
    if (!user) return;

    // Fetch announcements relevant to this child
    const { data: announcementsData, error: announcementsError } = await supabase
      .from("announcements")
      .select("id, title, content, priority, class_type, all_classes, child_id, created_at")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (announcementsError) {
      console.error("Error fetching announcements:", announcementsError);
    } else if (announcementsData) {
      // Filter for this specific child or general announcements
      const filtered = (announcementsData as Announcement[]).filter(a => 
        a.child_id === childId || a.child_id === null
      );
      
      // Sort by priority
      const sorted = filtered.sort((a, b) => {
        const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 };
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        }
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
      
      setAnnouncements(sorted);
    }

    // Fetch read status
    const { data: readsData, error: readsError } = await supabase
      .from("announcement_reads")
      .select("announcement_id")
      .eq("user_id", user.id);

    if (!readsError && readsData) {
      setReadIds(new Set(readsData.map(r => r.announcement_id)));
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchData();

    // Subscribe to realtime updates
    const channel = supabase
      .channel("child-announcements-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "announcements" },
        () => fetchData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "announcement_reads" },
        () => fetchData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, childId]);

  const markAsRead = async (announcementId: string) => {
    if (!user || readIds.has(announcementId)) return;

    setMarkingRead(announcementId);

    const { error } = await supabase
      .from("announcement_reads")
      .insert([{ announcement_id: announcementId, user_id: user.id }]);

    if (!error) {
      setReadIds(prev => new Set([...prev, announcementId]));
    }

    setMarkingRead(null);
  };

  const handleOpenAnnouncement = (announcement: Announcement) => {
    setSelectedAnnouncement(announcement);
    // Auto-mark as read when opened
    if (!readIds.has(announcement.id)) {
      markAsRead(announcement.id);
    }
  };

  const unreadCount = announcements.filter(a => !readIds.has(a.id)).length;

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-pimpo-yellow" />
        </CardContent>
      </Card>
    );
  }

  if (announcements.length === 0) {
    return null;
  }

  return (
    <>
      <Card className="bg-gradient-to-br from-pimpo-yellow/5 to-pimpo-red/5 border-pimpo-yellow/30">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Megaphone className="w-4 h-4 text-pimpo-yellow" />
            Avisos da Escola
            {unreadCount > 0 && (
              <Badge className="bg-pimpo-red text-white animate-pulse ml-auto">
                {unreadCount} {unreadCount === 1 ? "não lido" : "não lidos"}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-2 space-y-2">
          {announcements.slice(0, 5).map((announcement) => {
            const config = priorityConfig[announcement.priority];
            const PriorityIcon = config.icon;
            const isRead = readIds.has(announcement.id);
            const isForChild = announcement.child_id === childId;

            return (
              <div
                key={announcement.id}
                onClick={() => handleOpenAnnouncement(announcement)}
                className={cn(
                  "p-3 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md",
                  config.borderColor,
                  isRead ? "bg-muted/30 opacity-70" : "bg-card",
                  announcement.priority === "urgent" && !isRead && "bg-pimpo-red/10",
                  announcement.priority === "high" && !isRead && "bg-pimpo-yellow/10"
                )}
              >
                <div className="flex items-start gap-3">
                  <div className={cn("p-1.5 rounded-full", config.color)}>
                    <PriorityIcon className="w-3 h-3" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className={cn("font-medium text-sm truncate", isRead && "font-normal")}>
                        {announcement.title}
                      </h4>
                      {isForChild && (
                        <Badge variant="secondary" className="text-xs shrink-0">
                          Para {childName}
                        </Badge>
                      )}
                      {isRead && (
                        <Check className="w-3 h-3 text-pimpo-green shrink-0 ml-auto" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                      {announcement.content}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(announcement.created_at), {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
          
          {announcements.length > 5 && (
            <p className="text-xs text-muted-foreground text-center pt-2">
              + {announcements.length - 5} avisos anteriores
            </p>
          )}
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
                  {selectedAnnouncement.child_id === childId && (
                    <Badge variant="secondary">Para {childName}</Badge>
                  )}
                  <Check className="w-4 h-4 text-pimpo-green ml-auto" />
                  <span className="text-xs text-muted-foreground">Lido</span>
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
