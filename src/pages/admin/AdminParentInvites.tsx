import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { 
  Copy, 
  Plus, 
  Loader2, 
  Users, 
  Trash2, 
  Check, 
  X, 
  Mail, 
  Phone, 
  Baby, 
  Send, 
  Tag, 
  Percent,
  DollarSign,
  ChevronDown,
  Gift
} from "lucide-react";
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
  coupon_code: string | null;
}

interface DiscountCoupon {
  id: string;
  code: string;
  description: string | null;
  discount_type: string;
  discount_value: number;
  is_active: boolean;
  valid_until: string | null;
}

export default function AdminParentInvites() {
  const { user } = useAuth();
  const [invites, setInvites] = useState<ParentInvite[]>([]);
  const [coupons, setCoupons] = useState<DiscountCoupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [sendingEmail, setSendingEmail] = useState<string | null>(null);
  const [wantsCoupon, setWantsCoupon] = useState(false);
  const [couponMode, setCouponMode] = useState<"existing" | "new">("existing");
  const [formData, setFormData] = useState({
    email: "",
    phone: "",
    childName: "",
    notes: "",
    sendEmail: true,
    couponCode: "",
  });
  const [newCouponData, setNewCouponData] = useState({
    code: "",
    discount_type: "percentage" as "percentage" | "fixed",
    discount_value: "",
    description: "",
  });

  const fetchInvites = async () => {
    const { data, error } = await supabase
      .from("parent_invites")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setInvites(data as ParentInvite[]);
    }
    setLoading(false);
  };

  const fetchCoupons = async () => {
    const today = new Date().toISOString().split("T")[0];
    const { data, error } = await supabase
      .from("discount_coupons")
      .select("id, code, description, discount_type, discount_value, is_active, valid_until")
      .eq("is_active", true)
      .or(`valid_until.is.null,valid_until.gte.${today}`)
      .order("code");

    if (!error && data) {
      setCoupons(data);
    }
  };

  useEffect(() => {
    fetchInvites();
    fetchCoupons();
  }, []);

  const generateCode = (prefix: string = "PAI-") => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = prefix;
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const createInvite = async () => {
    if (!user) return;

    setCreating(true);
    
    let couponCodeToUse: string | null = null;

    // If user wants a coupon, handle it
    if (wantsCoupon) {
      if (couponMode === "existing" && formData.couponCode) {
        couponCodeToUse = formData.couponCode;
      } else if (couponMode === "new") {
        // Validate new coupon data
        if (!newCouponData.code.trim()) {
          toast.error("Informe um código para o cupom");
          setCreating(false);
          return;
        }
        if (!newCouponData.discount_value || parseFloat(newCouponData.discount_value) <= 0) {
          toast.error("Informe um valor de desconto válido");
          setCreating(false);
          return;
        }
        if (newCouponData.discount_type === "percentage" && parseFloat(newCouponData.discount_value) > 100) {
          toast.error("A porcentagem não pode ser maior que 100%");
          setCreating(false);
          return;
        }

        // Create the new coupon
        const { error: couponError } = await supabase.from("discount_coupons").insert({
          code: newCouponData.code.toUpperCase().trim(),
          description: newCouponData.description || `Cupom para convite de ${formData.childName || "novo responsável"}`,
          discount_type: newCouponData.discount_type,
          discount_value: parseFloat(newCouponData.discount_value),
          is_active: true,
          created_by: user.id,
        });

        if (couponError) {
          console.error("Error creating coupon:", couponError);
          if (couponError.message.includes("duplicate")) {
            toast.error("Já existe um cupom com este código");
          } else {
            toast.error("Erro ao criar cupom");
          }
          setCreating(false);
          return;
        }

        couponCodeToUse = newCouponData.code.toUpperCase().trim();
        toast.success(`Cupom ${couponCodeToUse} criado!`);
        fetchCoupons();
      }
    }

    const code = generateCode();

    // Calculate expiration date (30 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const { data, error } = await supabase.from("parent_invites").insert([{
      invite_code: code,
      email: formData.email || null,
      phone: formData.phone || null,
      child_name: formData.childName || null,
      notes: formData.notes || null,
      expires_at: expiresAt.toISOString(),
      created_by: user.id,
      coupon_code: couponCodeToUse,
    }]).select().single();

    if (error) {
      console.error("Error creating invite:", error);
      toast.error("Erro ao criar convite");
      setCreating(false);
      return;
    }

    const couponText = couponCodeToUse ? ` com cupom ${couponCodeToUse}` : "";
    toast.success(`Convite ${code} criado com sucesso${couponText}!`);
    
    // Send email if email is provided and sendEmail is checked
    if (formData.email && formData.sendEmail) {
      // Get coupon details for email
      let discountType: "percentage" | "fixed" | undefined;
      let discountValue: number | undefined;

      if (couponCodeToUse) {
        if (couponMode === "new") {
          discountType = newCouponData.discount_type;
          discountValue = parseFloat(newCouponData.discount_value);
        } else {
          // Find existing coupon details from state or fetch fresh
          const existingCoupon = coupons.find((c) => c.code === couponCodeToUse);
          if (existingCoupon) {
            discountType = existingCoupon.discount_type as "percentage" | "fixed";
            discountValue = existingCoupon.discount_value;
          } else {
            // If not found in state, fetch from database
            const { data: couponData } = await supabase
              .from("discount_coupons")
              .select("discount_type, discount_value")
              .eq("code", couponCodeToUse)
              .maybeSingle();

            if (couponData) {
              discountType = couponData.discount_type as "percentage" | "fixed";
              discountValue = couponData.discount_value;
            }
          }
        }
      }

      await sendInviteEmail(
        formData.email,
        code,
        formData.childName || undefined,
        couponCodeToUse || undefined,
        discountType,
        discountValue
      );
    }

    // Reset form
    setFormData({ email: "", phone: "", childName: "", notes: "", sendEmail: true, couponCode: "" });
    setNewCouponData({ code: "", discount_type: "percentage", discount_value: "", description: "" });
    setWantsCoupon(false);
    setCouponMode("existing");
    fetchInvites();
    setCreating(false);
  };

  const sendInviteEmail = async (
    email: string,
    inviteCode: string,
    childName?: string,
    couponCode?: string,
    couponDiscountType?: "percentage" | "fixed",
    couponDiscountValue?: number
  ) => {
    setSendingEmail(inviteCode);
    try {
      const { data: { session } } = await supabase.auth.getSession();

      const normalizedCouponCode = couponCode?.trim().toUpperCase() || undefined;
      let resolvedType = couponDiscountType;
      let resolvedValue = couponDiscountValue;

      // If this call didn't include coupon metadata (common on "Enviar Email"), fetch it.
      if (normalizedCouponCode && (!resolvedType || typeof resolvedValue !== "number")) {
        const existingCoupon = coupons.find((c) => c.code === normalizedCouponCode);
        if (existingCoupon) {
          resolvedType = existingCoupon.discount_type as "percentage" | "fixed";
          resolvedValue = existingCoupon.discount_value;
        } else {
          const { data: couponData } = await supabase
            .from("discount_coupons")
            .select("discount_type, discount_value")
            .eq("code", normalizedCouponCode)
            .maybeSingle();

          if (couponData) {
            resolvedType = couponData.discount_type as "percentage" | "fixed";
            resolvedValue = couponData.discount_value;
          }
        }
      }

      const response = await supabase.functions.invoke("send-parent-invite-email", {
        body: {
          email,
          inviteCode,
          childName,
          couponCode: normalizedCouponCode,
          couponDiscountType: resolvedType,
          couponDiscountValue: resolvedValue,
        },
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || "Erro ao enviar email");
      }

      toast.success(`Email de convite enviado para ${email}!`);
    } catch (error: any) {
      console.error("Error sending invite email:", error);
      toast.error("Erro ao enviar email de convite");
    } finally {
      setSendingEmail(null);
    }
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

  // Always use the production URL for invite links
  const PRODUCTION_URL = "https://www.crechepimpolinhos.com.br";
  
  const copyToClipboard = (invite: ParentInvite) => {
    let url = `${PRODUCTION_URL}/auth?mode=signup&invite=${invite.invite_code}`;
    if (invite.coupon_code) {
      url += `&cupom=${invite.coupon_code}`;
    }
    navigator.clipboard.writeText(url);
    toast.success("Link copiado para a área de transferência!");
  };

  const getStatus = (invite: ParentInvite) => {
    if (invite.used_by) return "used";
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) return "expired";
    return "active";
  };

  const getSelectedCoupon = () => {
    return coupons.find(c => c.code === formData.couponCode);
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

          {/* Coupon Section */}
          <div className="border rounded-lg p-4 bg-background/50">
            <div className="flex items-center space-x-3">
              <Checkbox
                id="wantsCoupon"
                checked={wantsCoupon}
                onCheckedChange={(checked) => setWantsCoupon(checked === true)}
              />
              <Label htmlFor="wantsCoupon" className="text-sm font-medium cursor-pointer flex items-center gap-2">
                <Gift className="w-4 h-4 text-pimpo-yellow" />
                Deseja oferecer um cupom de desconto neste convite?
              </Label>
            </div>

            <Collapsible open={wantsCoupon}>
              <CollapsibleContent className="mt-4 space-y-4">
                {/* Choose between existing or new coupon */}
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="couponMode"
                      checked={couponMode === "existing"}
                      onChange={() => setCouponMode("existing")}
                      className="w-4 h-4 text-primary"
                    />
                    <span className="text-sm">Usar cupom existente</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="couponMode"
                      checked={couponMode === "new"}
                      onChange={() => setCouponMode("new")}
                      className="w-4 h-4 text-primary"
                    />
                    <span className="text-sm">Criar novo cupom</span>
                  </label>
                </div>

                {couponMode === "existing" ? (
                  <div className="space-y-2">
                    <Label>Selecionar Cupom</Label>
                    <Select
                      value={formData.couponCode}
                      onValueChange={(value) => setFormData({ ...formData, couponCode: value === "none" ? "" : value })}
                    >
                      <SelectTrigger className="w-full">
                        <div className="flex items-center gap-2">
                          <Tag className="w-4 h-4 text-muted-foreground" />
                          <SelectValue placeholder="Selecione um cupom" />
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nenhum</SelectItem>
                        {coupons.map((coupon) => (
                          <SelectItem key={coupon.id} value={coupon.code}>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-semibold">{coupon.code}</span>
                              <Badge variant="secondary" className="text-xs">
                                {coupon.discount_type === "percentage" 
                                  ? `${coupon.discount_value}%` 
                                  : `R$ ${coupon.discount_value.toFixed(2)}`}
                              </Badge>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {getSelectedCoupon()?.description && (
                      <p className="text-xs text-muted-foreground">
                        {getSelectedCoupon()?.description}
                      </p>
                    )}
                    {coupons.length === 0 && (
                      <p className="text-xs text-muted-foreground">
                        Nenhum cupom ativo disponível. Crie um novo acima.
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4 bg-muted/30 rounded-lg p-4 border border-dashed">
                    <div className="flex items-center gap-2 text-sm font-medium text-primary">
                      <Plus className="w-4 h-4" />
                      Configurar Novo Cupom
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="newCouponCode">Código do Cupom *</Label>
                        <Input
                          id="newCouponCode"
                          value={newCouponData.code}
                          onChange={(e) => setNewCouponData({ ...newCouponData, code: e.target.value.toUpperCase() })}
                          placeholder="Ex: BEMVINDO10"
                          className="font-mono uppercase"
                          maxLength={20}
                        />
                      </div>
                      <div>
                        <Label>Tipo de Desconto *</Label>
                        <Select
                          value={newCouponData.discount_type}
                          onValueChange={(value: "percentage" | "fixed") => 
                            setNewCouponData({ ...newCouponData, discount_type: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="percentage">
                              <div className="flex items-center gap-2">
                                <Percent className="w-3 h-3" />
                                Porcentagem (%)
                              </div>
                            </SelectItem>
                            <SelectItem value="fixed">
                              <div className="flex items-center gap-2">
                                <DollarSign className="w-3 h-3" />
                                Valor Fixo (R$)
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="newCouponValue">
                          Valor {newCouponData.discount_type === "percentage" ? "(%)" : "(R$)"} *
                        </Label>
                        <Input
                          id="newCouponValue"
                          type="number"
                          step={newCouponData.discount_type === "percentage" ? "1" : "0.01"}
                          min="0"
                          max={newCouponData.discount_type === "percentage" ? "100" : undefined}
                          value={newCouponData.discount_value}
                          onChange={(e) => setNewCouponData({ ...newCouponData, discount_value: e.target.value })}
                          placeholder={newCouponData.discount_type === "percentage" ? "10" : "50.00"}
                        />
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="newCouponDescription">Descrição (opcional)</Label>
                      <Input
                        id="newCouponDescription"
                        value={newCouponData.description}
                        onChange={(e) => setNewCouponData({ ...newCouponData, description: e.target.value })}
                        placeholder="Ex: Desconto de boas-vindas para nova família"
                      />
                    </div>

                    {newCouponData.code && newCouponData.discount_value && (
                      <div className="flex items-center gap-2 p-3 bg-primary/10 rounded-lg border border-primary/20">
                        <Tag className="w-4 h-4 text-primary" />
                        <span className="text-sm">
                          Cupom <strong className="font-mono">{newCouponData.code}</strong> com{" "}
                          <strong>
                            {newCouponData.discount_type === "percentage" 
                              ? `${newCouponData.discount_value}% de desconto`
                              : `R$ ${parseFloat(newCouponData.discount_value || "0").toFixed(2)} de desconto`
                            }
                          </strong>{" "}
                          será criado junto com o convite.
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>
          </div>

          <div className="flex items-center justify-between flex-wrap gap-4 pt-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="sendEmail"
                checked={formData.sendEmail}
                onCheckedChange={(checked) => setFormData({ ...formData, sendEmail: checked === true })}
                disabled={!formData.email}
              />
              <Label htmlFor="sendEmail" className="text-sm font-normal cursor-pointer">
                Enviar convite por email automaticamente
              </Label>
            </div>

            <Button onClick={createInvite} disabled={creating} size="lg">
              {creating ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              Gerar Convite para Pais
            </Button>
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
                        {invite.coupon_code && (
                          <Badge variant="outline" className="gap-1 border-pimpo-yellow text-pimpo-yellow">
                            <Gift className="w-3 h-3" />
                            {invite.coupon_code}
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
                      {status === "active" && invite.email && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => sendInviteEmail(invite.email!, invite.invite_code, invite.child_name || undefined, invite.coupon_code || undefined)}
                          disabled={sendingEmail === invite.invite_code}
                        >
                          {sendingEmail === invite.invite_code ? (
                            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                          ) : (
                            <Send className="w-4 h-4 mr-1" />
                          )}
                          Enviar Email
                        </Button>
                      )}
                      {status === "active" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(invite)}
                        >
                          <Copy className="w-4 h-4 mr-1" />
                          Copiar
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
