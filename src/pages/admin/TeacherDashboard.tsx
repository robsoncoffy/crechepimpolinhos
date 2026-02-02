import { useState, lazy, Suspense, memo, useMemo } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  DollarSign,
  Car,
  UserCheck,
  Bell,
  ClipboardCheck,
  Settings,
} from "lucide-react";
import { classTypeLabels, shiftTypeLabels } from "@/lib/constants";
import { DashboardHeader, StatCard, StatGrid } from "@/components/admin/dashboards";
import { useQuery } from "@tanstack/react-query";
import type { Database } from "@/integrations/supabase/types";

// Lazy load heavy components
const StaffChatWindow = lazy(() => import("@/components/staff/StaffChatWindow").then(m => ({ default: m.StaffChatWindow })));
const TeacherParentChat = lazy(() => import("@/components/teacher/TeacherParentChat").then(m => ({ default: m.TeacherParentChat })));
const TeacherAttendanceTab = lazy(() => import("@/components/teacher/TeacherAttendanceTab").then(m => ({ default: m.TeacherAttendanceTab })));
const MyReportsTab = lazy(() => import("@/components/employee/MyReportsTab").then(m => ({ default: m.MyReportsTab })));
const EmployeeSettingsTab = lazy(() => import("@/components/employee/EmployeeSettingsTab").then(m => ({ default: m.EmployeeSettingsTab })));

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

const formatDate = (date: Date): string => date.toISOString().split("T")[0];

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

const TabLoadingFallback = memo(() => (
  <div className="flex items-center justify-center py-12">
    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary" />
  </div>
));

