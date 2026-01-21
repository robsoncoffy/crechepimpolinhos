import { useEffect } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import { useAuth, AuthProvider } from "@/hooks/useAuth";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { ProtectedRoute } from "@/components/admin/ProtectedRoute";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import TeacherDashboard from "@/pages/admin/TeacherDashboard";
import AdminApprovals from "@/pages/admin/AdminApprovals";
import AdminTeachers from "@/pages/admin/AdminTeachers";
import AdminChildren from "@/pages/admin/AdminChildren";
import AdminAgenda from "@/pages/admin/AdminAgenda";
import AdminMessages from "@/pages/admin/AdminMessages";
import AdminGrowth from "@/pages/admin/AdminGrowth";
import AdminMenu from "@/pages/admin/AdminMenu";
import AdminGallery from "@/pages/admin/AdminGallery";
import AdminEvents from "@/pages/admin/AdminEvents";
import AdminEmployeeInvites from "@/pages/admin/AdminEmployeeInvites";
import AdminAttendance from "@/pages/admin/AdminAttendance";
import AdminParentInvites from "@/pages/admin/AdminParentInvites";
import AdminAnnouncements from "@/pages/admin/AdminAnnouncements";
import AdminPayments from "@/pages/admin/AdminPayments";
import AdminContracts from "@/pages/admin/AdminContracts";
import AdminStaffChat from "@/pages/admin/AdminStaffChat";
import AdminProfiles from "@/pages/admin/AdminProfiles";
import AdminTimeClock from "@/pages/admin/AdminTimeClock";
import AdminQuarterlyEvaluations from "@/pages/admin/AdminQuarterlyEvaluations";
import AdminReports from "@/pages/admin/AdminReports";
import AdminAbsences from "@/pages/admin/AdminAbsences";
import NutritionistDashboard from "@/pages/admin/NutritionistDashboard";
import CookDashboard from "@/pages/admin/CookDashboard";
import PedagogueDashboard from "@/pages/admin/PedagogueDashboard";
import AuxiliarDashboard from "@/pages/admin/AuxiliarDashboard";
import AdminPreEnrollments from "@/pages/admin/AdminPreEnrollments";
import AdminEmails from "@/pages/admin/AdminEmails";
import AdminConfig from "@/pages/admin/AdminConfig";
import AdminFeed from "@/pages/admin/AdminFeed";
import AdminEmployees from "@/pages/admin/AdminEmployees";
import ParentDashboard from "@/pages/parent/ParentDashboard";
import AdminContactSubmissions from "@/pages/admin/AdminContactSubmissions";
import AdminAuditLogs from "@/pages/admin/AdminAuditLogs";
import AdminNotifications from "@/pages/admin/AdminNotifications";
import AdminMealTracking from "@/pages/admin/AdminMealTracking";
import AdminPickupHistory from "@/pages/admin/AdminPickupHistory";
import AdminEmailLogs from "@/pages/admin/AdminEmailLogs";
import { Loader2 } from "lucide-react";
// Component to select the right dashboard based on role
function RoleBasedDashboard() {
  const { isAdmin, isTeacher, isNutritionist, isCook, isPedagogue, isAuxiliar } = useAuth();

  // Priority order: Admin > Teacher > Nutritionist > Cook > Pedagogue > Auxiliar
  if (isAdmin) return <AdminDashboard />;
  if (isTeacher) return <TeacherDashboard />;
  if (isNutritionist) return <NutritionistDashboard />;
  if (isCook) return <CookDashboard />;
  if (isPedagogue) return <PedagogueDashboard />;
  if (isAuxiliar) return <AuxiliarDashboard />;
  
  return <AdminDashboard />;
}

