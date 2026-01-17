import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { CheckCircle2, XCircle, Loader2, Baby, ArrowRight, Mail } from "lucide-react";

interface Invitation {
  id: string;
  invited_name: string;
  invited_email: string;
  relationship: string;
  status: string;
  expires_at: string;
  child_registration: {
    first_name: string;
    last_name: string;
  };
  inviter_profile: {
    full_name: string;
  } | null;
}

const AcceptInvite = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const token = searchParams.get("token");

  useEffect(() => {
    const fetchInvitation = async () => {
      if (!token) {
        setError("Token de convite inválido");
        setLoading(false);
        return;
      }

      try {
        // Fetch invitation with related data - using service role through anon key
        const { data, error: fetchError } = await supabase
          .from("guardian_invitations")
          .select(`
            id,
            invited_name,
            invited_email,
            relationship,
            status,
            expires_at,
            child_registration_id
          `)
          .eq("token", token)
          .single();

        if (fetchError || !data) {
          console.error("Fetch error:", fetchError);
          setError("Convite não encontrado");
          setLoading(false);
          return;
        }

        // Check if expired
        if (new Date(data.expires_at) < new Date()) {
          setError("Este convite expirou");
          setLoading(false);
          return;
        }

        // Check status
        if (data.status !== "pending") {
          setError(data.status === "accepted" ? "Este convite já foi aceito" : "Este convite não está mais disponível");
          setLoading(false);
          return;
        }

        // Fetch child registration separately
        const { data: childData } = await supabase
          .from("child_registrations")
          .select("first_name, last_name")
          .eq("id", data.child_registration_id)
          .single();

        setInvitation({
          ...data,
          child_registration: childData || { first_name: "Criança", last_name: "" },
          inviter_profile: null
        });
      } catch (err) {
        console.error("Error fetching invitation:", err);
        setError("Erro ao carregar convite");
      } finally {
        setLoading(false);
      }
    };

    fetchInvitation();
  }, [token]);

  const handleAccept = async () => {
    if (!user || !invitation) return;

    // Check if user email matches invitation
    if (user.email?.toLowerCase() !== invitation.invited_email.toLowerCase()) {
      toast({
        title: "Email não corresponde",
        description: `Este convite foi enviado para ${invitation.invited_email}. Faça login com esse email.`,
        variant: "destructive",
      });
      return;
    }

    setAccepting(true);

    try {
      // Update invitation status
      const { error: updateError } = await supabase
        .from("guardian_invitations")
        .update({
          status: "accepted",
          accepted_by: user.id,
          accepted_at: new Date().toISOString(),
        })
        .eq("id", invitation.id);

      if (updateError) throw updateError;

      // Get child_registration to find child_id if linked
      const { data: registration } = await supabase
        .from("child_registrations")
        .select("id")
        .eq("id", (invitation as any).child_registration_id)
        .single();

      // For now, we'll mark the invitation as accepted
      // The admin can then link the parent to the child after approval

      setSuccess(true);
      toast({
        title: "Convite aceito!",
        description: "Você agora está vinculado como responsável.",
      });
    } catch (err: any) {
      console.error("Error accepting invitation:", err);
      toast({
        title: "Erro ao aceitar convite",
        description: err.message || "Tente novamente",
        variant: "destructive",
      });
    } finally {
      setAccepting(false);
    }
  };

  if (loading || authLoading) {
    return (
      <PublicLayout>
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </PublicLayout>
    );
  }

  if (error) {
    return (
      <PublicLayout>
        <div className="min-h-screen py-20">
          <div className="container mx-auto px-4 max-w-lg">
            <Card className="text-center">
              <CardHeader>
                <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
                  <XCircle className="h-10 w-10 text-destructive" />
                </div>
                <CardTitle className="text-2xl text-destructive">Convite Inválido</CardTitle>
                <CardDescription className="text-base">{error}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => navigate("/")} variant="outline" className="w-full">
                  Voltar ao Início
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </PublicLayout>
    );
  }

  if (success) {
    return (
      <PublicLayout>
        <div className="min-h-screen py-20">
          <div className="container mx-auto px-4 max-w-lg">
            <Card className="text-center">
              <CardHeader>
                <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle2 className="h-10 w-10 text-green-600" />
                </div>
                <CardTitle className="text-2xl text-green-600">Convite Aceito!</CardTitle>
                <CardDescription className="text-base">
                  Você agora é responsável por {invitation?.child_registration.first_name}.
                  Aguarde a aprovação do cadastro para acessar o painel.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button onClick={() => navigate("/painel")} className="w-full">
                  Ir para o Painel
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </PublicLayout>
    );
  }

  if (!user) {
    return (
      <PublicLayout>
        <div className="min-h-screen py-20">
          <div className="container mx-auto px-4 max-w-lg">
            <Card className="text-center">
              <CardHeader>
                <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                  <Mail className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-2xl">Convite Recebido!</CardTitle>
                <CardDescription className="text-base">
                  Você foi convidado para ser {invitation?.relationship} de{" "}
                  <strong>{invitation?.child_registration.first_name} {invitation?.child_registration.last_name}</strong>.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-muted p-4 rounded-lg text-sm">
                  <p className="text-muted-foreground">
                    Para aceitar o convite, faça login ou cadastre-se com o email:{" "}
                    <strong>{invitation?.invited_email}</strong>
                  </p>
                </div>
                <Button onClick={() => navigate(`/auth?redirect=/aceitar-convite?token=${token}`)} className="w-full">
                  Fazer Login / Cadastro
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="min-h-screen py-20">
        <div className="container mx-auto px-4 max-w-lg">
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <Baby className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">Aceitar Convite</CardTitle>
              <CardDescription className="text-base">
                Você foi convidado para ser {invitation?.relationship} de{" "}
                <strong>{invitation?.child_registration.first_name} {invitation?.child_registration.last_name}</strong>.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-muted p-4 rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Convidado como:</span>
                  <span className="font-medium">{invitation?.invited_name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Parentesco:</span>
                  <span className="font-medium">{invitation?.relationship}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Email:</span>
                  <span className="font-medium">{invitation?.invited_email}</span>
                </div>
              </div>

              {user.email?.toLowerCase() !== invitation?.invited_email.toLowerCase() && (
                <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg text-sm text-yellow-800">
                  <p>
                    <strong>Atenção:</strong> Você está logado como <strong>{user.email}</strong>, 
                    mas o convite foi enviado para <strong>{invitation?.invited_email}</strong>.
                  </p>
                  <p className="mt-2">
                    Faça logout e entre com o email correto para aceitar.
                  </p>
                </div>
              )}

              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => navigate("/")} 
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={handleAccept} 
                  disabled={accepting || user.email?.toLowerCase() !== invitation?.invited_email.toLowerCase()}
                  className="flex-1"
                >
                  {accepting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Aceitando...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Aceitar Convite
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PublicLayout>
  );
};

export default AcceptInvite;
