import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { Copy, Plus, Loader2, KeyRound, Trash2, Check, X } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Invite {
  id: string;
  invite_code: string;
  role: string;
  is_used: boolean;
  created_at: string;
  expires_at: string;
  used_at: string | null;
}

export default function AdminEmployeeInvites() {
  const { user } = useAuth();
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newRole, setNewRole] = useState<string>("teacher");

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

    const { error } = await supabase.from("employee_invites").insert([{
      invite_code: code,
      role: newRole as "admin" | "teacher" | "parent" | "cook" | "nutritionist" | "pedagogue" | "auxiliar",
      created_by: user.id,
    }]);

    if (error) {
      toast.error("Erro ao criar convite");
    } else {
      toast.success(`Convite ${code} criado com sucesso!`);
      fetchInvites();
    }
    setCreating(false);
  };

  const deleteInvite = async (id: string) => {
    const { error } = await supabase.from("employee_invites").delete().eq("id", id);

    if (error) {
      toast.error("Erro ao excluir convite");
    } else {
      toast.success("Convite excluído");
      fetchInvites();
    }
  };

  const copyToClipboard = (code: string) => {
    const url = `${window.location.origin}/cadastro-funcionario?code=${code}`;
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <KeyRound className="w-7 h-7 text-pimpo-yellow" />
          Convites de Funcionários
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Gere códigos de convite para novos funcionários se cadastrarem
        </p>
      </div>

      {/* Create Invite */}
      <Card className="border-pimpo-green/30 bg-gradient-to-r from-pimpo-green/5 to-transparent">
        <CardHeader>
          <CardTitle className="text-lg">Criar Novo Convite</CardTitle>
          <CardDescription>
            O convite expira em 7 dias após a criação
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Label htmlFor="role">Função do Funcionário</Label>
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
            <div className="flex items-end">
              <Button onClick={createInvite} disabled={creating}>
                {creating ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4 mr-2" />
                )}
                Gerar Convite
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
                      <div className="flex items-center gap-3">
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
                        {!invite.is_used && !isExpired && (
                          <> · Expira em {format(new Date(invite.expires_at), "dd/MM/yyyy", { locale: ptBR })}</>
                        )}
                        {invite.is_used && invite.used_at && (
                          <> · Usado em {format(new Date(invite.used_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-3 sm:mt-0">
                      {!invite.is_used && !isExpired && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(invite.invite_code)}
                        >
                          <Copy className="w-4 h-4 mr-1" />
                          Copiar Link
                        </Button>
                      )}
                      {!invite.is_used && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteInvite(invite.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