function DashboardContent() {
  const { user, loading, isParent, isStaff } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Staff (Admin, Teacher, Cook, Nutritionist, Pedagogue, Auxiliar) - show admin panel with layout
  if (isStaff) {
    return (
      <AdminLayout>
        <Routes>
          <Route path="/" element={<RoleBasedDashboard />} />
          
          {/* Admin only routes */}
          <Route path="/aprovacoes" element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminApprovals />
            </ProtectedRoute>
          } />
          <Route path="/professores" element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminTeachers />
            </ProtectedRoute>
          } />
          <Route path="/convites" element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminEmployeeInvites />
            </ProtectedRoute>
          } />
          <Route path="/convites-pais" element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminParentInvites />
            </ProtectedRoute>
          } />
          <Route path="/financeiro" element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminPayments />
            </ProtectedRoute>
          } />
          <Route path="/contratos" element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminContracts />
            </ProtectedRoute>
          } />
          <Route path="/perfis" element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminProfiles />
            </ProtectedRoute>
          } />
          <Route path="/ponto" element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminTimeClock />
            </ProtectedRoute>
          } />
          <Route path="/pre-matriculas" element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminPreEnrollments />
            </ProtectedRoute>
          } />
          <Route path="/emails" element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminEmails />
            </ProtectedRoute>
          } />
          <Route path="/config" element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminConfig />
            </ProtectedRoute>
          } />
          <Route path="/funcionarios" element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminEmployees />
            </ProtectedRoute>
          } />
          
          {/* Admin + Teacher routes */}
          <Route path="/avisos" element={
            <ProtectedRoute allowedRoles={["admin", "teacher"]}>
              <AdminAnnouncements />
            </ProtectedRoute>
          } />
          <Route path="/galeria" element={
            <ProtectedRoute allowedRoles={["admin", "teacher"]}>
              <AdminGallery />
            </ProtectedRoute>
          } />
          <Route path="/feed" element={
            <ProtectedRoute allowedRoles={["admin", "teacher"]}>
              <AdminFeed />
            </ProtectedRoute>
          } />
          
          {/* Admin + Teacher + Auxiliar routes */}
          <Route path="/criancas" element={
            <ProtectedRoute allowedRoles={["admin", "teacher", "pedagogue", "auxiliar"]}>
              <AdminChildren />
            </ProtectedRoute>
          } />
          <Route path="/chamada" element={
            <ProtectedRoute allowedRoles={["admin", "teacher", "auxiliar"]}>
              <AdminAttendance />
            </ProtectedRoute>
          } />
          <Route path="/mensagens" element={
            <ProtectedRoute allowedRoles={["admin", "teacher", "auxiliar"]}>
              <AdminMessages />
            </ProtectedRoute>
          } />
          
          {/* Admin + Teacher + Pedagogue routes */}
          <Route path="/agenda" element={
            <ProtectedRoute allowedRoles={["admin", "teacher", "auxiliar", "pedagogue"]}>
              <AdminAgenda />
            </ProtectedRoute>
          } />
          <Route path="/crescimento" element={
            <ProtectedRoute allowedRoles={["admin", "teacher", "pedagogue"]}>
              <AdminGrowth />
            </ProtectedRoute>
          } />
          <Route path="/eventos" element={
            <ProtectedRoute allowedRoles={["admin", "teacher", "pedagogue"]}>
              <AdminEvents />
            </ProtectedRoute>
          } />
          <Route path="/avaliacoes" element={
            <ProtectedRoute allowedRoles={["admin", "pedagogue"]}>
              <AdminQuarterlyEvaluations />
            </ProtectedRoute>
          } />
          <Route path="/relatorios" element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminReports />
            </ProtectedRoute>
          } />
          <Route path="/ausencias" element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminAbsences />
            </ProtectedRoute>
          } />
          
          {/* Admin + Nutritionist + Cook routes */}
          <Route path="/cardapio" element={
            <ProtectedRoute allowedRoles={["admin", "nutritionist", "cook"]}>
              <AdminMenu />
            </ProtectedRoute>
          } />
          
          {/* All staff can access */}
          <Route path="/chat-equipe" element={<AdminStaffChat />} />
        </Routes>
      </AdminLayout>
    );
  }

  // Parent only (not staff) - show parent panel
  if (isParent) {
    return <ParentDashboard />;
  }

  // Fallback
  return (
    <div className="min-h-screen flex items-center justify-center">
      <p>Acesso não autorizado</p>
    </div>
  );
}

export default function Dashboard() {
  return (
    <AuthProvider>
      <DashboardContent />
    </AuthProvider>
  );
}
