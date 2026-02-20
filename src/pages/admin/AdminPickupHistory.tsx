import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Car,
  Search,
  Loader2,
  Clock,
  User,
  Baby,
  Calendar,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";

interface PickupNotification {
  id: string;
  child_id: string;
  parent_id: string;
  notification_type: string;
  message: string | null;
  delay_minutes: number | null;
  is_active: boolean;
  created_at: string;
  child_name?: string;
  parent_name?: string;
}

const TYPE_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  on_way: { label: "A caminho", icon: Car, color: "text-green-500" },
  delay: { label: "Atraso", icon: Clock, color: "text-orange-500" },
  other_person: { label: "Outra pessoa", icon: User, color: "text-blue-500" },
};

export default function AdminPickupHistory() {
  const [notifications, setNotifications] = useState<PickupNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  useEffect(() => {
    fetchNotifications();
  }, [selectedDate]);

  async function fetchNotifications() {
    setLoading(true);
    try {
      const dayStart = startOfDay(selectedDate).toISOString();
      const dayEnd = endOfDay(selectedDate).toISOString();

      const { data, error } = await supabase
        .from("pickup_notifications")
        .select("*")
        .gte("created_at", dayStart)
        .lte("created_at", dayEnd)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch child and parent names
      const childIds = [...new Set((data || []).map(n => n.child_id))];
      const parentIds = [...new Set((data || []).map(n => n.parent_id))];

      const [childrenRes, parentsRes] = await Promise.all([
        supabase.from("children").select("id, full_name").in("id", childIds),
        supabase.from("profiles").select("user_id, full_name").in("user_id", parentIds),
      ]);

      const childMap = new Map((childrenRes.data || []).map(c => [c.id, c.full_name]));
      const parentMap = new Map((parentsRes.data || []).map(p => [p.user_id, p.full_name]));

      const notificationsWithNames = (data || []).map(n => ({
        ...n,
        child_name: childMap.get(n.child_id) || "Criança",
        parent_name: parentMap.get(n.parent_id) || "Responsável",
      }));

      setNotifications(notificationsWithNames);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      toast.error("Erro ao carregar histórico");
    } finally {
      setLoading(false);
    }
  }

  const filteredNotifications = notifications.filter(n => {
    const matchesSearch = 
      (n.child_name?.toLowerCase().includes(search.toLowerCase()) || false) ||
      (n.parent_name?.toLowerCase().includes(search.toLowerCase()) || false);
    const matchesType = typeFilter === "all" || n.notification_type === typeFilter;
    return matchesSearch && matchesType;
  });

  const stats = {
    total: notifications.length,
    onWay: notifications.filter(n => n.notification_type === "on_way").length,
    delays: notifications.filter(n => n.notification_type === "delay").length,
    otherPerson: notifications.filter(n => n.notification_type === "other_person").length,
  };

  // Group by hour
  const groupedByHour = filteredNotifications.reduce((acc, notification) => {
    const hour = format(new Date(notification.created_at), "HH:00");
    if (!acc[hour]) acc[hour] = [];
    acc[hour].push(notification);
    return acc;
  }, {} as Record<string, PickupNotification[]>);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-fredoka text-2xl lg:text-3xl font-bold text-foreground flex items-center gap-2">
          <Car className="w-7 h-7 text-primary" />
          Histórico de Buscas
        </h1>
        <p className="text-muted-foreground">
          Registro de notificações de busca enviadas pelos pais
        </p>
      </div>

      {/* Date Navigation */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setSelectedDate(prev => subDays(prev, 1))}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="min-w-[200px]">
                  <Calendar className="w-4 h-4 mr-2" />
                  {format(selectedDate, "EEEE, dd 'de' MMMM", { locale: ptBR })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="center">
                <CalendarPicker
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>
            
            <Button
              variant="outline"
              size="icon"
              onClick={() => setSelectedDate(prev => new Date(prev.getTime() + 86400000))}
              disabled={format(selectedDate, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd")}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-sm text-muted-foreground">Total</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center gap-2">
              <Car className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{stats.onWay}</p>
                <p className="text-sm text-muted-foreground">A caminho</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center gap-2">
              <Clock className="w-5 h-5 text-orange-500" />
              <div>
                <p className="text-2xl font-bold">{stats.delays}</p>
                <p className="text-sm text-muted-foreground">Atrasos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center gap-2">
              <User className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{stats.otherPerson}</p>
                <p className="text-sm text-muted-foreground">Outra pessoa</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por criança ou responsável..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            <SelectItem value="on_way">A caminho</SelectItem>
            <SelectItem value="delay">Atraso</SelectItem>
            <SelectItem value="other_person">Outra pessoa</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Notifications List */}
      <Card>
        <CardHeader>
          <CardTitle>Notificações do Dia</CardTitle>
        </CardHeader>
        <CardContent>
          {Object.keys(groupedByHour).length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhuma notificação de busca neste dia.
            </p>
          ) : (
            <ScrollArea className="h-[500px]">
              <div className="space-y-6">
                {Object.entries(groupedByHour)
                  .sort((a, b) => b[0].localeCompare(a[0]))
                  .map(([hour, notifs]) => (
                    <div key={hour}>
                      <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        {hour}
                      </h3>
                      <div className="space-y-2">
                        {notifs.map((notification) => {
                          const typeConfig = TYPE_CONFIG[notification.notification_type] || TYPE_CONFIG.on_way;
                          const Icon = typeConfig.icon;
                          
                          return (
                            <div
                              key={notification.id}
                              className={`p-4 rounded-lg border ${
                                notification.is_active ? "bg-primary/5 border-primary/20" : ""
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                <div className={`p-2 rounded-full bg-muted ${typeConfig.color}`}>
                                  <Icon className="w-4 h-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap mb-1">
                                    <span className="font-medium">{notification.child_name}</span>
                                    <Badge variant="outline">{typeConfig.label}</Badge>
                                    {notification.is_active && (
                                      <Badge variant="secondary" className="text-xs">Ativo</Badge>
                                    )}
                                  </div>
                                  
                                  <div className="text-sm text-muted-foreground space-y-1">
                                    <div className="flex items-center gap-1">
                                      <User className="w-3 h-3" />
                                      {notification.parent_name}
                                    </div>
                                    
                                    {notification.notification_type === "delay" && notification.delay_minutes && (
                                      <div className="flex items-center gap-1 text-orange-600">
                                        <AlertTriangle className="w-3 h-3" />
                                        Atraso de {notification.delay_minutes} minutos
                                      </div>
                                    )}
                                    
                                    {notification.message && (
                                      <div className="flex items-start gap-1">
                                        <MessageSquare className="w-3 h-3 mt-0.5" />
                                        <span className="italic">"{notification.message}"</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                                
                                <div className="text-right shrink-0">
                                  <span className="text-xs text-muted-foreground">
                                    {format(new Date(notification.created_at), "HH:mm")}
                                  </span>
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
    </div>
  );
}
