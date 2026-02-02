import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Eye, 
  EyeOff, 
  Loader2, 
  Lock, 
  Mail, 
  User, 
  Briefcase,
  Building2,
  CreditCard,
  CheckCircle,
  AlertCircle,
  Save,
  Phone
} from "lucide-react";
import { formatCPF, formatPhone } from "@/lib/formatters";

const bankOptions = [
  "Banco do Brasil",
  "Bradesco",
  "Caixa Econômica",
  "Itaú",
  "Santander",
  "Nubank",
  "Inter",
  "C6 Bank",
  "PagBank",
  "Mercado Pago",
  "Sicoob",
  "Sicredi",
  "Original",
  "Safra",
  "BTG Pactual",
  "Outro",
];

const accountTypeOptions = [
  { value: "corrente", label: "Conta Corrente" },
  { value: "poupanca", label: "Conta Poupança" },
  { value: "salario", label: "Conta Salário" },
];

export function EmployeeSettingsTab() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Password change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});

  // Bank data state
  const [bankData, setBankData] = useState({
    bank_name: "",
    bank_agency: "",
    bank_account: "",
    bank_account_type: "",
    pix_key: "",
    phone: "",
  });

  // Fetch employee profile
  const { data: employeeProfile, isLoading } = useQuery({
    queryKey: ["employee-profile-settings", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employee_profiles")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Update bank data when employee profile loads
  useEffect(() => {
    if (employeeProfile) {
      setBankData({
        bank_name: employeeProfile.bank_name || "",
        bank_agency: employeeProfile.bank_agency || "",
        bank_account: employeeProfile.bank_account || "",
        bank_account_type: employeeProfile.bank_account_type || "",
        pix_key: employeeProfile.pix_key || "",
        phone: employeeProfile.phone || "",
      });
    }
  }, [employeeProfile]);

  // Mutation to update bank data
  const updateBankMutation = useMutation({
    mutationFn: async (data: typeof bankData) => {
      const { error } = await supabase
        .from("employee_profiles")
        .update({
          bank_name: data.bank_name || null,
          bank_agency: data.bank_agency || null,
          bank_account: data.bank_account || null,
          bank_account_type: data.bank_account_type || null,
          pix_key: data.pix_key || null,
          phone: data.phone || null,
        })
        .eq("user_id", user!.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee-profile-settings"] });
      toast({
        title: "Dados atualizados!",
        description: "Suas informações bancárias foram salvas.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordErrors({});

    const errors: Record<string, string> = {};
    
    if (!currentPassword) {
      errors.currentPassword = "Senha atual é obrigatória";
    }
    
    if (newPassword.length < 6) {
      errors.newPassword = "Nova senha deve ter no mínimo 6 caracteres";
    }
    
    if (newPassword !== confirmPassword) {
      errors.confirmPassword = "As senhas não coincidem";
    }

    if (Object.keys(errors).length > 0) {
      setPasswordErrors(errors);
      return;
    }

    setIsChangingPassword(true);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email || "",
        password: currentPassword,
      });

      if (signInError) {
        setPasswordErrors({ currentPassword: "Senha atual incorreta" });
        setIsChangingPassword(false);
        return;
      }

      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        toast({
          title: "Erro ao alterar senha",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Senha alterada!",
          description: "Sua senha foi atualizada com sucesso.",
        });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Ocorreu um erro inesperado. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleSaveBankData = () => {
    updateBankMutation.mutate(bankData);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Profile Info */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-primary/10">
              <User className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Meus Dados</CardTitle>
              <CardDescription>Informações da sua conta</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={employeeProfile?.photo_url || profile?.avatar_url || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary text-xl font-semibold">
                {(employeeProfile?.full_name || profile?.full_name)?.charAt(0).toUpperCase() || "F"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h3 className="font-semibold text-lg">{employeeProfile?.full_name || profile?.full_name}</h3>
              <p className="text-muted-foreground flex items-center gap-2">
                <Mail className="w-4 h-4" />
                {user?.email}
              </p>
              {employeeProfile?.cpf && (
                <p className="text-sm text-muted-foreground">
                  CPF: {formatCPF(employeeProfile.cpf)}
                </p>
              )}
            </div>
          </div>
          
          {employeeProfile?.job_title && (
            <div className="flex items-center gap-2 p-3 bg-primary/5 rounded-lg">
              <Briefcase className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">{employeeProfile.job_title}</span>
              {employeeProfile.work_shift && (
                <Badge variant="secondary" className="ml-auto">
                  {employeeProfile.work_shift}
                </Badge>
              )}
            </div>
          )}
          
          <div className="flex items-center gap-2 p-3 bg-pimpo-green/10 rounded-lg">
            <CheckCircle className="w-4 h-4 text-pimpo-green" />
            <span className="text-sm">Conta verificada e ativa</span>
          </div>
        </CardContent>
      </Card>

      {/* Bank Data - Editable */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-pimpo-blue/10">
              <Building2 className="w-5 h-5 text-pimpo-blue" />
            </div>
            <div>
              <CardTitle className="text-lg">Dados Bancários</CardTitle>
              <CardDescription>Informações para recebimento de salário</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                placeholder="(00) 00000-0000"
                value={bankData.phone}
                onChange={(e) => setBankData({ ...bankData, phone: formatPhone(e.target.value) })}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="bank_name">Banco</Label>
              <Select
                value={bankData.bank_name}
                onValueChange={(value) => setBankData({ ...bankData, bank_name: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o banco" />
                </SelectTrigger>
                <SelectContent>
                  {bankOptions.map((bank) => (
                    <SelectItem key={bank} value={bank}>
                      {bank}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bank_agency">Agência</Label>
              <Input
                id="bank_agency"
                placeholder="0000"
                value={bankData.bank_agency}
                onChange={(e) => setBankData({ ...bankData, bank_agency: e.target.value.replace(/\D/g, "").slice(0, 6) })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bank_account">Conta</Label>
              <Input
                id="bank_account"
                placeholder="00000-0"
                value={bankData.bank_account}
                onChange={(e) => setBankData({ ...bankData, bank_account: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bank_account_type">Tipo de Conta</Label>
              <Select
                value={bankData.bank_account_type}
                onValueChange={(value) => setBankData({ ...bankData, bank_account_type: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  {accountTypeOptions.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pix_key">Chave PIX</Label>
              <Input
                id="pix_key"
                placeholder="CPF, e-mail, telefone ou chave aleatória"
                value={bankData.pix_key}
                onChange={(e) => setBankData({ ...bankData, pix_key: e.target.value })}
              />
            </div>
          </div>

          <Button 
            onClick={handleSaveBankData} 
            disabled={updateBankMutation.isPending}
            className="w-full sm:w-auto"
          >
            {updateBankMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Salvar Dados Bancários
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-destructive/10">
              <Lock className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <CardTitle className="text-lg">Alterar Senha</CardTitle>
              <CardDescription>Atualize sua senha de acesso</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Senha Atual</Label>
              <div className="relative">
                <Input
                  id="currentPassword"
                  type={showCurrentPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={currentPassword}
                  onChange={(e) => {
                    setCurrentPassword(e.target.value);
                    setPasswordErrors({ ...passwordErrors, currentPassword: "" });
                  }}
                  className={passwordErrors.currentPassword ? "border-destructive pr-10" : "pr-10"}
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {passwordErrors.currentPassword && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {passwordErrors.currentPassword}
                </p>
              )}
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="newPassword">Nova Senha</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showNewPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    setPasswordErrors({ ...passwordErrors, newPassword: "" });
                  }}
                  className={passwordErrors.newPassword ? "border-destructive pr-10" : "pr-10"}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {passwordErrors.newPassword && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {passwordErrors.newPassword}
                </p>
              )}
              <p className="text-xs text-muted-foreground">Mínimo 6 caracteres</p>
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
                    setPasswordErrors({ ...passwordErrors, confirmPassword: "" });
                  }}
                  className={passwordErrors.confirmPassword ? "border-destructive pr-10" : "pr-10"}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {passwordErrors.confirmPassword && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {passwordErrors.confirmPassword}
                </p>
              )}
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={isChangingPassword}
            >
              {isChangingPassword ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Alterando...
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4 mr-2" />
                  Alterar Senha
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Info */}
      <Card className="bg-muted/30">
        <CardContent className="py-4">
          <div className="flex items-start gap-3 text-sm text-muted-foreground">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <div>
              <p>
                Para alterar outros dados pessoais (nome, CPF, documentos), 
                entre em contato com a administração.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
