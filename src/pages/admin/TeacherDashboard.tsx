import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { StaffChatWindow } from "@/components/staff/StaffChatWindow";
import { TeacherParentChat } from "@/components/teacher/TeacherParentChat";
import { QuickPostCreator } from "@/components/feed/QuickPostCreator";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Users,
  Baby,
  Calendar,
  MessageSquare,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  Activity,
  Heart,
  Utensils,
  Car,
  UserCheck,
  Bell,
  Newspaper,
} from "lucide-react";
import { toast } from "sonner";
import { classTypeLabels, shiftTypeLabels } from "@/lib/constants";
import type { Database } from "@/integrations/supabase/types";

type Child = Database["public"]["Tables"]["children"]["Row"];
type DailyRecord = Database["public"]["Tables"]["daily_records"]["Row"];
type ClassType = Database["public"]["Enums"]["class_type"];
type ShiftType = Database["public"]["Enums"]["shift_type"];

interface PickupNotification {
  id: string;
  notification_type: "on_way" | "delay" | "other_person";
  delay_minutes: number | null;
  message: string | null;
  created_at: string;
}

interface ChildWithRecord extends Child {
  daily_record?: DailyRecord | null;
  pickup_notification?: PickupNotification | null;
}

interface TeacherAssignment {
  id: string;
  class_type: ClassType;
  shift_type: ShiftType;
  is_primary: boolean;
}

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

// Helper to get pickup notification badge info
const getPickupBadgeInfo = (notification: PickupNotification | null | undefined) => {
  if (!notification) return null;
  
  switch (notification.notification_type) {
    case "on_way":
      return { icon: Car, label: "A caminho", color: "bg-blue-100 text-blue-700 border-blue-300" };
    case "delay":
      return { icon: Clock, label: `Atraso ${notification.delay_minutes}min`, color: "bg-amber-100 text-amber-700 border-amber-300" };
    case "other_person":
      return { icon: UserCheck, label: "Outra pessoa", color: "bg-purple-100 text-purple-700 border-purple-300" };
    default:
      return null;
  }
};


