import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LogOut, Clock, AlertCircle } from "lucide-react";
import logo from "@/assets/logo-pimpolinhos.png";

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

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
        <h1 className="font-fredoka text-3xl font-bold mb-8">Bem-vindo ao Painel</h1>

        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-pimpo-yellow" />
              Aguardando Aprovação
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3 p-4 bg-pimpo-yellow-light rounded-lg">
              <AlertCircle className="w-5 h-5 text-pimpo-yellow mt-0.5" />
              <div>
                <p className="font-semibold">Seu cadastro está em análise</p>
                <p className="text-sm text-muted-foreground">
                  A escola precisa aprovar seu acesso e vincular seu filho à sua conta.
                  Você receberá uma notificação quando o acesso for liberado.
                </p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Enquanto isso, você pode entrar em contato com a escola pelo WhatsApp 
              (51) 98996-5423 para agilizar o processo.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
