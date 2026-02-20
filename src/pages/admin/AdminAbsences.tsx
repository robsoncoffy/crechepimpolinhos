import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, addMonths, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarOff, Plus, ChevronLeft, ChevronRight, Check, X, Loader2, Calendar as CalendarIcon, User, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { classTypeLabels, shiftTypeLabels } from "@/lib/constants";
import { Database } from "@/integrations/supabase/types";

type ClassType = Database["public"]["Enums"]["class_type"];
type ShiftType = Database["public"]["Enums"]["shift_type"];

interface TeacherAssignment {
  user_id: string;
  class_type: ClassType;
  shift_type: ShiftType;
}

interface Absence {
  id: string;
  employee_id: string;
  type: string;
  start_date: string;
  end_date: string;
  notes: string | null;
  approved_by: string | null;
  status: string;
  created_at: string;
  profiles?: { full_name: string };
}

interface Employee {
  user_id: string;
  full_name: string;
}

const ABSENCE_TYPES: Record<string, { label: string; color: string }> = {
  ferias: { label: "Férias", color: "bg-blue-500" },
  licenca: { label: "Licença", color: "bg-purple-500" },
  atestado: { label: "Atestado", color: "bg-orange-500" },
  falta: { label: "Falta", color: "bg-red-500" },
  folga: { label: "Folga", color: "bg-green-500" },
};

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Pendente", variant: "secondary" },
  approved: { label: "Aprovado", variant: "default" },
  rejected: { label: "Rejeitado", variant: "destructive" },
};

