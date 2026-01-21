import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Bell,
  Search,
  Loader2,
  Plus,
  Send,
  Users,
  User,
  MessageSquare,
  Calendar,
  AlertTriangle,
  Info,
  CheckCircle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string | null;
  is_read: boolean | null;
  link: string | null;
  created_at: string | null;
  user_name?: string;
}

interface Profile {
  user_id: string;
  full_name: string;
}

const TYPE_CONFIG: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  info: { icon: Info, color: "text-blue-500", label: "Informação" },
  warning: { icon: AlertTriangle, color: "text-orange-500", label: "Aviso" },
  success: { icon: CheckCircle, color: "text-green-500", label: "Sucesso" },
  message: { icon: MessageSquare, color: "text-primary", label: "Mensagem" },
  pickup: { icon: User, color: "text-purple-500", label: "Busca" },
  evaluation: { icon: Calendar, color: "text-cyan-500", label: "Avaliação" },
};

export default function AdminNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sending, setSending] = useState(false);
  
  const [newNotification, setNewNotification] = useState({
    title: "",
    message: "",
    type: "info",
    targetType: "all", // all, staff, parents, specific
    targetUserId: "",
    link: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const [notificationsRes, profilesRes] = await Promise.all([
        supabase
          .from("notifications")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(200),
        supabase
          .from("profiles")
          .select("user_id, full_name")
          .eq("status", "approved"),
      ]);

      if (notificationsRes.error) throw notificationsRes.error;
      if (profilesRes.error) throw profilesRes.error;

      const profileMap = new Map((profilesRes.data || []).map(p => [p.user_id, p.full_name]));
      
      const notificationsWithNames = (notificationsRes.data || []).map(n => ({
        ...n,
        user_name: profileMap.get(n.user_id) || "Usuário",
      }));

      setNotifications(notificationsWithNames);
      setProfiles(profilesRes.data || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  }

  async function sendNotification() {
    if (!newNotification.title.trim() || !newNotification.message.trim()) {
      toast.error("Preencha título e mensagem");
      return;
    }

    setSending(true);
    try {
      let targetUserIds: string[] = [];

      if (newNotification.targetType === "specific") {
        if (!newNotification.targetUserId) {
          toast.error("Selecione um usuário");
          setSending(false);
          return;
        }
        targetUserIds = [newNotification.targetUserId];
      } else if (newNotification.targetType === "all") {
        targetUserIds = profiles.map(p => p.user_id);
      } else if (newNotification.targetType === "staff") {
        const { data: staffRoles } = await supabase
          .from("user_roles")
          .select("user_id")
          .in("role", ["admin", "teacher", "cook", "nutritionist", "pedagogue", "auxiliar"]);
        targetUserIds = [...new Set((staffRoles || []).map(r => r.user_id))];
      } else if (newNotification.targetType === "parents") {
        const { data: parentRoles } = await supabase
          .from("user_roles")
          .select("user_id")
          .eq("role", "parent");
        
        // Filter to only approved parents
        const approvedParentIds = profiles.map(p => p.user_id);
        targetUserIds = (parentRoles || [])
          .map(r => r.user_id)
          .filter(id => approvedParentIds.includes(id));
      }

      if (targetUserIds.length === 0) {
        toast.error("Nenhum usuário encontrado para enviar");
        setSending(false);
        return;
      }

      const notificationsToInsert = targetUserIds.map(userId => ({
        user_id: userId,
        title: newNotification.title,
        message: newNotification.message,
        type: newNotification.type,
        link: newNotification.link || null,
      }));

      const { error } = await supabase
        .from("notifications")
        .insert(notificationsToInsert);

      if (error) throw error;

      toast.success(`Notificação enviada para ${targetUserIds.length} usuário(s)`);
      setDialogOpen(false);
      setNewNotification({
        title: "",
        message: "",
        type: "info",
        targetType: "all",
        targetUserId: "",
        link: "",
      });
      fetchData();
    } catch (error) {
      console.error("Error sending notification:", error);
      toast.error("Erro ao enviar notificação");
    } finally {
      setSending(false);
    }
  }

  const getTypeConfig = (type: string | null) => {
    return TYPE_CONFIG[type || "info"] || TYPE_CONFIG.info;
  };

  const filteredNotifications = notifications.filter(n =>
    n.title.toLowerCase().includes(search.toLowerCase()) ||
    n.message.toLowerCase().includes(search.toLowerCase()) ||
    (n.user_name?.toLowerCase().includes(search.toLowerCase()) || false)
  );

  const unreadCount = notifications.filter(n => !n.is_read).length;

  // Group by date
  const groupedByDate = filteredNotifications.reduce((acc, notification) => {
    const date = format(new Date(notification.created_at || new Date()), "yyyy-MM-dd");
    if (!acc[date]) acc[date] = [];
    acc[date].push(notification);
    return acc;
  }, {} as Record<string, Notification[]>);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-fredoka text-2xl lg:text-3xl font-bold text-foreground flex items-center gap-2">
            <Bell className="w-7 h-7 text-primary" />
            Central de Notificações
          </h1>
          <p className="text-muted-foreground">
            Gerencie e envie notificações para usuários
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nova Notificação
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Bell className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{notifications.length}</p>
                <p className="text-sm text-muted-foreground">Total enviadas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/10">
                <AlertTriangle className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{unreadCount}</p>
                <p className="text-sm text-muted-foreground">Não lidas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <Users className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{profiles.length}</p>
                <p className="text-sm text-muted-foreground">Usuários ativos</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar notificações..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Notifications List */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Notificações</CardTitle>
        </CardHeader>
        <CardContent>
          {Object.keys(groupedByDate).length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhuma notificação encontrada.
            </p>
          ) : (
            <ScrollArea className="h-[500px]">
              <div className="space-y-6">
                {Object.entries(groupedByDate).map(([date, notifs]) => (
                  <div key={date}>
                    <h3 className="text-sm font-medium text-muted-foreground mb-3">
                      {format(new Date(date), "EEEE, dd 'de' MMMM", { locale: ptBR })}
                    </h3>
                    <div className="space-y-2">
                      {notifs.map((notification) => {
                        const typeConfig = getTypeConfig(notification.type);
                        const Icon = typeConfig.icon;
                        
                        return (
                          <div
                            key={notification.id}
                            className={`p-3 rounded-lg border ${
                              !notification.is_read ? "bg-primary/5 border-primary/20" : ""
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${typeConfig.color}`} />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-medium">{notification.title}</span>
                                  {!notification.is_read && (
                                    <Badge variant="secondary" className="text-xs">Novo</Badge>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground line-clamp-2">
                                  {notification.message}
                                </p>
                                <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <User className="w-3 h-3" />
                                    {notification.user_name}
                                  </span>
                                  <span>
                                    {format(new Date(notification.created_at || new Date()), "HH:mm", { locale: ptBR })}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* New Notification Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nova Notificação</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Título</label>
              <Input
                placeholder="Título da notificação"
                value={newNotification.title}
                onChange={(e) => setNewNotification(prev => ({ ...prev, title: e.target.value }))}
              />
            </div>
            
            <div>
              <label className="text-sm font-medium mb-1 block">Mensagem</label>
              <Textarea
                placeholder="Conteúdo da notificação"
                value={newNotification.message}
                onChange={(e) => setNewNotification(prev => ({ ...prev, message: e.target.value }))}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Tipo</label>
                <Select
                  value={newNotification.type}
                  onValueChange={(value) => setNewNotification(prev => ({ ...prev, type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TYPE_CONFIG).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        {config.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Destinatários</label>
                <Select
                  value={newNotification.targetType}
                  onValueChange={(value) => setNewNotification(prev => ({ ...prev, targetType: value, targetUserId: "" }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="staff">Funcionários</SelectItem>
                    <SelectItem value="parents">Pais</SelectItem>
                    <SelectItem value="specific">Usuário específico</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {newNotification.targetType === "specific" && (
              <div>
                <label className="text-sm font-medium mb-1 block">Usuário</label>
                <Select
                  value={newNotification.targetUserId}
                  onValueChange={(value) => setNewNotification(prev => ({ ...prev, targetUserId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um usuário" />
                  </SelectTrigger>
                  <SelectContent>
                    {profiles.map(profile => (
                      <SelectItem key={profile.user_id} value={profile.user_id}>
                        {profile.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <label className="text-sm font-medium mb-1 block">Link (opcional)</label>
              <Input
                placeholder="/painel/..."
                value={newNotification.link}
                onChange={(e) => setNewNotification(prev => ({ ...prev, link: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={sendNotification} disabled={sending}>
              {sending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Enviar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
