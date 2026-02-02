import { useEffect, Suspense, lazy } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import { useAuth, AuthProvider } from "@/hooks/useAuth";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { ProtectedRoute } from "@/components/admin/ProtectedRoute";
import { DashboardViewProvider, useDashboardView } from "@/hooks/useDashboardView";
import { AppDataProvider } from "@/contexts/AppDataContext";
import { Loader2 } from "lucide-react";

// Lazy load all admin pages for code splitting
const AdminDashboard = lazy(() => import("./admin/AdminDashboard"));
const TeacherDashboard = lazy(() => import("./admin/TeacherDashboard"));
const NutritionistDashboard = lazy(() => import("./admin/NutritionistDashboard"));
const CookDashboard = lazy(() => import("./admin/CookDashboard"));
const PedagogueDashboard = lazy(() => import("./admin/PedagogueDashboard"));
const AuxiliarDashboard = lazy(() => import("./admin/AuxiliarDashboard"));
const ParentDashboard = lazy(() => import("./parent/ParentDashboard"));
const AdminApprovals = lazy(() => import("./admin/AdminApprovals"));
const AdminTeachers = lazy(() => import("./admin/AdminTeachers"));
const AdminChildren = lazy(() => import("./admin/AdminChildren"));
const AdminAgenda = lazy(() => import("./admin/AdminAgenda"));
const AdminMessages = lazy(() => import("./admin/AdminMessages"));
const AdminChat = lazy(() => import("./admin/AdminChat"));
const AdminGrowth = lazy(() => import("./admin/AdminGrowth"));
const AdminMenu = lazy(() => import("./admin/AdminMenu"));
const AdminGallery = lazy(() => import("./admin/AdminGallery"));
const AdminEvents = lazy(() => import("./admin/AdminEvents"));
const AdminCalendar = lazy(() => import("./admin/AdminCalendar"));
const AdminVisits = lazy(() => import("./admin/AdminVisits"));
const AdminEmployeeInvites = lazy(() => import("./admin/AdminEmployeeInvites"));
const AdminAttendance = lazy(() => import("./admin/AdminAttendance"));
const AdminParentInvites = lazy(() => import("./admin/AdminParentInvites"));
const AdminAnnouncements = lazy(() => import("./admin/AdminAnnouncements"));
const AdminPayments = lazy(() => import("./admin/AdminPayments"));
const AdminContracts = lazy(() => import("./admin/AdminContracts"));
const AdminStaffChat = lazy(() => import("./admin/AdminStaffChat"));
const AdminProfiles = lazy(() => import("./admin/AdminProfiles"));
const AdminTimeClock = lazy(() => import("./admin/AdminTimeClock"));
const AdminQuarterlyEvaluations = lazy(() => import("./admin/AdminQuarterlyEvaluations"));
const AdminReports = lazy(() => import("./admin/AdminReports"));
const AdminAbsences = lazy(() => import("./admin/AdminAbsences"));
const AdminPreEnrollments = lazy(() => import("./admin/AdminPreEnrollments"));
const AdminGhlEmails = lazy(() => import("./admin/AdminGhlEmails"));
const AdminPipeline = lazy(() => import("./admin/AdminPipeline"));
const AdminConfig = lazy(() => import("./admin/AdminConfig"));
const AdminFeed = lazy(() => import("./admin/AdminFeed"));
const AdminEmployees = lazy(() => import("./admin/AdminEmployees"));
const AdminContactSubmissions = lazy(() => import("./admin/AdminContactSubmissions"));
const AdminAuditLogs = lazy(() => import("./admin/AdminAuditLogs"));
const AdminNotifications = lazy(() => import("./admin/AdminNotifications"));
const AdminMealTracking = lazy(() => import("./admin/AdminMealTracking"));
const AdminPickupHistory = lazy(() => import("./admin/AdminPickupHistory"));
const AdminEmailLogs = lazy(() => import("./admin/AdminEmailLogs"));
const AdminShoppingList = lazy(() => import("./admin/AdminShoppingList"));
const AdminBudgets = lazy(() => import("./admin/AdminBudgets"));
const AdminTimeClockConfig = lazy(() => import("./admin/AdminTimeClockConfig"));

