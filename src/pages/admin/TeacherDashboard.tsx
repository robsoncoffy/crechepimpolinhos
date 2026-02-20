import { useState, lazy, Suspense, memo, useMemo, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users,
  Baby,
  Calendar,
  MessageSquare,
  CheckCircle2,
  Clock,
  AlertTriangle,
  DollarSign,
  ClipboardCheck,
  Settings,
} from "lucide-react";
import { classTypeLabels, shiftTypeLabels } from "@/lib/constants";
import { DashboardHeader, StatCard, StatGrid } from "@/components/admin/dashboards";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Database } from "@/integrations/supabase/types";

// Extracted Components
import { TeacherAgendaTab } from "@/components/teacher/TeacherAgendaTab";
import { TeacherClassTab } from "@/components/teacher/TeacherClassTab";
import { TeacherAllergiesTab } from "@/components/teacher/TeacherAllergiesTab";
import type { ChildWithRecord, PickupNotification } from "@/components/teacher/TeacherAgendaTab";

// Lazy load heavy components
const StaffChatWindow = lazy(() => import("@/components/staff/StaffChatWindow").then(m => ({ default: m.StaffChatWindow })));
const TeacherParentChat = lazy(() => import("@/components/teacher/TeacherParentChat").then(m => ({ default: m.TeacherParentChat })));
const TeacherAttendanceTab = lazy(() => import("@/components/teacher/TeacherAttendanceTab").then(m => ({ default: m.TeacherAttendanceTab })));
const MyReportsTab = lazy(() => import("@/components/employee/MyReportsTab").then(m => ({ default: m.MyReportsTab })));
const EmployeeSettingsTab = lazy(() => import("@/components/employee/EmployeeSettingsTab").then(m => ({ default: m.EmployeeSettingsTab })));

type ClassType = Database["public"]["Enums"]["class_type"];
type ShiftType = Database["public"]["Enums"]["shift_type"];

interface TeacherAssignment {
  id: string;
  class_type: ClassType;
  shift_type: ShiftType;
  is_primary: boolean;
}

const formatDate = (date: Date): string => date.toISOString().split("T")[0];

const TabLoadingFallback = memo(() => (
  <div className="flex items-center justify-center py-12">
    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary" />
  </div>
));

export default function TeacherDashboard() {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("agenda");
  const selectedDate = useMemo(() => new Date(), []);

  // Fetch teacher's class assignment
  const { data: assignment, isLoading: loadingAssignment } = useQuery({
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
  // IMPORTANT: Only enabled if assignment is true to prevent leaking all table children
  const { data: childrenData, isLoading: loadingChildren } = useQuery({
    queryKey: ["teacher-children", user?.id, assignment?.class_type, assignment?.shift_type, formatDate(selectedDate)],
    queryFn: async () => {
      if (!assignment) return { children: [], allergies: [] };

      const { data: childrenResult } = await supabase
        .from("children")
        .select("*")
        .eq("class_type", assignment.class_type)
        .eq("shift_type", assignment.shift_type)
        .order("full_name");

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
        children: childrenWithRecords as ChildWithRecord[],
        allergies: (childrenResult || []).filter(c => c.allergies || c.dietary_restrictions || c.special_milk),
      };
    },
    // DO NOT run if missing assignment, to prevent leaking all database records to a teacher without a class
    enabled: !!user && !!assignment,
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
        .maybeSingle();

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
    // Removed refetchInterval: 1000 * 60 to prevent unnecessary polling. 
    // Using Supabase Realtime instead below.
  });

  // Realtime subscription for unread messages count
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('teacher_unread_messages')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'staff_messages' },
        (payload) => {
          if (payload.new.sender_id !== user.id) {
            queryClient.invalidateQueries({ queryKey: ["teacher-unread-messages", user.id] });
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'staff_messages' },
        () => {
          queryClient.invalidateQueries({ queryKey: ["teacher-unread-messages", user.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  const completedCount = children.filter((c) => c.daily_record).length;
  const pendingCount = children.length - completedCount;
  const firstName = profile?.full_name?.split(" ")[0] || "Professor";

  if (loadingAssignment || loadingChildren) {
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

  // Handle case where teacher doesn't have an assigned class yet
  if (!assignment && !loadingAssignment) {
    return (
      <div className="space-y-6 w-full max-w-full overflow-hidden">
        <DashboardHeader
          greeting={`Olá, ${firstName}! 👋`}
          subtitle={`Sem turma designada`}
        />
        <Card className="border-dashed border-2 bg-muted/20">
          <CardContent className="py-12 text-center text-muted-foreground">
            <Users className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
            <h2 className="text-xl font-bold text-foreground mb-2">Nenhuma Turma Designada</h2>
            <p>Você ainda não foi designado como professor principal de nenhuma turma. A secretaria precisa cadastrar a sua atribuição de turmas no sistema para que você tenha acesso aos diários e agendas.</p>
          </CardContent>
        </Card>
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
            <TabsContent value="agenda" className="mt-0">
              <TeacherAgendaTab children={children} completedCount={completedCount} />
            </TabsContent>

            <TabsContent value="chamada" className="mt-0">
              <Suspense fallback={<TabLoadingFallback />}>
                <TeacherAttendanceTab children={children} selectedDate={selectedDate} />
              </Suspense>
            </TabsContent>

            <TabsContent value="turma" className="mt-0">
              <TeacherClassTab children={children} />
            </TabsContent>

            <TabsContent value="pais" className="mt-0">
              <Suspense fallback={<TabLoadingFallback />}>
                <TeacherParentChat />
              </Suspense>
            </TabsContent>

            <TabsContent value="alergias" className="mt-0">
              <TeacherAllergiesTab childrenWithAllergies={childrenWithAllergies} />
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
