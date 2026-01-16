import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, AlertCircle, LogOut, MessageSquare } from "lucide-react";
import logo from "@/assets/logo-pimpolinhos.png";

export default function ParentDashboard() {
  const { user, profile, signOut, isApproved } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  // If not approved, show pending message
  if (!isApproved) {
    return (
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="bg-card shadow-md">
          <div className="container py-4 flex items-center justify-between">
            <img src={logo} alt="Creche Pimpolinhos" className="h-12" />
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">{user?.email}</span>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                Sair
              </Button>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="container py-8">
          <h1 className="font-fredoka text-3xl font-bold mb-8">
            Olá, {profile?.full_name || "Responsável"}!
          </h1>

          <Card className="max-w-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-pimpo-yellow" />
                Aguardando Aprovação
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-pimpo-yellow/10 rounded-lg">
                <AlertCircle className="w-5 h-5 text-pimpo-yellow mt-0.5" />
                <div>
                  <p className="font-semibold">Seu cadastro está em análise</p>
                  <p className="text-sm text-muted-foreground">
                    A escola precisa aprovar seu acesso e vincular seu filho à sua conta.
                    Você receberá uma notificação quando o acesso for liberado.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
                <MessageSquare className="w-5 h-5 text-pimpo-green" />
                <p className="text-sm">
                  Enquanto isso, você pode entrar em contato com a escola pelo WhatsApp{" "}
                  <a
                    href="https://wa.me/5551989965423"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-pimpo-green hover:underline"
                  >
                    (51) 98996-5423
                  </a>{" "}
                  para agilizar o processo.
                </p>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  // Approved parent - show full dashboard
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card shadow-md">
        <div className="container py-4 flex items-center justify-between">
          <img src={logo} alt="Creche Pimpolinhos" className="h-12" />
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{profile?.full_name}</span>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container py-8">
        <h1 className="font-fredoka text-3xl font-bold mb-8">
          Bem-vindo, {profile?.full_name?.split(" ")[0]}!
        </h1>

        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>Área dos Pais</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Em breve você poderá acompanhar a agenda digital do seu filho aqui.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
