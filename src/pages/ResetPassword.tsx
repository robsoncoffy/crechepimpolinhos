import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Loader2, ArrowLeft, Lock, CheckCircle } from "lucide-react";
import logo from "@/assets/logo-pimpolinhos.png";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const navigate = useNavigate();
  const { toast } = useToast();

  // Check if user has a valid recovery session
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      // If no session, the user might have clicked an expired link
      if (!session) {
        toast({
          title: "Sessão expirada",
          description: "O link de recuperação expirou. Solicite um novo.",
          variant: "destructive",
        });
        navigate("/auth");
      }
    };

    // Listen for auth state changes (recovery link clicked)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        // User clicked on recovery link, session is ready
        console.log("Password recovery mode activated");
      }
    });

    checkSession();

    return () => subscription.unsubscribe();
  }, [navigate, toast]);

  const validatePassword = () => {
    const newErrors: Record<string, string> = {};

    if (password.length < 6) {
      newErrors.password = "A senha deve ter no mínimo 6 caracteres";
    }

    if (password !== confirmPassword) {
      newErrors.confirmPassword = "As senhas não coincidem";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validatePassword()) {
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        toast({
          title: "Erro ao redefinir senha",
          description: error.message,
          variant: "destructive",
        });
      } else {
        setIsSuccess(true);
        toast({
          title: "Senha redefinida!",
          description: "Sua senha foi alterada com sucesso.",
        });
        
        // Sign out and redirect to login after 2 seconds
        setTimeout(async () => {
          await supabase.auth.signOut();
          navigate("/auth");
        }, 2000);
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Ocorreu um erro inesperado. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pimpo-blue-light via-background to-pimpo-yellow-light flex flex-col">
        <div className="container py-4">
          <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Voltar ao site
          </Link>
        </div>

        <div className="flex-1 flex items-center justify-center px-4 py-8">
          <Card className="w-full max-w-md shadow-xl border-2">
            <CardHeader className="text-center space-y-4">
              <div className="mx-auto">
                <img src={logo} alt="Creche Pimpolinhos" className="h-20 w-auto" />
              </div>
              <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-primary" />
                </div>
                <CardTitle className="font-fredoka text-2xl text-primary">
                  Senha Redefinida!
                </CardTitle>
                <CardDescription>
                  Sua senha foi alterada com sucesso. Você será redirecionado para o login...
                </CardDescription>
              </div>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pimpo-blue-light via-background to-pimpo-yellow-light flex flex-col">
      <div className="container py-4">
        <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Voltar ao site
        </Link>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <Card className="w-full max-w-md shadow-xl border-2">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto">
              <img src={logo} alt="Creche Pimpolinhos" className="h-20 w-auto" />
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                <Lock className="w-6 h-6 text-primary" />
              </div>
              <CardTitle className="font-fredoka text-2xl">
                Redefinir Senha
              </CardTitle>
              <CardDescription>
                Digite sua nova senha abaixo
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Nova Senha</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setErrors({ ...errors, password: "" });
                    }}
                    className={errors.password ? "border-destructive pr-10" : "pr-10"}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-sm text-destructive">{errors.password}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      setErrors({ ...errors, confirmPassword: "" });
                    }}
                    className={errors.confirmPassword ? "border-destructive pr-10" : "pr-10"}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-sm text-destructive">{errors.confirmPassword}</p>
                )}
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                size="lg" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Redefinindo...
                  </>
                ) : (
                  "Redefinir Senha"
                )}
              </Button>

              <div className="text-center">
                <Link
                  to="/auth"
                  className="text-sm text-primary hover:underline"
                >
                  Voltar ao login
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
