import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { Eye, EyeOff, Loader2, ArrowLeft, KeyRound, CheckCircle, XCircle } from "lucide-react";
import { z } from "zod";
import logo from "@/assets/logo-pimpolinhos.png";
import { formatCPF, formatPhone, validateCPF, unformatCPF } from "@/lib/formatters";

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
});

const signupSchema = loginSchema.extend({
  fullName: z.string().min(2, "Nome deve ter no mínimo 2 caracteres"),
  cpf: z.string().refine((val) => validateCPF(val), { message: "CPF inválido" }),
  rg: z.string().optional(),
  phone: z.string().min(1, "Telefone é obrigatório").min(14, "Telefone inválido"),
  confirmPassword: z.string(),
  inviteCode: z.string().min(1, "Código de convite é obrigatório"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

export default function Auth() {
  const [searchParams] = useSearchParams();
  const [isSignUp, setIsSignUp] = useState(searchParams.get("mode") === "signup");
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [inviteStatus, setInviteStatus] = useState<"idle" | "checking" | "valid" | "invalid">("idle");
  const [inviteData, setInviteData] = useState<{ 
    child_name?: string;
    pre_enrollment?: {
      parent_name: string;
      email: string;
      phone: string;
      child_name: string;
      child_birth_date: string;
      desired_class_type: string;
      desired_shift_type: string;
    } | null;
  } | null>(null);

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    fullName: "",
    cpf: "",
    rg: "",
    phone: "",
    inviteCode: searchParams.get("invite") || "",
  });

  const navigate = useNavigate();
  const { toast } = useToast();

  // Check if user is already logged in and redirect appropriately
  useEffect(() => {
    const checkUserAndRedirect = async (userId: string) => {
      // First check if user is staff (admin, teacher, cook, etc.)
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);

      const isStaff = roles?.some(r => 
        ["admin", "teacher", "cook", "nutritionist", "pedagogue", "auxiliar"].includes(r.role)
      );

      // Staff members go directly to panel
      if (isStaff) {
        navigate("/painel");
        return;
      }

      // For parents only: check if they have child registrations
      const { data: registrations } = await supabase
        .from("child_registrations")
        .select("id")
        .eq("parent_id", userId)
        .limit(1);

      // If parent has no child registrations, redirect to complete registration
      if (!registrations || registrations.length === 0) {
        navigate("/cadastro-pimpolho");
      } else {
        navigate("/painel");
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        checkUserAndRedirect(session.user.id);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        checkUserAndRedirect(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  // Validate invite code on load if present
  useEffect(() => {
    if (formData.inviteCode && isSignUp) {
      validateInviteCode(formData.inviteCode);
    }
  }, []);

  const validateInviteCode = async (code: string) => {
    if (!code || code.length < 4) {
      setInviteStatus("idle");
      setInviteData(null);
      return;
    }

    setInviteStatus("checking");

    // First check parent_invites with pre_enrollment data
    const { data: parentData, error: parentError } = await supabase
      .from("parent_invites")
      .select("id, child_name, email, phone, expires_at, used_by, pre_enrollment_id")
      .eq("invite_code", code.toUpperCase())
      .maybeSingle();

    if (!parentError && parentData) {
      if (parentData.used_by) {
        setInviteStatus("invalid");
        setInviteData(null);
        return;
      }

      if (parentData.expires_at && new Date(parentData.expires_at) < new Date()) {
        setInviteStatus("invalid");
        setInviteData(null);
        return;
      }

      // Fetch pre-enrollment data if linked
      let preEnrollmentData = null;
      if (parentData.pre_enrollment_id) {
        const { data: preEnrollment } = await supabase
          .from("pre_enrollments")
          .select("parent_name, email, phone, child_name, child_birth_date, desired_class_type, desired_shift_type")
          .eq("id", parentData.pre_enrollment_id)
          .single();
        
        if (preEnrollment) {
          preEnrollmentData = preEnrollment;
          // Pre-fill form with pre-enrollment data
          setFormData(prev => ({
            ...prev,
            fullName: preEnrollment.parent_name || prev.fullName,
            email: preEnrollment.email || prev.email,
            phone: preEnrollment.phone || prev.phone,
          }));
        }
      }

      setInviteStatus("valid");
      setInviteData({ 
        child_name: parentData.child_name || undefined,
        pre_enrollment: preEnrollmentData
      });
      return;
    }

    // Check if it's an employee invite - redirect them to the correct page
    const { data: employeeData } = await supabase
      .from("employee_invites")
      .select("id, role, expires_at, is_used")
      .eq("invite_code", code.toUpperCase())
      .maybeSingle();

    if (employeeData) {
      if (!employeeData.is_used && new Date(employeeData.expires_at) > new Date()) {
        // Valid employee invite - redirect to employee registration
        toast({
          title: "Convite de Funcionário Detectado",
          description: "Você será redirecionado para a página de cadastro de funcionários.",
        });
        navigate(`/cadastro-funcionario?code=${code.toUpperCase()}`);
        return;
      }
    }

    setInviteStatus("invalid");
    setInviteData(null);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    // Apply formatting masks
    let formattedValue = value;
    if (name === "cpf") {
      formattedValue = formatCPF(value);
    } else if (name === "phone") {
      formattedValue = formatPhone(value);
    }
    
    setFormData({ ...formData, [name]: formattedValue });
    setErrors({ ...errors, [name]: "" });

    if (name === "inviteCode") {
      validateInviteCode(value);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrors({});

    if (!formData.email || !z.string().email().safeParse(formData.email).success) {
      setErrors({ email: "Por favor, insira um email válido" });
      setIsLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(formData.email, {
        redirectTo: `${window.location.origin}/redefinir-senha`,
      });

      if (error) {
        toast({
          title: "Erro ao enviar email",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Email enviado!",
          description: "Verifique sua caixa de entrada para redefinir sua senha.",
        });
        setIsForgotPassword(false);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrors({});

    try {
      if (isSignUp) {
        const result = signupSchema.safeParse(formData);
        if (!result.success) {
          const fieldErrors: Record<string, string> = {};
          result.error.errors.forEach((err) => {
            if (err.path[0]) {
              fieldErrors[err.path[0] as string] = err.message;
            }
          });
          setErrors(fieldErrors);
          setIsLoading(false);
          return;
        }

        // Validate invite code is valid
        if (inviteStatus !== "valid") {
          setErrors({ inviteCode: "Código de convite inválido ou expirado" });
          setIsLoading(false);
          return;
        }

        // Validate terms acceptance
        if (!acceptedTerms) {
          setErrors({ terms: "Você deve aceitar os termos de uso e a política de privacidade" });
          setIsLoading(false);
          return;
        }

        const { data: authData, error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: {
              full_name: formData.fullName,
              cpf: unformatCPF(formData.cpf),
              rg: formData.rg || null,
              phone: formData.phone,
            },
          },
        });

        if (error) {
          console.error("Signup error details:", {
            message: error.message,
            status: error.status,
            name: error.name,
            code: (error as any).code,
            fullError: JSON.stringify(error)
          });
          
          if (error.message.includes("already registered") || error.message.includes("already been registered")) {
            toast({
              title: "Email já cadastrado",
              description: `Este email já está em uso. Tente fazer login. (Erro técnico: ${error.message})`,
              variant: "destructive",
            });
          } else {
            toast({
              title: "Erro ao cadastrar",
              description: `${error.message} (Status: ${error.status || 'N/A'})`,
              variant: "destructive",
            });
          }
          setIsLoading(false);
          return;
        }

        // Mark invite as used
        if (authData.user) {
          await supabase
            .from("parent_invites")
            .update({
              used_by: authData.user.id,
              used_at: new Date().toISOString(),
            })
            .eq("invite_code", formData.inviteCode.toUpperCase());
        }

        toast({
          title: "Cadastro realizado!",
          description: "Agora vamos cadastrar os dados do seu filho.",
        });
        navigate("/cadastro-pimpolho");
      } else {
        const result = loginSchema.safeParse(formData);
        if (!result.success) {
          const fieldErrors: Record<string, string> = {};
          result.error.errors.forEach((err) => {
            if (err.path[0]) {
              fieldErrors[err.path[0] as string] = err.message;
            }
          });
          setErrors(fieldErrors);
          setIsLoading(false);
          return;
        }

        const { error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });
        
        // Handle "Remember me" preference
        if (!error) {
          if (rememberMe) {
            // User wants to stay logged in
            localStorage.setItem('pimpolinhos_remember_me', 'true');
            localStorage.removeItem('pimpolinhos_was_session_only');
            sessionStorage.removeItem('pimpolinhos_session_only');
          } else {
            // User doesn't want to be remembered - clear on browser close
            localStorage.removeItem('pimpolinhos_remember_me');
            sessionStorage.setItem('pimpolinhos_session_only', 'true');
          }
        }

        if (error) {
          if (error.message.includes("Invalid login")) {
            toast({
              title: "Credenciais inválidas",
              description: "Email ou senha incorretos. Tente novamente.",
              variant: "destructive",
            });
          } else {
            toast({
              title: "Erro ao entrar",
              description: error.message,
              variant: "destructive",
            });
          }
        } else {
          navigate("/painel");
        }
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-pimpo-blue-light via-background to-pimpo-yellow-light flex flex-col">
      {/* Header simples */}
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
            <div>
              <CardTitle className="font-fredoka text-2xl">
                {isForgotPassword ? "Recuperar Senha" : isSignUp ? "Criar Conta" : "Entrar"}
              </CardTitle>
              <CardDescription>
                {isForgotPassword
                  ? "Insira seu email para receber o link de recuperação"
                  : isSignUp
                  ? "Cadastre-se para acompanhar a agenda do seu filho"
                  : "Acesse sua conta para ver a agenda"}
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent>
            {isForgotPassword ? (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={formData.email}
                    onChange={handleChange}
                    className={errors.email ? "border-destructive" : ""}
                  />
                  {errors.email && (
                    <p className="text-sm text-destructive">{errors.email}</p>
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
                      Enviando...
                    </>
                  ) : (
                    "Enviar Link de Recuperação"
                  )}
                </Button>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => setIsForgotPassword(false)}
                    className="text-sm text-primary hover:underline"
                  >
                    Voltar ao login
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {isSignUp && (
                  <>
                    {/* Invite Code Field */}
                    <div className="space-y-2">
                      <Label htmlFor="inviteCode" className="flex items-center gap-2">
                        <KeyRound className="w-4 h-4" />
                      Código de Convite
                    </Label>
                    <div className="relative">
                      <Input
                        id="inviteCode"
                        name="inviteCode"
                        type="text"
                        placeholder="PAI-XXXXXX"
                        value={formData.inviteCode}
                        onChange={handleChange}
                        className={`uppercase ${
                          errors.inviteCode ? "border-destructive" : 
                          inviteStatus === "valid" ? "border-green-500" :
                          inviteStatus === "invalid" ? "border-destructive" : ""
                        } pr-10`}
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {inviteStatus === "checking" && (
                          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                        )}
                        {inviteStatus === "valid" && (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        )}
                        {inviteStatus === "invalid" && (
                          <XCircle className="w-4 h-4 text-destructive" />
                        )}
                      </div>
                    </div>
                    {inviteStatus === "valid" && inviteData?.child_name && (
                      <p className="text-sm text-green-600">
                        ✓ Convite válido para responsável de: {inviteData.child_name}
                      </p>
                    )}
                    {inviteStatus === "valid" && !inviteData?.child_name && (
                      <p className="text-sm text-green-600">
                        ✓ Código de convite válido
                      </p>
                    )}
                    {inviteStatus === "invalid" && (
                      <p className="text-sm text-destructive">
                        Código inválido, expirado ou já utilizado
                      </p>
                    )}
                    {errors.inviteCode && (
                      <p className="text-sm text-destructive">{errors.inviteCode}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Solicite um código de convite na secretaria da escola
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="fullName">Nome Completo</Label>
                    <Input
                      id="fullName"
                      name="fullName"
                      type="text"
                      placeholder="Seu nome completo"
                      value={formData.fullName}
                      onChange={handleChange}
                      className={errors.fullName ? "border-destructive" : ""}
                    />
                    {errors.fullName && (
                      <p className="text-sm text-destructive">{errors.fullName}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cpf">CPF *</Label>
                    <Input
                      id="cpf"
                      name="cpf"
                      type="text"
                      placeholder="000.000.000-00"
                      value={formData.cpf}
                      onChange={handleChange}
                      className={errors.cpf ? "border-destructive" : ""}
                      maxLength={14}
                    />
                    {errors.cpf && (
                      <p className="text-sm text-destructive">{errors.cpf}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="rg">RG (opcional)</Label>
                    <Input
                      id="rg"
                      name="rg"
                      type="text"
                      placeholder="Seu RG"
                      value={formData.rg}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefone <span className="text-destructive">*</span></Label>
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      placeholder="(51) 99999-9999"
                      value={formData.phone}
                      onChange={handleChange}
                      className={errors.phone ? "border-destructive" : ""}
                      required
                    />
                    {errors.phone && (
                      <p className="text-sm text-destructive">{errors.phone}</p>
                    )}
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={formData.email}
                  onChange={handleChange}
                  className={errors.email ? "border-destructive" : ""}
                />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleChange}
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
                {!isSignUp && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="rememberMe" 
                        checked={rememberMe}
                        onCheckedChange={(checked) => setRememberMe(checked === true)}
                      />
                      <label 
                        htmlFor="rememberMe" 
                        className="text-sm text-muted-foreground cursor-pointer select-none"
                      >
                        Lembrar de mim
                      </label>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsForgotPassword(true)}
                      className="text-xs text-muted-foreground hover:text-primary hover:underline"
                    >
                      Esqueci minha senha
                    </button>
                  </div>
                )}
              </div>

              {isSignUp && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirmar Senha</Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        name="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={formData.confirmPassword}
                        onChange={handleChange}
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

                  {/* Terms and Privacy Policy Checkbox */}
                  <div className="space-y-2">
                    <div className="flex items-start space-x-2">
                      <Checkbox 
                        id="acceptTerms" 
                        checked={acceptedTerms}
                        onCheckedChange={(checked) => {
                          setAcceptedTerms(checked === true);
                          if (errors.terms) {
                            setErrors({ ...errors, terms: "" });
                          }
                        }}
                        className="mt-0.5"
                      />
                      <label htmlFor="acceptTerms" className="text-sm text-muted-foreground cursor-pointer select-none leading-tight">
                        Li e aceito os{" "}
                        <Link to="/termos-uso" target="_blank" className="text-primary hover:underline">
                          Termos de Uso
                        </Link>{" "}
                        e a{" "}
                        <Link to="/politica-privacidade" target="_blank" className="text-primary hover:underline">
                          Política de Privacidade
                        </Link>
                        . <span className="text-destructive">*</span>
                      </label>
                    </div>
                    {errors.terms && (
                      <p className="text-sm text-destructive">{errors.terms}</p>
                    )}
                  </div>
                </>
              )}

              <Button 
                type="submit" 
                className="w-full" 
                size="lg" 
                disabled={isLoading || (isSignUp && inviteStatus !== "valid")}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {isSignUp ? "Cadastrando..." : "Entrando..."}
                  </>
                ) : isSignUp ? (
                  "Criar Conta"
                ) : (
                  "Entrar"
                )}
              </Button>
              </form>
            )}

            {!isForgotPassword && (
              <>
                <div className="mt-6 text-center">
                  <button
                    type="button"
                    onClick={() => setIsSignUp(!isSignUp)}
                    className="text-sm text-primary hover:underline"
                  >
                    {isSignUp
                      ? "Já tem uma conta? Entre aqui"
                      : "Não tem conta? Cadastre-se"}
                  </button>
                </div>

                {isSignUp && (
                  <p className="mt-4 text-xs text-center text-muted-foreground">
                    Após o cadastro, a escola irá aprovar seu acesso e vincular seu filho à sua conta.
                  </p>
                )}

                <div className="mt-6 pt-4 border-t text-center">
                  <p className="text-sm text-muted-foreground mb-2">É funcionário da escola?</p>
                  <Link 
                    to="/cadastro-funcionario" 
                    className="text-sm text-primary hover:underline font-medium"
                  >
                    Clique aqui para cadastro de funcionários
                  </Link>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