export default function TeacherDashboard() {
  const { user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState("agenda");
  const selectedDate = useMemo(() => new Date(), []);

  // Fetch teacher's class assignment
  const { data: assignment } = useQuery({
    queryKey: ["teacher-assignment", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("teacher_assignments")
        .select("*")
        .eq("user_id", user!.id)
        .eq("is_primary", true)
        .maybeSingle();
      return data as TeacherAssignment | null;
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 10,
  });

  // Fetch children and their daily records
  const { data: childrenData, isLoading } = useQuery({
    queryKey: ["teacher-children", user?.id, assignment?.class_type, assignment?.shift_type, formatDate(selectedDate)],
    queryFn: async () => {
      let childrenQuery = supabase.from("children").select("*");
      
      if (assignment) {
        childrenQuery = childrenQuery
          .eq("class_type", assignment.class_type)
          .eq("shift_type", assignment.shift_type);
      }
      
      const { data: childrenResult } = await childrenQuery.order("full_name");

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [recordsResult, pickupResult] = await Promise.all([
        supabase
          .from("daily_records")
          .select("*")
          .eq("record_date", formatDate(selectedDate)),
        supabase
          .from("pickup_notifications")
          .select("*")
          .eq("is_active", true)
          .gte("created_at", today.toISOString()),
      ]);

      const childrenWithRecords = (childrenResult || []).map((child) => ({
        ...child,
        daily_record: recordsResult.data?.find((r) => r.child_id === child.id) || null,
        pickup_notification: pickupResult.data?.find((p) => p.child_id === child.id) as PickupNotification | null,
      }));

      return {
        children: childrenWithRecords,
        allergies: (childrenResult || []).filter(c => c.allergies || c.dietary_restrictions || c.special_milk),
      };
    },
    enabled: !!user,
    staleTime: 1000 * 30,
  });

  const children = childrenData?.children || [];
  const childrenWithAllergies = childrenData?.allergies || [];
  
  // Fetch unread messages count
  const { data: unreadMessages = 0 } = useQuery({
    queryKey: ["teacher-unread-messages", user?.id],
    queryFn: async () => {
      const { data: generalRoom } = await supabase
        .from("staff_chat_rooms")
        .select("id")
        .eq("is_general", true)
        .single();

      if (!generalRoom) return 0;

      const { count } = await supabase
        .from("staff_messages")
        .select("*", { count: "exact", head: true })
        .eq("room_id", generalRoom.id)
        .eq("is_read", false)
        .neq("sender_id", user!.id);

      return count || 0;
    },
    enabled: !!user,
    staleTime: 1000 * 30,
    refetchInterval: 1000 * 60,
  });

  const completedCount = children.filter((c) => c.daily_record).length;
  const pendingCount = children.length - completedCount;
  const firstName = profile?.full_name?.split(" ")[0] || "Professor";

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-5 w-48" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full max-w-full overflow-hidden">
      <DashboardHeader
        greeting={`Olá, ${firstName}! 👋`}
        subtitle={
          assignment
            ? `${classTypeLabels[assignment.class_type]} • ${shiftTypeLabels[assignment.shift_type]} • ${selectedDate.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}`
            : `Todas as turmas • ${selectedDate.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}`
        }
      />

      <StatGrid columns={4}>
        <StatCard icon={Baby} iconColor="text-primary" value={children.length} label="Alunos" />
        <StatCard icon={CheckCircle2} iconColor="text-pimpo-green" bgColor="bg-pimpo-green/10" borderColor="border-pimpo-green/30" value={completedCount} label="Agendas prontas" />
        <StatCard icon={Clock} iconColor="text-pimpo-yellow" bgColor={pendingCount > 0 ? "bg-pimpo-yellow/10" : ""} borderColor={pendingCount > 0 ? "border-pimpo-yellow/30" : ""} value={pendingCount} label="Pendentes" />
        <StatCard icon={MessageSquare} iconColor="text-pimpo-blue" bgColor={unreadMessages > 0 ? "bg-pimpo-blue/10" : ""} borderColor={unreadMessages > 0 ? "border-pimpo-blue/30" : ""} value={unreadMessages} label="Mensagens" />
      </StatGrid>

      <Card>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="border-b bg-muted/30 overflow-x-auto scrollbar-hide">
            <TabsList className="w-max min-w-full h-auto p-0 bg-transparent rounded-none flex">
              <TabsTrigger value="agenda" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3 px-3 md:px-4 gap-1.5 whitespace-nowrap flex-shrink-0">
                <Calendar className="w-4 h-4" />
                <span className="text-xs sm:text-sm">Agenda</span>
              </TabsTrigger>
              <TabsTrigger value="chamada" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3 px-3 md:px-4 gap-1.5 whitespace-nowrap flex-shrink-0">
                <ClipboardCheck className="w-4 h-4" />
                <span className="text-xs sm:text-sm">Chamada</span>
              </TabsTrigger>
              <TabsTrigger value="turma" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3 px-3 md:px-4 gap-1.5 whitespace-nowrap flex-shrink-0">
                <Users className="w-4 h-4" />
                <span className="text-xs sm:text-sm">Turma</span>
              </TabsTrigger>
              <TabsTrigger value="pais" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3 px-3 md:px-4 gap-1.5 whitespace-nowrap flex-shrink-0">
                <MessageSquare className="w-4 h-4" />
                <span className="text-xs sm:text-sm">Pais</span>
              </TabsTrigger>
              <TabsTrigger value="alergias" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3 px-3 md:px-4 gap-1.5 whitespace-nowrap flex-shrink-0">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-xs sm:text-sm">Alergias</span>
              </TabsTrigger>
              <TabsTrigger value="mensagens" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3 px-3 md:px-4 gap-1.5 relative whitespace-nowrap flex-shrink-0">
                <Users className="w-4 h-4" />
                <span className="text-xs sm:text-sm">Equipe</span>
                {unreadMessages > 0 && (
                  <Badge variant="destructive" className="h-4 px-1 text-[10px]">
                    {unreadMessages}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="relatorios" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3 px-3 md:px-4 gap-1.5 whitespace-nowrap flex-shrink-0">
                <DollarSign className="w-4 h-4" />
                <span className="text-xs sm:text-sm">Relatórios</span>
              </TabsTrigger>
              <TabsTrigger value="config" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3 px-3 md:px-4 gap-1.5 whitespace-nowrap flex-shrink-0">
                <Settings className="w-4 h-4" />
                <span className="text-xs sm:text-sm">Config</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <CardContent className="p-4">
            <TabsContent value="agenda" className="mt-0 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">Agenda Digital</h3>
                  <p className="text-sm text-muted-foreground">Clique em uma criança para abrir a agenda completa</p>
                </div>
                <Badge variant="outline">{completedCount}/{children.length} preenchidas</Badge>
              </div>

              <ScrollArea className="h-[50vh] max-h-[500px] min-h-[300px]">
                <div className="space-y-2">
                  {children.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Baby className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>Nenhuma criança encontrada na sua turma</p>
                    </div>
                  ) : (
                    children.map((child) => {
                      const pickupBadge = getPickupBadgeInfo(child.pickup_notification);
                      
                      return (
                        <Link key={child.id} to={`/painel/agenda?child=${child.id}`} className="block">
                          <div className={`p-3 rounded-lg border transition-colors cursor-pointer ${
                            child.pickup_notification 
                              ? "bg-gradient-to-r from-background to-blue-50/50 border-blue-200 hover:border-blue-300"
                              : "hover:bg-muted/50"
                          }`}>
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="relative">
                                  <Avatar className="h-10 w-10">
                                    {child.photo_url && <AvatarImage src={child.photo_url} alt={child.full_name} />}
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
                                      {classTypeLabels[child.class_type]}
                                    </p>
                                    {pickupBadge && (
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-5 ${pickupBadge.color}`}>
                                            <pickupBadge.icon className="w-3 h-3 mr-1" />
                                            {pickupBadge.label}
                                          </Badge>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          {child.pickup_notification?.message || "Notificação de busca"}
                                        </TooltipContent>
                                      </Tooltip>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                {(child.allergies || child.dietary_restrictions) && (
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      {child.allergies || child.dietary_restrictions}
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                                {child.daily_record ? (
                                  <Badge className="bg-pimpo-green text-white">
                                    <CheckCircle2 className="w-3 h-3 mr-1" />
                                    Pronta
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-muted-foreground">
                                    <Clock className="w-3 h-3 mr-1" />
                                    Pendente
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </Link>
                      );
                    })
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="chamada" className="mt-0">
              <Suspense fallback={<TabLoadingFallback />}>
                <TeacherAttendanceTab children={children} selectedDate={selectedDate} />
              </Suspense>
            </TabsContent>

            <TabsContent value="turma" className="mt-0">
              <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
                {children.map((child) => (
                  <Card key={child.id} className="overflow-hidden">
                    <CardContent className="p-3 text-center">
                      <Avatar className="h-16 w-16 mx-auto mb-2">
                        {child.photo_url && <AvatarImage src={child.photo_url} />}
                        <AvatarFallback className="text-lg bg-primary/10 text-primary">
                          {child.full_name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <p className="font-medium text-sm truncate">{child.full_name}</p>
                      <p className="text-xs text-muted-foreground">{classTypeLabels[child.class_type]}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="pais" className="mt-0">
              <Suspense fallback={<TabLoadingFallback />}>
                <TeacherParentChat />
              </Suspense>
            </TabsContent>

            <TabsContent value="alergias" className="mt-0">
              {childrenWithAllergies.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <CheckCircle2 className="w-12 h-12 mx-auto mb-4 opacity-50 text-pimpo-green" />
                  <p>Nenhuma criança com alergias ou restrições</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {childrenWithAllergies.map((child) => (
                    <Card key={child.id} className="border-amber-200 bg-amber-50/50">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <Avatar className="h-10 w-10">
                            {child.photo_url && <AvatarImage src={child.photo_url} />}
                            <AvatarFallback className="bg-amber-100 text-amber-700">
                              {child.full_name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold">{child.full_name}</p>
                            {child.allergies && (
                              <div className="mt-1">
                                <Badge variant="destructive" className="text-xs">Alergias</Badge>
                                <p className="text-sm mt-1">{child.allergies}</p>
                              </div>
                            )}
                            {child.dietary_restrictions && (
                              <div className="mt-2">
                                <Badge variant="secondary" className="text-xs">Restrições</Badge>
                                <p className="text-sm mt-1">{child.dietary_restrictions}</p>
                              </div>
                            )}
                            {child.special_milk && (
                              <div className="mt-2">
                                <Badge className="text-xs bg-blue-100 text-blue-700">Leite Especial</Badge>
                                <p className="text-sm mt-1">{child.special_milk}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="mensagens" className="mt-0">
              <Suspense fallback={<TabLoadingFallback />}>
                <StaffChatWindow />
              </Suspense>
            </TabsContent>

            <TabsContent value="relatorios" className="mt-0">
              <Suspense fallback={<TabLoadingFallback />}>
                <MyReportsTab />
              </Suspense>
            </TabsContent>

            <TabsContent value="config" className="mt-0">
              <Suspense fallback={<TabLoadingFallback />}>
                <EmployeeSettingsTab />
              </Suspense>
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>
    </div>
  );
}
