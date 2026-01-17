import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Car, Clock, Check, Bell, X } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface PickupNotification {
  id: string;
  child_id: string;
  parent_id: string;
  notification_type: "on_way" | "delay";
  delay_minutes: number | null;
  message: string | null;
  created_at: string;
  read_at: string | null;
  is_active: boolean;
  child_name?: string;
  parent_name?: string;
}

export function PickupNotificationsWidget() {
  const [notifications, setNotifications] = useState<PickupNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    try {
      // Fetch active notifications from today
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data: notifs, error } = await supabase
        .from("pickup_notifications")
        .select("*")
        .eq("is_active", true)
        .gte("created_at", today.toISOString())
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (notifs && notifs.length > 0) {
        // Fetch child names
        const childIds = [...new Set(notifs.map((n) => n.child_id))];
        const parentIds = [...new Set(notifs.map((n) => n.parent_id))];

        const [childrenRes, profilesRes] = await Promise.all([
          supabase.from("children").select("id, full_name").in("id", childIds),
          supabase.from("profiles").select("user_id, full_name").in("user_id", parentIds),
        ]);

        const childMap = new Map(childrenRes.data?.map((c) => [c.id, c.full_name]) || []);
        const parentMap = new Map(profilesRes.data?.map((p) => [p.user_id, p.full_name]) || []);

        const enriched = notifs.map((n) => ({
          ...n,
          notification_type: n.notification_type as "on_way" | "delay",
          child_name: childMap.get(n.child_id) || "Criança",
          parent_name: parentMap.get(n.parent_id) || "Responsável",
        }));

        setNotifications(enriched);
      } else {
        setNotifications([]);
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();

    // Subscribe to realtime updates
    const channel = supabase
      .channel("pickup-notifications-admin")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "pickup_notifications",
        },
        () => {
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const markAsRead = async (id: string) => {
    try {
      await supabase
        .from("pickup_notifications")
        .update({ is_active: false, read_at: new Date().toISOString() })
        .eq("id", id);

      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="w-4 h-4" />
            Avisos de Busca
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            <div className="h-16 bg-muted rounded-lg" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={notifications.length > 0 ? "border-primary/50 shadow-lg" : ""}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Bell className={`w-4 h-4 ${notifications.length > 0 ? "text-primary animate-bounce" : ""}`} />
          Avisos de Busca
          {notifications.length > 0 && (
            <Badge variant="destructive" className="ml-auto">
              {notifications.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {notifications.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Car className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Nenhum aviso de busca no momento</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notif) => (
              <div
                key={notif.id}
                className={`p-3 rounded-lg border ${
                  notif.notification_type === "on_way"
                    ? "bg-pimpo-green/10 border-pimpo-green/30"
                    : "bg-pimpo-yellow/10 border-pimpo-yellow/30"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2">
                    {notif.notification_type === "on_way" ? (
                      <Car className="w-4 h-4 text-pimpo-green mt-0.5" />
                    ) : (
                      <Clock className="w-4 h-4 text-pimpo-yellow mt-0.5" />
                    )}
                    <div>
                      <p className="font-medium text-sm">
                        {notif.child_name?.split(" ")[0]}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {notif.parent_name}{" "}
                        {notif.notification_type === "on_way" ? (
                          <span className="text-pimpo-green font-medium">está a caminho</span>
                        ) : (
                          <span className="text-pimpo-yellow font-medium">
                            vai atrasar {notif.delay_minutes} min
                          </span>
                        )}
                      </p>
                      {notif.message && (
                        <p className="text-xs text-muted-foreground mt-1 italic">
                          "{notif.message}"
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(notif.created_at), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 shrink-0"
                    onClick={() => markAsRead(notif.id)}
                  >
                    <Check className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
