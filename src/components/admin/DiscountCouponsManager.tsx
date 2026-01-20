import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Plus, 
  Pencil, 
  Trash2, 
  Loader2, 
  Percent, 
  DollarSign,
  ToggleLeft,
  ToggleRight,
  Calendar
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface DiscountCoupon {
  id: string;
  code: string;
  description: string | null;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  is_active: boolean;
  valid_from: string | null;
  valid_until: string | null;
  max_uses: number | null;
  current_uses: number;
  applicable_classes: string[] | null;
  applicable_plans: string[] | null;
  created_at: string;
}

interface CouponFormData {
  code: string;
  description: string;
  discount_type: "percentage" | "fixed";
  discount_value: string;
  is_active: boolean;
  valid_from: string;
  valid_until: string;
  max_uses: string;
}

const initialFormData: CouponFormData = {
  code: "",
  description: "",
  discount_type: "percentage",
  discount_value: "",
  is_active: true,
  valid_from: "",
  valid_until: "",
  max_uses: "",
};

export function DiscountCouponsManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<DiscountCoupon | null>(null);
  const [formData, setFormData] = useState<CouponFormData>(initialFormData);

  // Fetch coupons
  const { data: coupons, isLoading } = useQuery({
    queryKey: ["discount-coupons"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("discount_coupons")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as DiscountCoupon[];
    },
  });

  // Create/Update coupon mutation
  const saveMutation = useMutation({
    mutationFn: async (data: CouponFormData) => {
      const payload = {
        code: data.code.toUpperCase().trim(),
        description: data.description || null,
        discount_type: data.discount_type,
        discount_value: parseFloat(data.discount_value),
        is_active: data.is_active,
        valid_from: data.valid_from || null,
        valid_until: data.valid_until || null,
        max_uses: data.max_uses ? parseInt(data.max_uses) : null,
      };

      if (editingCoupon) {
        const { error } = await supabase
          .from("discount_coupons")
          .update(payload)
          .eq("id", editingCoupon.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("discount_coupons")
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["discount-coupons"] });
      toast({
        title: editingCoupon ? "Cupom atualizado!" : "Cupom criado!",
        description: `O cupom ${formData.code.toUpperCase()} foi salvo com sucesso.`,
      });
      handleCloseDialog();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao salvar cupom",
        description: error.message.includes("duplicate") 
          ? "Já existe um cupom com este código." 
          : error.message,
        variant: "destructive",
      });
    },
  });

  // Toggle active status mutation
  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from("discount_coupons")
        .update({ is_active: isActive })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["discount-coupons"] });
    },
  });

  // Delete coupon mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("discount_coupons")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["discount-coupons"] });
      toast({
        title: "Cupom excluído",
        description: "O cupom foi removido com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro ao excluir cupom",
        description: "Não foi possível excluir o cupom.",
        variant: "destructive",
      });
    },
  });

  const handleOpenCreate = () => {
    setEditingCoupon(null);
    setFormData(initialFormData);
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (coupon: DiscountCoupon) => {
    setEditingCoupon(coupon);
    setFormData({
      code: coupon.code,
      description: coupon.description || "",
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value.toString(),
      is_active: coupon.is_active,
      valid_from: coupon.valid_from || "",
      valid_until: coupon.valid_until || "",
      max_uses: coupon.max_uses?.toString() || "",
    });
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingCoupon(null);
    setFormData(initialFormData);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.code.trim()) {
      toast({
        title: "Código obrigatório",
        description: "Informe um código para o cupom.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.discount_value || parseFloat(formData.discount_value) <= 0) {
      toast({
        title: "Valor inválido",
        description: "Informe um valor de desconto maior que zero.",
        variant: "destructive",
      });
      return;
    }

    if (formData.discount_type === "percentage" && parseFloat(formData.discount_value) > 100) {
      toast({
        title: "Valor inválido",
        description: "A porcentagem não pode ser maior que 100%.",
        variant: "destructive",
      });
      return;
    }

    saveMutation.mutate(formData);
  };

  const formatDiscountValue = (coupon: DiscountCoupon) => {
    if (coupon.discount_type === "percentage") {
      return `${coupon.discount_value}%`;
    }
    return `R$ ${coupon.discount_value.toFixed(2)}`;
  };

  const getStatusBadge = (coupon: DiscountCoupon) => {
    if (!coupon.is_active) {
      return <Badge variant="secondary">Inativo</Badge>;
    }
    
    const now = new Date();
    if (coupon.valid_until && new Date(coupon.valid_until) < now) {
      return <Badge variant="destructive">Expirado</Badge>;
    }
    if (coupon.valid_from && new Date(coupon.valid_from) > now) {
      return <Badge variant="outline">Agendado</Badge>;
    }
    if (coupon.max_uses && coupon.current_uses >= coupon.max_uses) {
      return <Badge variant="destructive">Esgotado</Badge>;
    }
    return <Badge className="bg-primary/10 text-primary border-primary/20">Ativo</Badge>;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Percent className="h-5 w-5" />
                Cupons de Desconto
              </CardTitle>
              <CardDescription>
                Crie e gerencie cupons de desconto para as mensalidades.
              </CardDescription>
            </div>
            <Button onClick={handleOpenCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Cupom
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {coupons && coupons.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Desconto</TableHead>
                    <TableHead>Uso</TableHead>
                    <TableHead>Validade</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {coupons.map((coupon) => (
                    <TableRow key={coupon.id}>
                      <TableCell>
                        <div>
                          <span className="font-mono font-semibold text-primary">
                            {coupon.code}
                          </span>
                          {coupon.description && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {coupon.description}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="gap-1">
                          {coupon.discount_type === "percentage" ? (
                            <Percent className="h-3 w-3" />
                          ) : (
                            <DollarSign className="h-3 w-3" />
                          )}
                          {formatDiscountValue(coupon)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {coupon.current_uses}
                          {coupon.max_uses && ` / ${coupon.max_uses}`}
                        </span>
                      </TableCell>
                      <TableCell>
                        {coupon.valid_from || coupon.valid_until ? (
                          <div className="text-xs text-muted-foreground">
                            {coupon.valid_from && (
                              <span>
                                De {format(new Date(coupon.valid_from), "dd/MM/yy", { locale: ptBR })}
                              </span>
                            )}
                            {coupon.valid_from && coupon.valid_until && " "}
                            {coupon.valid_until && (
                              <span>
                                até {format(new Date(coupon.valid_until), "dd/MM/yy", { locale: ptBR })}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">Sem limite</span>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(coupon)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => toggleMutation.mutate({ 
                              id: coupon.id, 
                              isActive: !coupon.is_active 
                            })}
                            title={coupon.is_active ? "Desativar" : "Ativar"}
                          >
                            {coupon.is_active ? (
                              <ToggleRight className="h-4 w-4 text-primary" />
                            ) : (
                              <ToggleLeft className="h-4 w-4 text-muted-foreground" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenEdit(coupon)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              if (confirm("Tem certeza que deseja excluir este cupom?")) {
                                deleteMutation.mutate(coupon.id);
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Percent className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>Nenhum cupom cadastrado.</p>
              <p className="text-sm">Clique em "Novo Cupom" para criar o primeiro.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>
                {editingCoupon ? "Editar Cupom" : "Novo Cupom de Desconto"}
              </DialogTitle>
              <DialogDescription>
                {editingCoupon 
                  ? "Atualize as informações do cupom."
                  : "Crie um novo cupom de desconto para mensalidades."
                }
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="code">Código do Cupom *</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder="Ex: DESCONTO10"
                  className="font-mono uppercase"
                  maxLength={20}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descrição interna do cupom"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo de Desconto *</Label>
                  <Select
                    value={formData.discount_type}
                    onValueChange={(value: "percentage" | "fixed") => 
                      setFormData({ ...formData, discount_type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Porcentagem (%)</SelectItem>
                      <SelectItem value="fixed">Valor Fixo (R$)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="discount_value">
                    Valor {formData.discount_type === "percentage" ? "(%)" : "(R$)"} *
                  </Label>
                  <Input
                    id="discount_value"
                    type="number"
                    step={formData.discount_type === "percentage" ? "1" : "0.01"}
                    min="0"
                    max={formData.discount_type === "percentage" ? "100" : undefined}
                    value={formData.discount_value}
                    onChange={(e) => setFormData({ ...formData, discount_value: e.target.value })}
                    placeholder={formData.discount_type === "percentage" ? "10" : "50.00"}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="valid_from">Válido a partir de</Label>
                  <Input
                    id="valid_from"
                    type="date"
                    value={formData.valid_from}
                    onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="valid_until">Válido até</Label>
                  <Input
                    id="valid_until"
                    type="date"
                    value={formData.valid_until}
                    onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="max_uses">Limite de Usos</Label>
                <Input
                  id="max_uses"
                  type="number"
                  min="1"
                  value={formData.max_uses}
                  onChange={(e) => setFormData({ ...formData, max_uses: e.target.value })}
                  placeholder="Ilimitado"
                />
                <p className="text-xs text-muted-foreground">
                  Deixe vazio para uso ilimitado.
                </p>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="space-y-0.5">
                  <Label>Cupom Ativo</Label>
                  <p className="text-xs text-muted-foreground">
                    Cupons inativos não podem ser utilizados.
                  </p>
                </div>
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => 
                    setFormData({ ...formData, is_active: checked })
                  }
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                {editingCoupon ? "Salvar Alterações" : "Criar Cupom"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
