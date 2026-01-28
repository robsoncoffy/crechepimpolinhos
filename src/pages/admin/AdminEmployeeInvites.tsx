import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { Copy, Plus, Loader2, KeyRound, Trash2, Check, X, Mail, Send, MessageCircle, Database } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { EmailDiagnosticModal } from "@/components/admin/EmailDiagnosticModal";

interface Invite {
  id: string;
  invite_code: string;
  role: string;
  is_used: boolean;
  created_at: string;
  expires_at: string;
  used_at: string | null;
  employee_email: string | null;
  employee_name: string | null;
  employee_phone?: string | null;
}

// Always use the production URL for invite links
const PRODUCTION_URL = "https://www.crechepimpolinhos.com.br";

export default function AdminEmployeeInvites() {
  const { user } = useAuth();
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [sendingEmail, setSendingEmail] = useState<string | null>(null);
  const [sendingWhatsApp, setSendingWhatsApp] = useState<string | null>(null);
  const [newRole, setNewRole] = useState<string>("teacher");
  const [employeeEmail, setEmployeeEmail] = useState("");
  const [employeeName, setEmployeeName] = useState("");
  const [employeePhone, setEmployeePhone] = useState("");
  const [emailDiagnosticOpen, setEmailDiagnosticOpen] = useState(false);
  
  // Resend dialog state
  const [resendDialogOpen, setResendDialogOpen] = useState(false);
  const [resendInvite, setResendInvite] = useState<Invite | null>(null);
  const [resendEmail, setResendEmail] = useState("");
  const [resendName, setResendName] = useState("");

  const fetchInvites = async () => {
    const { data, error } = await supabase
      .from("employee_invites")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setInvites(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchInvites();
  }, []);

  const generateCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const createInvite = async () => {
    if (!user) return;
    
    setCreating(true);
    const code = generateCode();

    const { data, error } = await supabase.from("employee_invites").insert([{
      invite_code: code,
      role: newRole as "admin" | "teacher" | "parent" | "cook" | "nutritionist" | "pedagogue" | "auxiliar",
      created_by: user.id,
      employee_email: employeeEmail.trim() || null,
      employee_name: employeeName.trim() || null,
    }]).select().single();

    // Store phone separately in a note or metadata if needed - for now we'll use it for WhatsApp only

    if (error) {
      toast.error("Erro ao criar convite");
      setCreating(false);
      return;
    }

    toast.success(`Convite ${code} criado com sucesso!`);
    
    // If email is provided, send the invite
    if (employeeEmail.trim()) {
      await sendInviteEmail(code, newRole, employeeEmail.trim(), employeeName.trim());
    }
    
    fetchInvites();
    setEmployeeEmail("");
    setEmployeeName("");
    setEmployeePhone("");
    setCreating(false);
  };

  const resendWhatsApp = async (invite: Invite) => {
    // For employee invites, we need to prompt for phone if not stored
    const phone = employeePhone.trim() || prompt("Digite o telefone do funcionário (com DDD):");
    
    if (!phone) {
      toast.error("Telefone é obrigatório para enviar WhatsApp");
      return;
    }

    setSendingWhatsApp(invite.invite_code);
    try {
      const { data: sessionData } = await supabase.auth.getSession();

      const response = await supabase.functions.invoke("resend-invite-whatsapp", {
        body: {
          inviteType: "employee",
          inviteCode: invite.invite_code,
          phone,
          employeeName: invite.employee_name || undefined,
          role: invite.role,
        },
        headers: {
          Authorization: `Bearer ${sessionData.session?.access_token}`,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || "Erro ao enviar WhatsApp");
      }

      toast.success(`WhatsApp enviado para ${phone}!`);
    } catch (error: any) {
      console.error("Error sending WhatsApp:", error);
      toast.error(error.message || "Erro ao enviar WhatsApp");
    } finally {
      setSendingWhatsApp(null);
    }
  };

  const sendInviteEmail = async (code: string, role: string, email: string, name?: string) => {
    setSendingEmail(code);
    
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke("send-employee-invite-email", {
        body: { 
          email, 
          inviteCode: code, 
          role,
          employeeName: name || undefined
        },
        headers: {
          Authorization: `Bearer ${sessionData.session?.access_token}`,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      toast.success(`E-mail de convite enviado para ${email}`);
    } catch (error: any) {
      console.error("Error sending invite email:", error);
      toast.error("Erro ao enviar e-mail de convite");
    } finally {
      setSendingEmail(null);
    }
  };

  const deleteInvite = async (id: string) => {
    try {
      const { error } = await supabase.from("employee_invites").delete().eq("id", id);

      if (error) {
        throw error;
      }

      toast.success("Convite excluído permanentemente");
      fetchInvites();
    } catch (error) {
      console.error("Error deleting invite:", error);
      toast.error("Erro ao excluir convite");
    }
  };

  const copyToClipboard = (code: string) => {
    const url = `${PRODUCTION_URL}/cadastro-funcionario?code=${code}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copiado para a área de transferência!");
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "admin":
        return <Badge className="bg-pimpo-red">Administrador</Badge>;
      case "teacher":
        return <Badge className="bg-pimpo-blue">Professor(a)</Badge>;
      case "cook":
        return <Badge className="bg-pimpo-yellow text-pimpo-yellow-foreground">Cozinheira</Badge>;
      case "nutritionist":
        return <Badge className="bg-pimpo-green">Nutricionista</Badge>;
      case "pedagogue":
        return <Badge className="bg-purple-500">Pedagoga</Badge>;
      case "auxiliar":
        return <Badge className="bg-cyan-500">Auxiliar de Sala</Badge>;
      default:
        return <Badge variant="secondary">{role}</Badge>;
    }
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      admin: "Administrador(a)",
      teacher: "Professor(a)",
      cook: "Cozinheira",
      nutritionist: "Nutricionista",
      pedagogue: "Pedagoga",
      auxiliar: "Auxiliar de Sala",
    };
    return labels[role] || role;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <KeyRound className="w-7 h-7 text-pimpo-yellow" />
            Convites de Funcionários
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Gere códigos de convite e envie por e-mail para novos funcionários
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => setEmailDiagnosticOpen(true)}
          className="gap-2"
        >
          <Database className="w-4 h-4" />
          Liberar E-mail
        </Button>
      </div>

      {/* Email Diagnostic Modal */}
      <EmailDiagnosticModal
        open={emailDiagnosticOpen}
        onOpenChange={setEmailDiagnosticOpen}
        onCleanupComplete={() => fetchInvites()}
      />

      {/* Create Invite */}
      <Card className="border-pimpo-green/30 bg-gradient-to-r from-pimpo-green/5 to-transparent">
        <CardHeader>
          <CardTitle className="text-lg">Criar Novo Convite</CardTitle>
          <CardDescription>
            O convite expira em 7 dias. Informe o e-mail para enviar automaticamente.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="role">Função do Funcionário *</Label>
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="teacher">Professor(a)</SelectItem>
                  <SelectItem value="auxiliar">Auxiliar de Sala</SelectItem>
                  <SelectItem value="cook">Cozinheira</SelectItem>
                  <SelectItem value="nutritionist">Nutricionista</SelectItem>
                  <SelectItem value="pedagogue">Pedagoga</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="employeeName">Nome do Funcionário</Label>
              <Input
                id="employeeName"
                value={employeeName}
                onChange={(e) => setEmployeeName(e.target.value)}
                placeholder="Ex: Maria Silva"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="employeeEmail">E-mail do Funcionário</Label>
              <Input
                id="employeeEmail"
                type="email"
                value={employeeEmail}
                onChange={(e) => setEmployeeEmail(e.target.value)}
                placeholder="email@exemplo.com"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Se informado, o convite será enviado automaticamente por e-mail
              </p>
            </div>
            <div className="flex items-end">
              <Button onClick={createInvite} disabled={creating} className="w-full md:w-auto">
                {creating ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : employeeEmail.trim() ? (
                  <Send className="w-4 h-4 mr-2" />
                ) : (
                  <Plus className="w-4 h-4 mr-2" />
                )}
                {employeeEmail.trim() ? "Gerar e Enviar Convite" : "Gerar Convite"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Invites List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Convites Gerados</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-pimpo-blue" />
            </div>
          ) : invites.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <KeyRound className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p>Nenhum convite gerado ainda</p>
            </div>
          ) : (
            <div className="space-y-4">
              {invites.map((invite) => {
                const isExpired = new Date(invite.expires_at) < new Date();
                
                return (
                  <div
                    key={invite.id}
                    className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg border ${
                      invite.is_used
                        ? "bg-muted/50 border-muted"
                        : isExpired
                        ? "bg-pimpo-red/5 border-pimpo-red/20"
                        : "bg-pimpo-green/5 border-pimpo-green/20"
                    }`}
                  >
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center gap-3 flex-wrap">
                        <code className="text-lg font-mono font-bold tracking-widest">
                          {invite.invite_code}
                        </code>
                        {getRoleBadge(invite.role)}
                        {invite.is_used ? (
                          <Badge variant="secondary" className="gap-1">
                            <Check className="w-3 h-3" />
                            Usado
                          </Badge>
                        ) : isExpired ? (
                          <Badge variant="destructive" className="gap-1">
                            <X className="w-3 h-3" />
                            Expirado
                          </Badge>
                        ) : (
                          <Badge className="bg-pimpo-green gap-1">
                            Ativo
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Criado em {format(new Date(invite.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        {invite.employee_email && (
                          <> · <Mail className="w-3 h-3 inline" /> {invite.employee_name || invite.employee_email}</>
                        )}
                        {!invite.is_used && !isExpired && (
                          <> · Expira em {format(new Date(invite.expires_at), "dd/MM/yyyy", { locale: ptBR })}</>
                        )}
                        {invite.is_used && invite.used_at && (
                          <> · Usado em {format(new Date(invite.used_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-3 sm:mt-0 flex-wrap">
                      {!invite.is_used && !isExpired && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => resendWhatsApp(invite)}
                            disabled={sendingWhatsApp === invite.invite_code}
                            className="text-pimpo-green hover:text-pimpo-green"
                          >
                            {sendingWhatsApp === invite.invite_code ? (
                              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                            ) : (
                              <MessageCircle className="w-4 h-4 mr-1" />
                            )}
                            WhatsApp
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyToClipboard(invite.invite_code)}
                          >
                            <Copy className="w-4 h-4 mr-1" />
                            Copiar
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              if (invite.employee_email) {
                                await sendInviteEmail(
                                  invite.invite_code,
                                  invite.role,
                                  invite.employee_email,
                                  invite.employee_name || undefined
                                );
                              } else {
                                setResendInvite(invite);
                                setResendEmail("");
                                setResendName("");
                                setResendDialogOpen(true);
                              }
                            }}
                            disabled={sendingEmail === invite.invite_code}
                          >
                            {sendingEmail === invite.invite_code ? (
                              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                            ) : (
                              <Mail className="w-4 h-4 mr-1" />
                            )}
                            {invite.employee_email ? "Reenviar" : "Email"}
                          </Button>
                        </>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteInvite(invite.id)}
                        className="text-destructive hover:text-destructive"
                        title="Excluir convite"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
      {/* Resend Email Dialog */}
      <Dialog open={resendDialogOpen} onOpenChange={setResendDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Enviar Convite por E-mail</DialogTitle>
            <DialogDescription>
              {resendInvite && (
                <>
                  Código: <strong>{resendInvite.invite_code}</strong> ({getRoleLabel(resendInvite.role)})
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="resend-email">E-mail do Funcionário *</Label>
              <Input
                id="resend-email"
                type="email"
                value={resendEmail}
                onChange={(e) => setResendEmail(e.target.value)}
                placeholder="email@exemplo.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="resend-name">Nome do Funcionário (opcional)</Label>
              <Input
                id="resend-name"
                value={resendName}
                onChange={(e) => setResendName(e.target.value)}
                placeholder="Ex: Maria Silva"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResendDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              disabled={!resendEmail.trim() || sendingEmail !== null}
              onClick={async () => {
                if (resendInvite && resendEmail.trim()) {
                  await sendInviteEmail(
                    resendInvite.invite_code,
                    resendInvite.role,
                    resendEmail.trim(),
                    resendName.trim() || undefined
                  );
                  setResendDialogOpen(false);
                }
              }}
            >
              {sendingEmail ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Enviar Convite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