// Loading fallback component
function PageLoader() {
  return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );
}

// Component to select the right dashboard based on view preference
function RoleBasedDashboard() {
  const { currentView } = useDashboardView();

  // Render dashboard based on selected view
  switch (currentView) {
    case "admin": return <AdminDashboard />;
    case "teacher": return <TeacherDashboard />;
    case "nutritionist": return <NutritionistDashboard />;
    case "cook": return <CookDashboard />;
    case "pedagogue": return <PedagogueDashboard />;
    case "auxiliar": return <AuxiliarDashboard />;
    case "parent": return <ParentDashboard />;
    default: return <AdminDashboard />;
  }
}

function DashboardContent() {
  const { user, loading, isParent, isStaff, isApproved, profile } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  // Redirect pending staff to waiting page
  useEffect(() => {
    if (!loading && user && isStaff && profile && profile.status === "pending") {
      navigate("/aguardando-aprovacao");
    }
  }, [loading, user, isStaff, profile, navigate]);

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

  // Staff with pending status should not see admin panel
  if (isStaff && profile?.status === "pending") {
    return null; // Will be redirected by useEffect
  }

  // Staff (Admin, Teacher, Cook, Nutritionist, Pedagogue, Auxiliar) - show admin panel with layout
  if (isStaff) {
    return (
      <AdminLayout>
        <Suspense fallback={<PageLoader />}>
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
            <Route path="/orcamentos" element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AdminBudgets />
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
            <Route path="/ponto/config" element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AdminTimeClockConfig />
              </ProtectedRoute>
            } />
            <Route path="/pre-matriculas" element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AdminPreEnrollments />
              </ProtectedRoute>
            } />
            <Route path="/emails" element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AdminGhlEmails />
              </ProtectedRoute>
            } />
            <Route path="/pipeline" element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AdminPipeline />
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
            <Route path="/calendario" element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AdminCalendar />
              </ProtectedRoute>
            } />
            <Route path="/visitas" element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AdminVisits />
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
            <Route path="/contatos" element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AdminContactSubmissions />
              </ProtectedRoute>
            } />
            <Route path="/logs-auditoria" element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AdminAuditLogs />
              </ProtectedRoute>
            } />
            <Route path="/notificacoes" element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AdminNotifications />
              </ProtectedRoute>
            } />
            <Route path="/historico-retiradas" element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AdminPickupHistory />
              </ProtectedRoute>
            } />
            <Route path="/logs-email" element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AdminEmailLogs />
              </ProtectedRoute>
            } />
            <Route path="/lista-compras" element={
              <ProtectedRoute allowedRoles={["admin", "cook", "nutritionist"]}>
                <AdminShoppingList />
              </ProtectedRoute>
            } />
            <Route path="/controle-refeicoes" element={
              <ProtectedRoute allowedRoles={["admin", "cook"]}>
                <AdminMealTracking />
              </ProtectedRoute>
            } />
            
            {/* Admin + Nutritionist + Cook routes */}
            <Route path="/cardapio" element={
              <ProtectedRoute allowedRoles={["admin", "nutritionist", "cook"]}>
                <AdminMenu />
              </ProtectedRoute>
            } />
            
            {/* All staff can access */}
            <Route path="/chat" element={<AdminChat />} />
            <Route path="/chat-equipe" element={<AdminStaffChat />} />
            <Route path="/mensagens" element={<AdminMessages />} />
          </Routes>
        </Suspense>
      </AdminLayout>
    );
  }

  // Parent only (not staff) - show parent panel
  if (isParent) {
    return (
      <Suspense fallback={<PageLoader />}>
        <ParentDashboard />
      </Suspense>
    );
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
      <DashboardViewProvider>
        <AppDataProvider>
          <DashboardContent />
        </AppDataProvider>
      </DashboardViewProvider>
    </AuthProvider>
  );
}
