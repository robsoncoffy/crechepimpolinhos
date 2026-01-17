import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { Copy, Plus, Loader2, Users, Trash2, Check, X, Mail, Phone, Baby } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ParentInvite {
  id: string;
  invite_code: string;
  email: string | null;
  phone: string | null;
  child_name: string | null;
  notes: string | null;
  used_by: string | null;
  used_at: string | null;
  expires_at: string | null;
  created_at: string;
}

export default function AdminParentInvites() {
  const { user } = useAuth();
  const [invites, setInvites] = useState<ParentInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    phone: "",
    childName: "",
    notes: "",
  });

  const fetchInvites = async () => {
    const { data, error } = await supabase
      .from("parent_invites")
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
    let code = "PAI-";
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const createInvite = async () => {
    if (!user) return;

    setCreating(true);
    const code = generateCode();

    // Calculate expiration date (30 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const { error } = await supabase.from("parent_invites").insert([{
      invite_code: code,
      email: formData.email || null,
      phone: formData.phone || null,
      child_name: formData.childName || null,
      notes: formData.notes || null,
      expires_at: expiresAt.toISOString(),
      created_by: user.id,
    }]);

    if (error) {
      console.error("Error creating invite:", error);
      toast.error("Erro ao criar convite");
    } else {
      toast.success(`Convite ${code} criado com sucesso!`);
      setFormData({ email: "", phone: "", childName: "", notes: "" });
      fetchInvites();
    }
    setCreating(false);
  };

  const deleteInvite = async (id: string) => {
    const { error } = await supabase.from("parent_invites").delete().eq("id", id);

    if (error) {
      toast.error("Erro ao excluir convite");
    } else {
      toast.success("Convite excluído");
      fetchInvites();
    }
  };

  const copyToClipboard = (code: string) => {
    const url = `${window.location.origin}/auth?mode=signup&invite=${code}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copiado para a área de transferência!");
  };

  const getStatus = (invite: ParentInvite) => {
    if (invite.used_by) return "used";
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) return "expired";
    return "active";
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Users className="w-7 h-7 text-pimpo-blue" />
          Convites de Pais/Responsáveis
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Gere códigos de convite para novos pais se cadastrarem no sistema
        </p>
      </div>

      {/* Create Invite */}
      <Card className="border-pimpo-blue/30 bg-gradient-to-r from-pimpo-blue/5 to-transparent">
        <CardHeader>
          <CardTitle className="text-lg">Criar Novo Convite</CardTitle>
          <CardDescription>
            O convite expira em 30 dias após a criação. Preencha os dados opcionais para facilitar a identificação.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="childName">Nome da Criança (opcional)</Label>
              <div className="relative">
                <Baby className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="childName"
                  placeholder="Nome do filho"
                  value={formData.childName}
                  onChange={(e) => setFormData({ ...formData, childName: e.target.value })}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="email">Email do Responsável (opcional)</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="email@exemplo.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="phone">Telefone (opcional)</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="phone"
                  placeholder="(51) 99999-9999"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="notes">Observações (opcional)</Label>
              <Input
                id="notes"
                placeholder="Anotações internas"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
          </div>

          <Button onClick={createInvite} disabled={creating}>
            {creating ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Plus className="w-4 h-4 mr-2" />
            )}
            Gerar Convite para Pais
          </Button>
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
              <Users className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p>Nenhum convite gerado ainda</p>
            </div>
          ) : (
            <div className="space-y-4">
              {invites.map((invite) => {
                const status = getStatus(invite);

                return (
                  <div
                    key={invite.id}
                    className={`flex flex-col sm:flex-row sm:items-start justify-between p-4 rounded-lg border ${
                      status === "used"
                        ? "bg-muted/50 border-muted"
                        : status === "expired"
                        ? "bg-pimpo-red/5 border-pimpo-red/20"
                        : "bg-pimpo-green/5 border-pimpo-green/20"
                    }`}
                  >
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <code className="text-lg font-mono font-bold tracking-widest">
                          {invite.invite_code}
                        </code>
                        {status === "used" ? (
                          <Badge variant="secondary" className="gap-1">
                            <Check className="w-3 h-3" />
                            Usado
                          </Badge>
                        ) : status === "expired" ? (
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

                      {(invite.child_name || invite.email || invite.phone) && (
                        <div className="flex flex-wrap gap-3 text-sm">
                          {invite.child_name && (
                            <span className="flex items-center gap-1 text-muted-foreground">
                              <Baby className="w-3 h-3" />
                              {invite.child_name}
                            </span>
                          )}
                          {invite.email && (
                            <span className="flex items-center gap-1 text-muted-foreground">
                              <Mail className="w-3 h-3" />
                              {invite.email}
                            </span>
                          )}
                          {invite.phone && (
                            <span className="flex items-center gap-1 text-muted-foreground">
                              <Phone className="w-3 h-3" />
                              {invite.phone}
                            </span>
                          )}
                        </div>
                      )}

                      {invite.notes && (
                        <p className="text-xs text-muted-foreground italic">
                          {invite.notes}
                        </p>
                      )}

                      <div className="text-xs text-muted-foreground">
                        Criado em {format(new Date(invite.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        {status === "active" && invite.expires_at && (
                          <> · Expira em {format(new Date(invite.expires_at), "dd/MM/yyyy", { locale: ptBR })}</>
                        )}
                        {status === "used" && invite.used_at && (
                          <> · Usado em {format(new Date(invite.used_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mt-3 sm:mt-0 sm:ml-4">
                      {status === "active" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(invite.invite_code)}
                        >
                          <Copy className="w-4 h-4 mr-1" />
                          Copiar Link
                        </Button>
                      )}
                      {status !== "used" && (
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