export default function AdminAbsences() {
  const { user, isAdmin } = useAuth();
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [teacherAssignments, setTeacherAssignments] = useState<TeacherAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showDialog, setShowDialog] = useState(false);
  const [selectedAbsence, setSelectedAbsence] = useState<Absence | null>(null);
  const [conflictWarning, setConflictWarning] = useState<{ absenceId: string; message: string } | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    type: "ferias",
    start_date: "",
    end_date: "",
    notes: "",
  });

  useEffect(() => {
    fetchData();
  }, [currentMonth]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch absences for current month view
      const monthStart = startOfMonth(currentMonth);
      const monthEnd = endOfMonth(currentMonth);

      const { data: absencesData, error: absencesError } = await supabase
        .from("employee_absences")
        .select("*, profiles:employee_id(full_name)")
        .or(`start_date.lte.${format(monthEnd, "yyyy-MM-dd")},end_date.gte.${format(monthStart, "yyyy-MM-dd")}`)
        .order("start_date", { ascending: true });

      if (absencesError) throw absencesError;
      setAbsences(absencesData as any || []);

      // Fetch employees for admin dropdown
      if (isAdmin) {
        const { data: employeesData } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .eq("status", "approved");
        
        if (employeesData) setEmployees(employeesData);

        // Fetch teacher assignments for conflict detection
        const { data: assignmentsData } = await supabase
          .from("teacher_assignments")
          .select("user_id, class_type, shift_type");
        
        if (assignmentsData) setTeacherAssignments(assignmentsData as TeacherAssignment[]);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.start_date || !formData.end_date) {
      toast.error("Preencha as datas de início e fim");
      return;
    }

    try {
      const { error } = await supabase
        .from("employee_absences")
        .insert({
          employee_id: user?.id,
          type: formData.type,
          start_date: formData.start_date,
          end_date: formData.end_date,
          notes: formData.notes || null,
          status: "pending",
        });

      if (error) throw error;
      
      toast.success("Solicitação enviada com sucesso!");
      setShowDialog(false);
      setFormData({ type: "ferias", start_date: "", end_date: "", notes: "" });
      fetchData();
    } catch (error) {
      console.error("Error submitting absence:", error);
      toast.error("Erro ao enviar solicitação");
    }
  };

  // Check for coverage conflicts when approving
  const checkCoverageConflict = (absence: Absence): string | null => {
    // Find the teacher's assignment
    const teacherAssignment = teacherAssignments.find(
      (a) => a.user_id === absence.employee_id
    );
    
    if (!teacherAssignment) return null;

    // Find other teachers in the same class/shift
    const sameClassTeachers = teacherAssignments.filter(
      (a) =>
        a.class_type === teacherAssignment.class_type &&
        a.shift_type === teacherAssignment.shift_type &&
        a.user_id !== absence.employee_id
    );

    if (sameClassTeachers.length === 0) {
      // No other teacher in this class - potential conflict
      const className = classTypeLabels[teacherAssignment.class_type];
      const shiftName = shiftTypeLabels[teacherAssignment.shift_type];
      return `A turma ${className} (${shiftName}) ficará sem professor entre ${format(parseISO(absence.start_date), "dd/MM")} e ${format(parseISO(absence.end_date), "dd/MM/yyyy")}.`;
    }

    // Check if the other teachers also have approved absences in the same period
    const absenceStart = parseISO(absence.start_date);
    const absenceEnd = parseISO(absence.end_date);

    const otherTeacherUserIds = sameClassTeachers.map((t) => t.user_id);
    const conflictingAbsences = absences.filter(
      (a) =>
        a.status === "approved" &&
        otherTeacherUserIds.includes(a.employee_id) &&
        parseISO(a.start_date) <= absenceEnd &&
        parseISO(a.end_date) >= absenceStart
    );

    if (conflictingAbsences.length === sameClassTeachers.length) {
      // All other teachers also have absences in this period
      const className = classTypeLabels[teacherAssignment.class_type];
      const shiftName = shiftTypeLabels[teacherAssignment.shift_type];
      return `A turma ${className} (${shiftName}) poderá ficar sem cobertura. Os outros professores da turma também têm ausências neste período.`;
    }

    return null;
  };

  const handleApprovalWithConflictCheck = (absence: Absence, approved: boolean) => {
    if (!approved) {
      handleApproval(absence.id, false);
      return;
    }

    const conflict = checkCoverageConflict(absence);
    if (conflict) {
      setConflictWarning({ absenceId: absence.id, message: conflict });
    } else {
      handleApproval(absence.id, true);
    }
  };

  const confirmApprovalWithConflict = () => {
    if (conflictWarning) {
      handleApproval(conflictWarning.absenceId, true);
      setConflictWarning(null);
    }
  };

  const handleApproval = async (absenceId: string, approved: boolean) => {
    try {
      const { error } = await supabase
        .from("employee_absences")
        .update({
          status: approved ? "approved" : "rejected",
          approved_by: user?.id,
        })
        .eq("id", absenceId);

      if (error) throw error;
      
      toast.success(approved ? "Solicitação aprovada!" : "Solicitação rejeitada");
      fetchData();
    } catch (error) {
      console.error("Error updating absence:", error);
      toast.error("Erro ao processar solicitação");
    }
  };

  // Calendar logic
  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });

  const getAbsencesForDay = (day: Date) => {
    return absences.filter(absence => {
      const start = parseISO(absence.start_date);
      const end = parseISO(absence.end_date);
      return day >= start && day <= end && absence.status === "approved";
    });
  };

  const pendingAbsences = absences.filter(a => a.status === "pending");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-fredoka text-3xl lg:text-4xl font-bold text-foreground flex items-center gap-3">
            <CalendarOff className="w-8 h-8 text-primary" />
            Férias e Ausências
          </h1>
          <p className="text-muted-foreground mt-1">
            Gerencie férias, folgas e licenças da equipe
          </p>
        </div>
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Nova Solicitação
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Solicitar Ausência</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ABSENCE_TYPES).map(([key, { label }]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Data Início</Label>
                  <Input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Data Fim</Label>
                  <Input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Observações (opcional)</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Motivo ou detalhes adicionais..."
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
                  Cancelar
                </Button>
                <Button type="submit">
                  Enviar Solicitação
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="calendar">
        <TabsList>
          <TabsTrigger value="calendar" className="gap-2">
            <CalendarIcon className="w-4 h-4" />
            Calendário
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="approvals" className="gap-2">
              <User className="w-4 h-4" />
              Aprovações
              {pendingAbsences.length > 0 && (
                <Badge variant="destructive" className="ml-1">{pendingAbsences.length}</Badge>
              )}
            </TabsTrigger>
          )}
        </TabsList>

        {/* Calendar View */}
        <TabsContent value="calendar" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <CardTitle className="text-lg capitalize">
                  {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
                </CardTitle>
                <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex gap-2 flex-wrap">
                {Object.entries(ABSENCE_TYPES).map(([key, { label, color }]) => (
                  <div key={key} className="flex items-center gap-1.5">
                    <div className={cn("w-3 h-3 rounded-full", color)} />
                    <span className="text-xs text-muted-foreground">{label}</span>
                  </div>
                ))}
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : (
                <>
                  {/* Days header */}
                  <div className="grid grid-cols-7 gap-1 mb-2">
                    {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map(day => (
                      <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
                        {day}
                      </div>
                    ))}
                  </div>

                  {/* Calendar grid */}
                  <div className="grid grid-cols-7 gap-1">
                    {/* Empty cells for first week alignment */}
                    {Array.from({ length: daysInMonth[0].getDay() }).map((_, i) => (
                      <div key={`empty-${i}`} className="h-24 bg-muted/20 rounded-lg" />
                    ))}

                    {/* Days */}
                    {daysInMonth.map(day => {
                      const dayAbsences = getAbsencesForDay(day);
                      return (
                        <div
                          key={day.toISOString()}
                          className={cn(
                            "h-24 p-1 rounded-lg border transition-colors overflow-hidden",
                            isToday(day) ? "border-primary bg-primary/5" : "border-border bg-card",
                            !isSameMonth(day, currentMonth) && "opacity-50"
                          )}
                        >
                          <div className={cn(
                            "text-sm font-medium mb-1",
                            isToday(day) ? "text-primary" : "text-foreground"
                          )}>
                            {format(day, "d")}
                          </div>
                          <div className="space-y-0.5 overflow-y-auto max-h-16">
                            {dayAbsences.slice(0, 3).map((absence) => (
                              <div
                                key={absence.id}
                                className={cn(
                                  "text-xs text-white px-1 py-0.5 rounded truncate",
                                  ABSENCE_TYPES[absence.type]?.color || "bg-gray-500"
                                )}
                                title={`${absence.profiles?.full_name} - ${ABSENCE_TYPES[absence.type]?.label}`}
                              >
                                {absence.profiles?.full_name?.split(" ")[0]}
                              </div>
                            ))}
                            {dayAbsences.length > 3 && (
                              <div className="text-xs text-muted-foreground">
                                +{dayAbsences.length - 3} mais
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Approvals Tab (Admin only) */}
        {isAdmin && (
          <TabsContent value="approvals" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Solicitações Pendentes</CardTitle>
                <CardDescription>Aprove ou rejeite solicitações de ausência</CardDescription>
              </CardHeader>
              <CardContent>
                {pendingAbsences.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <CalendarOff className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhuma solicitação pendente</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pendingAbsences.map((absence) => (
                      <div
                        key={absence.id}
                        className="flex items-center justify-between p-4 border rounded-lg bg-card hover:bg-accent/5 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center text-white",
                            ABSENCE_TYPES[absence.type]?.color || "bg-gray-500"
                          )}>
                            <CalendarOff className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="font-medium">{absence.profiles?.full_name}</p>
                            <p className="text-sm text-muted-foreground">
                              {ABSENCE_TYPES[absence.type]?.label} • {format(parseISO(absence.start_date), "dd/MM")} - {format(parseISO(absence.end_date), "dd/MM/yyyy")}
                            </p>
                            {absence.notes && (
                              <p className="text-sm text-muted-foreground mt-1">
                                "{absence.notes}"
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-destructive hover:bg-destructive/10"
                            onClick={() => handleApprovalWithConflictCheck(absence, false)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            className="bg-pimpo-green hover:bg-pimpo-green/90"
                            onClick={() => handleApprovalWithConflictCheck(absence, true)}
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* All Absences List */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Todas as Ausências</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {absences.filter(a => a.status !== "pending").map((absence) => (
                    <div
                      key={absence.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-3 h-3 rounded-full",
                          ABSENCE_TYPES[absence.type]?.color || "bg-gray-500"
                        )} />
                        <div>
                          <p className="font-medium text-sm">{absence.profiles?.full_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {ABSENCE_TYPES[absence.type]?.label} • {format(parseISO(absence.start_date), "dd/MM")} - {format(parseISO(absence.end_date), "dd/MM/yyyy")}
                          </p>
                        </div>
                      </div>
                      <Badge variant={STATUS_CONFIG[absence.status]?.variant || "secondary"}>
                        {STATUS_CONFIG[absence.status]?.label || absence.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* Conflict Warning Dialog */}
      <Dialog open={!!conflictWarning} onOpenChange={() => setConflictWarning(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="w-5 h-5" />
              Alerta de Cobertura
            </DialogTitle>
          </DialogHeader>
          <Alert variant="destructive" className="border-amber-500 bg-amber-50 text-amber-800">
            <AlertTriangle className="w-4 h-4" />
            <AlertTitle>Conflito de Cobertura Detectado</AlertTitle>
            <AlertDescription>
              {conflictWarning?.message}
            </AlertDescription>
          </Alert>
          <p className="text-sm text-muted-foreground">
            Considere organizar uma substituição antes de aprovar esta solicitação.
          </p>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setConflictWarning(null)}>
              Cancelar
            </Button>
            <Button
              variant="default"
              className="bg-amber-600 hover:bg-amber-700"
              onClick={confirmApprovalWithConflict}
            >
              Aprovar Mesmo Assim
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}