export default function TeacherDashboard() {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("agenda");
  const [selectedDate] = useState(new Date());
  
  // Data states
  const [assignment, setAssignment] = useState<TeacherAssignment | null>(null);
  const [children, setChildren] = useState<ChildWithRecord[]>([]);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [childrenWithAllergies, setChildrenWithAllergies] = useState<Child[]>([]);

  // Fetch teacher's class assignment
  useEffect(() => {
    if (!user) return;
    
    const fetchAssignment = async () => {
      const { data, error } = await supabase
        .from("teacher_assignments")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_primary", true)
        .maybeSingle();
      
      if (error) {
        console.error("Error fetching assignment:", error);
      } else if (data) {
        setAssignment(data);
      }
    };
    
    fetchAssignment();
  }, [user]);

  // Fetch children and their daily records
  useEffect(() => {
    if (!user) return;
    
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch all children (or filter by assignment if available)
        let childrenQuery = supabase.from("children").select("*");
        
        if (assignment) {
          childrenQuery = childrenQuery
            .eq("class_type", assignment.class_type)
            .eq("shift_type", assignment.shift_type);
        }
        
        const { data: childrenData, error: childrenError } = await childrenQuery.order("full_name");
        
        if (childrenError) throw childrenError;

        // Get today's date for filtering
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Fetch today's records and active pickup notifications in parallel
        const [recordsResult, pickupResult] = await Promise.all([
          supabase
            .from("daily_records")
            .select("*")
            .eq("record_date", formatDate(selectedDate)),
          supabase
            .from("pickup_notifications")
            .select("*")
            .eq("is_active", true)
            .gte("created_at", today.toISOString())
        ]);
        
        if (recordsResult.error) throw recordsResult.error;
        
        const recordsData = recordsResult.data;
        const pickupData = pickupResult.data || [];
        
        // Combine children with their records and pickup notifications
        const childrenWithRecords = (childrenData || []).map((child) => ({
          ...child,
          daily_record: recordsData?.find((r) => r.child_id === child.id) || null,
          pickup_notification: pickupData.find((p) => p.child_id === child.id) as PickupNotification | null,
        }));
        
        setChildren(childrenWithRecords);
        
        // Filter children with allergies for quick access
        setChildrenWithAllergies(
          (childrenData || []).filter(
            (c) => c.allergies || c.dietary_restrictions || c.special_milk
          )
        );
        
        // Count unread staff messages
        const { data: generalRoom } = await supabase
          .from("staff_chat_rooms")
          .select("id")
          .eq("is_general", true)
          .single();
        
        if (generalRoom) {
          const { count } = await supabase
            .from("staff_messages")
            .select("*", { count: "exact", head: true })
            .eq("room_id", generalRoom.id)
            .eq("is_read", false)
            .neq("sender_id", user.id);
          
          setUnreadMessages(count || 0);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Erro ao carregar dados");
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();

    // Subscribe to realtime pickup notifications
    const pickupChannel = supabase
      .channel("teacher-pickup-notifications")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "pickup_notifications",
        },
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(pickupChannel);
    };
  }, [user, assignment, selectedDate]);

  const completedCount = children.filter((c) => c.daily_record).length;
  const pendingCount = children.length - completedCount;
  const firstName = profile?.full_name?.split(" ")[0] || "Professor";

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-5 w-48" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-fredoka text-2xl lg:text-3xl font-bold">
          Olá, {firstName}! 👋
        </h1>
        <p className="text-muted-foreground">
          {assignment 
            ? `${classTypeLabels[assignment.class_type]} • ${shiftTypeLabels[assignment.shift_type]}`
            : "Todas as turmas"
          } • {selectedDate.toLocaleDateString("pt-BR", { 
            weekday: "long", 
            day: "numeric", 
            month: "long" 
          })}
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Baby className="w-6 h-6 mx-auto text-primary mb-2" />
            <p className="text-3xl font-fredoka font-bold">{children.length}</p>
            <p className="text-sm text-muted-foreground">Alunos</p>
          </CardContent>
        </Card>
        
        <Card className="bg-pimpo-green/10 border-pimpo-green/30">
          <CardContent className="p-4 text-center">
            <CheckCircle2 className="w-6 h-6 mx-auto text-pimpo-green mb-2" />
            <p className="text-3xl font-fredoka font-bold text-pimpo-green">{completedCount}</p>
            <p className="text-sm text-muted-foreground">Agendas prontas</p>
          </CardContent>
        </Card>
        
        <Card className={pendingCount > 0 ? "bg-pimpo-yellow/10 border-pimpo-yellow/30" : ""}>
          <CardContent className="p-4 text-center">
            <Clock className="w-6 h-6 mx-auto text-pimpo-yellow mb-2" />
            <p className="text-3xl font-fredoka font-bold">{pendingCount}</p>
            <p className="text-sm text-muted-foreground">Pendentes</p>
          </CardContent>
        </Card>
        
        <Card className={unreadMessages > 0 ? "bg-pimpo-blue/10 border-pimpo-blue/30" : ""}>
          <CardContent className="p-4 text-center">
            <MessageSquare className="w-6 h-6 mx-auto text-pimpo-blue mb-2" />
            <p className="text-3xl font-fredoka font-bold">{unreadMessages}</p>
            <p className="text-sm text-muted-foreground">Mensagens</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Card>
        <CardContent className="p-0">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="border-b bg-muted/30">
              <TabsList className="w-full h-auto p-0 bg-transparent rounded-none grid grid-cols-5">
                <TabsTrigger 
                  value="agenda" 
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3 gap-2"
                >
                  <Calendar className="w-4 h-4" />
                  <span className="hidden sm:inline">Agenda</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="turma" 
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3 gap-2"
                >
                  <Users className="w-4 h-4" />
                  <span className="hidden sm:inline">Turma</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="pais" 
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3 gap-2"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span className="hidden sm:inline">Pais</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="alergias" 
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3 gap-2"
                >
                  <AlertTriangle className="w-4 h-4" />
                  <span className="hidden sm:inline">Alergias</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="mensagens" 
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3 gap-2 relative"
                >
                  <Users className="w-4 h-4" />
                  <span className="hidden sm:inline">Equipe</span>
                  {unreadMessages > 0 && (
                    <Badge variant="destructive" className="absolute -top-1 right-2 sm:relative sm:top-0 sm:right-0 h-5 px-1.5">
                      {unreadMessages}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="p-4">
              {/* Agenda Tab */}
              <TabsContent value="agenda" className="mt-0 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">Agenda Digital</h3>
                    <p className="text-sm text-muted-foreground">
                      Clique em uma criança para abrir a agenda completa
                    </p>
                  </div>
                  <Badge variant="outline">
                    {completedCount}/{children.length} preenchidas
                  </Badge>
                </div>

                <ScrollArea className="h-[400px]">
                  <div className="space-y-2">
                    {children.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        <Baby className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>Nenhuma criança encontrada na sua turma</p>
                        {!assignment && (
                          <p className="text-sm mt-2">
                            Peça ao administrador para atribuir você a uma turma
                          </p>
                        )}
                      </div>
                    ) : (
                      children.map((child) => {
                        const pickupBadge = getPickupBadgeInfo(child.pickup_notification);
                        
                        return (
                          <Link
                            key={child.id}
                            to={`/painel/agenda?child=${child.id}`}
                            className="block"
                          >
                            <div className={`p-3 rounded-lg border transition-colors cursor-pointer ${
                              child.pickup_notification 
                                ? "bg-gradient-to-r from-background to-blue-50/50 border-blue-200 hover:border-blue-300"
                                : "hover:bg-muted/50"
                            }`}>
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className="relative">
                                    <Avatar className="h-10 w-10">
                                      {child.photo_url && (
                                        <AvatarImage src={child.photo_url} alt={child.full_name} />
                                      )}
                                      <AvatarFallback className="bg-primary/10 text-primary">
                                        {child.full_name.charAt(0)}
                                      </AvatarFallback>
                                    </Avatar>
                                    {child.pickup_notification && (
                                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center animate-pulse">
                                        <Bell className="w-2.5 h-2.5 text-white" />
                                      </span>
                                    )}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="font-medium truncate">{child.full_name}</p>
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <p className="text-xs text-muted-foreground">
                                        {classTypeLabels[child.class_type]} • {shiftTypeLabels[child.shift_type]}
                                      </p>
                                      {pickupBadge && (
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${pickupBadge.color}`}>
                                              <pickupBadge.icon className="w-3 h-3" />
                                              {pickupBadge.label}
                                            </span>
                                          </TooltipTrigger>
                                          <TooltipContent>
                                            <p className="font-medium">
                                              {child.pickup_notification?.notification_type === "on_way" && "Responsável a caminho"}
                                              {child.pickup_notification?.notification_type === "delay" && `Atraso de ${child.pickup_notification?.delay_minutes} minutos`}
                                              {child.pickup_notification?.notification_type === "other_person" && "Outra pessoa vai buscar"}
                                            </p>
                                            {child.pickup_notification?.message && (
                                              <p className="text-xs text-muted-foreground">{child.pickup_notification.message}</p>
                                            )}
                                          </TooltipContent>
                                        </Tooltip>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="flex items-center gap-2 shrink-0">
                                  {child.allergies && (
                                    <Badge variant="outline" className="text-pimpo-red border-pimpo-red/30 hidden sm:flex">
                                      <AlertTriangle className="w-3 h-3 mr-1" />
                                      Alergia
                                    </Badge>
                                  )}
                                  {child.daily_record ? (
                                    <Badge variant="secondary" className="bg-pimpo-green/20 text-pimpo-green">
                                      <CheckCircle2 className="w-3 h-3 mr-1" />
                                      <span className="hidden sm:inline">Preenchida</span>
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline">
                                      <Clock className="w-3 h-3 mr-1" />
                                      <span className="hidden sm:inline">Pendente</span>
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              
                              {/* Quick summary if record exists */}
                              {child.daily_record && (
                                <div className="mt-2 pt-2 border-t flex gap-4 text-xs text-muted-foreground">
                                  {child.daily_record.lunch && (
                                    <span className="flex items-center gap-1">
                                      <Utensils className="w-3 h-3" />
                                      Almoço: {child.daily_record.lunch === "tudo" ? "✓" : child.daily_record.lunch}
                                    </span>
                                  )}
                                  {child.daily_record.mood && (
                                    <span className="flex items-center gap-1">
                                      Humor: {child.daily_record.mood}
                                    </span>
                                  )}
                                  {child.daily_record.school_notes && (
                                    <span className="flex items-center gap-1">
                                      <FileText className="w-3 h-3" />
                                      Com bilhete
                                    </span>
                                  )}
                                </div>
                            )}
                          </div>
                        </Link>
                      );
                      })
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              {/* Minha Turma Tab */}
              <TabsContent value="turma" className="mt-0 space-y-4">
                <div>
                  <h3 className="font-semibold">Minha Turma</h3>
                  <p className="text-sm text-muted-foreground">
                    Lista completa de alunos com informações de contato
                  </p>
                </div>

                <ScrollArea className="h-[400px]">
                  <div className="space-y-3">
                    {children.map((child) => (
                      <Card key={child.id}>
                        <CardContent className="p-4">
                          <div className="flex items-start gap-4">
                            <Avatar className="h-12 w-12">
                              {child.photo_url && (
                                <AvatarImage src={child.photo_url} alt={child.full_name} />
                              )}
                              <AvatarFallback className="bg-primary/10 text-primary text-lg">
                                {child.full_name.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 space-y-1">
                              <div className="flex items-center justify-between">
                                <p className="font-semibold">{child.full_name}</p>
                                <Badge variant="outline">
                                  {classTypeLabels[child.class_type]}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                Nascimento: {new Date(child.birth_date).toLocaleDateString("pt-BR")}
                              </p>
                              
                              {/* Contact info */}
                              {child.pediatrician_name && (
                                <div className="mt-2 pt-2 border-t">
                                  <p className="text-xs text-muted-foreground">
                                    <Heart className="w-3 h-3 inline mr-1" />
                                    Pediatra: {child.pediatrician_name}
                                    {child.pediatrician_phone && ` - ${child.pediatrician_phone}`}
                                  </p>
                                </div>
                              )}
                              
                              {/* Health info badges */}
                              <div className="flex flex-wrap gap-2 mt-2">
                                {child.allergies && (
                                  <Badge variant="destructive" className="text-xs">
                                    Alergias: {child.allergies}
                                  </Badge>
                                )}
                                {child.special_milk && (
                                  <Badge variant="secondary" className="text-xs">
                                    Leite: {child.special_milk}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>

              {/* Alergias Tab */}
              <TabsContent value="alergias" className="mt-0 space-y-4">
                <div>
                  <h3 className="font-semibold flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-pimpo-red" />
                    Alergias e Restrições Alimentares
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Crianças que precisam de atenção especial na alimentação
                  </p>
                </div>

                {childrenWithAllergies.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-pimpo-green opacity-50" />
                    <p>Nenhuma criança com restrições alimentares</p>
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {childrenWithAllergies.map((child) => (
                      <Card key={child.id} className="border-pimpo-red/30 bg-pimpo-red/5">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="bg-pimpo-red/10 text-pimpo-red">
                                {child.full_name.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            {child.full_name}
                          </CardTitle>
                          <CardDescription>
                            {classTypeLabels[child.class_type]}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          {child.allergies && (
                            <div>
                              <p className="text-xs font-medium text-pimpo-red">Alergias:</p>
                              <p className="text-sm">{child.allergies}</p>
                            </div>
                          )}
                          {child.dietary_restrictions && (
                            <div>
                              <p className="text-xs font-medium text-pimpo-yellow">Restrições:</p>
                              <p className="text-sm">{child.dietary_restrictions}</p>
                            </div>
                          )}
                          {child.special_milk && (
                            <div>
                              <p className="text-xs font-medium text-muted-foreground">Leite especial:</p>
                              <p className="text-sm">{child.special_milk}</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Chat com Pais Tab */}
              <TabsContent value="pais" className="mt-0">
                <div className="-mx-4 -mb-4">
                  <TeacherParentChat />
                </div>
              </TabsContent>

              {/* Chat Equipe Tab */}
              <TabsContent value="mensagens" className="mt-0">
                <div className="h-[500px] -mx-4 -mb-4">
                  <StaffChatWindow />
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </CardContent>
      </Card>

      {/* Quick Post Creator */}
      <QuickPostCreator defaultClassType={assignment?.class_type} />

      {/* Quick Actions */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Button variant="outline" asChild className="h-auto py-4 flex-col gap-2">
          <Link to="/painel/agenda">
            <Calendar className="w-5 h-5 text-primary" />
            <span>Agenda Completa</span>
          </Link>
        </Button>
        <Button variant="outline" asChild className="h-auto py-4 flex-col gap-2">
          <Link to="/painel/feed">
            <Newspaper className="w-5 h-5 text-pimpo-green" />
            <span>Feed da Escola</span>
          </Link>
        </Button>
        <Button variant="outline" asChild className="h-auto py-4 flex-col gap-2">
          <Link to="/painel/galeria">
            <Activity className="w-5 h-5 text-pimpo-blue" />
            <span>Galeria</span>
          </Link>
        </Button>
        <Button variant="outline" asChild className="h-auto py-4 flex-col gap-2">
          <Link to="/painel/chat-equipe">
            <MessageSquare className="w-5 h-5 text-pimpo-yellow" />
            <span>Chat Equipe</span>
          </Link>
        </Button>
      </div>
    </div>
  );
}
