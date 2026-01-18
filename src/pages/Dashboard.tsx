import { useEffect } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import { useAuth, AuthProvider } from "@/hooks/useAuth";
import { AdminLayout } from "@/components/admin/AdminLayout";
import AdminDashboard from "@/pages/admin/AdminDashboard";
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
import NutritionistDashboard from "@/pages/admin/NutritionistDashboard";
import CookDashboard from "@/pages/admin/CookDashboard";
import PedagogueDashboard from "@/pages/admin/PedagogueDashboard";
import AuxiliarDashboard from "@/pages/admin/AuxiliarDashboard";
import ParentDashboard from "@/pages/parent/ParentDashboard";
import { Loader2 } from "lucide-react";

// Component to select the right dashboard based on role
function RoleBasedDashboard() {
  const { isAdmin, isTeacher, isNutritionist, isCook, isPedagogue, isAuxiliar } = useAuth();

  // Priority order: Admin > Teacher > Nutritionist > Cook > Pedagogue > Auxiliar
  if (isAdmin) return <AdminDashboard />;
  if (isTeacher) return <AdminDashboard />;
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
          <Route path="/aprovacoes" element={<AdminApprovals />} />
          <Route path="/professores" element={<AdminTeachers />} />
          <Route path="/criancas" element={<AdminChildren />} />
          <Route path="/agenda" element={<AdminAgenda />} />
          <Route path="/mensagens" element={<AdminMessages />} />
          <Route path="/chat-equipe" element={<AdminStaffChat />} />
          <Route path="/crescimento" element={<AdminGrowth />} />
          <Route path="/cardapio" element={<AdminMenu />} />
          <Route path="/galeria" element={<AdminGallery />} />
          <Route path="/eventos" element={<AdminEvents />} />
          <Route path="/convites" element={<AdminEmployeeInvites />} />
          <Route path="/convites-pais" element={<AdminParentInvites />} />
          <Route path="/avisos" element={<AdminAnnouncements />} />
          <Route path="/financeiro" element={<AdminPayments />} />
          <Route path="/contratos" element={<AdminContracts />} />
          <Route path="/chamada" element={<AdminAttendance />} />
          <Route path="/config" element={<AdminConfigPlaceholder />} />
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

function AdminConfigPlaceholder() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-fredoka text-3xl lg:text-4xl font-bold text-foreground">
          Configurações
        </h1>
        <p className="text-muted-foreground mt-1">
          Configurações do sistema em desenvolvimento
        </p>
      </div>
      <div className="flex items-center justify-center py-20 bg-muted/30 rounded-xl border-2 border-dashed">
        <p className="text-muted-foreground">Em breve</p>
      </div>
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
