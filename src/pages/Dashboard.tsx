import { useEffect } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import { useAuth, AuthProvider } from "@/hooks/useAuth";
import { AdminLayout } from "@/components/admin/AdminLayout";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminApprovals from "@/pages/admin/AdminApprovals";
import AdminTeachers from "@/pages/admin/AdminTeachers";
import AdminChildren from "@/pages/admin/AdminChildren";
import ParentDashboard from "@/pages/parent/ParentDashboard";
import { Loader2 } from "lucide-react";

function DashboardContent() {
  const { user, loading, isAdmin, isTeacher, isParent, isApproved } = useAuth();
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

  // Admin or Teacher - show admin panel
  if (isAdmin || isTeacher) {
    return (
      <AdminLayout>
        <Routes>
          <Route path="/" element={<AdminDashboard />} />
          <Route path="/aprovacoes" element={<AdminApprovals />} />
          <Route path="/professores" element={<AdminTeachers />} />
          <Route path="/criancas" element={<AdminChildren />} />
          <Route path="/agenda" element={<div>Agenda - Em breve</div>} />
          <Route path="/mensagens" element={<div>Mensagens - Em breve</div>} />
          <Route path="/config" element={<div>Configurações - Em breve</div>} />
        </Routes>
      </AdminLayout>
    );
  }

  // Parent - show parent panel
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
