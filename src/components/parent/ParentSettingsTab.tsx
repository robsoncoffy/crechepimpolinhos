import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Eye, 
  EyeOff, 
  Loader2, 
  Lock, 
  Mail, 
  User, 
  Baby, 
  Shield,
  CheckCircle,
  AlertCircle 
} from "lucide-react";

interface Child {
  id: string;
  full_name: string;
  class_type: string;
  photo_url: string | null;
  birth_date: string;
  shift_type?: string | null;
}

interface ParentSettingsTabProps {
  children: Child[];
}

const classTypeLabels: Record<string, string> = {
  bercario: "Berçário",
  maternal: "Maternal",
  jardim: "Jardim",
};

const shiftLabels: Record<string, string> = {
  manha: "Manhã",
  tarde: "Tarde",
  integral: "Integral",
};

export function ParentSettingsTab({ children }: ParentSettingsTabProps) {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordErrors({});

    // Validations
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
      // First verify current password by trying to sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email || "",
        password: currentPassword,
      });

      if (signInError) {
        setPasswordErrors({ currentPassword: "Senha atual incorreta" });
        setIsChangingPassword(false);
        return;
      }

      // Update password
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

  const calculateAge = (birthDate: string) => {
    const birth = new Date(birthDate);
    const today = new Date();
    let years = today.getFullYear() - birth.getFullYear();
    let months = today.getMonth() - birth.getMonth();
    
    if (months < 0) {
      years--;
      months += 12;
    }
    
    if (years > 0) {
      return `${years} ano${years > 1 ? "s" : ""} e ${months} mes${months !== 1 ? "es" : ""}`;
    }
    return `${months} mes${months !== 1 ? "es" : ""}`;
  };

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
              <AvatarImage src={profile?.avatar_url || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary text-xl font-semibold">
                {profile?.full_name?.charAt(0).toUpperCase() || "P"}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold text-lg">{profile?.full_name}</h3>
              <p className="text-muted-foreground flex items-center gap-2">
                <Mail className="w-4 h-4" />
                {user?.email}
              </p>
              {profile?.phone && (
                <p className="text-muted-foreground text-sm">{profile.phone}</p>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2 p-3 bg-primary/5 rounded-lg">
            <Shield className="w-4 h-4 text-primary" />
            <span className="text-sm">Conta verificada e ativa</span>
            <CheckCircle className="w-4 h-4 text-primary ml-auto" />
          </div>
        </CardContent>
      </Card>

      {/* Linked Children */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-pimpo-yellow/20">
              <Baby className="w-5 h-5 text-pimpo-yellow" />
            </div>
            <div>
              <CardTitle className="text-lg">Crianças Vinculadas</CardTitle>
              <CardDescription>Filhos matriculados na escola</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {children.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <Baby className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Nenhuma criança vinculada ainda</p>
            </div>
          ) : (
            <div className="space-y-3">
              {children.map((child) => (
                <div 
                  key={child.id} 
                  className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg border"
                >
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={child.photo_url || undefined} />
                    <AvatarFallback className="bg-pimpo-yellow/20 text-pimpo-yellow font-semibold">
                      {child.full_name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold truncate">{child.full_name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {calculateAge(child.birth_date)}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1 items-end">
                    <Badge variant="secondary">
                      {classTypeLabels[child.class_type] || child.class_type}
                    </Badge>
                    {child.shift_type && (
                      <span className="text-xs text-muted-foreground">
                        {shiftLabels[child.shift_type] || child.shift_type}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
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

      {/* Account Info */}
      <Card className="bg-muted/30">
        <CardContent className="py-4">
          <div className="flex items-start gap-3 text-sm text-muted-foreground">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <div>
              <p>
                Para alterar outros dados da sua conta (nome, telefone, documentos), 
                entre em contato com a secretaria da escola.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
