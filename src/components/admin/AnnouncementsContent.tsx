import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import {
  Megaphone,
  Plus,
  Loader2,
  Trash2,
  Edit,
  AlertTriangle,
  Info,
  AlertCircle,
  Bell,
  Calendar,
  Eye,
  EyeOff,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: "low" | "normal" | "high" | "urgent";
  class_type: string | null;
  all_classes: boolean;
  is_active: boolean;
  starts_at: string | null;
  expires_at: string | null;
  created_at: string;
  child_id: string | null;
}

interface Child {
  id: string;
  full_name: string;
  class_type: string;
}

const priorityConfig = {
  low: { label: "Baixa", color: "bg-muted text-muted-foreground", icon: Info },
  normal: { label: "Normal", color: "bg-pimpo-blue text-white", icon: Bell },
  high: { label: "Alta", color: "bg-pimpo-yellow text-yellow-900", icon: AlertCircle },
  urgent: { label: "Urgente", color: "bg-pimpo-red text-white", icon: AlertTriangle },
};

const classLabels: Record<string, string> = {
  bercario: "Berçário",
  maternal: "Maternal",
  jardim: "Jardim",
};

export function AnnouncementsContent() {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    priority: "normal" as "low" | "normal" | "high" | "urgent",
    allClasses: true,
    classType: "",
    expiresAt: "",
    targetType: "general" as "general" | "class" | "child",
    childId: "",
  });

  const fetchAnnouncements = async () => {
    const { data, error } = await supabase
      .from("announcements")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setAnnouncements(data as Announcement[]);
    }
    setLoading(false);
  };

  const fetchChildren = async () => {
    const { data, error } = await supabase
      .from("children")
      .select("id, full_name, class_type")
      .order("full_name");

    if (!error && data) {
      setChildren(data as Child[]);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
    fetchChildren();
  }, []);

  const resetForm = () => {
    setFormData({
      title: "",
      content: "",
      priority: "normal",
      allClasses: true,
      classType: "",
      expiresAt: "",
      targetType: "general",
      childId: "",
    });
    setEditingId(null);
  };

  const openEditDialog = (announcement: Announcement) => {
    let targetType: "general" | "class" | "child" = "general";
    if (announcement.child_id) {
      targetType = "child";
    } else if (!announcement.all_classes && announcement.class_type) {
      targetType = "class";
    }

    setFormData({
      title: announcement.title,
      content: announcement.content,
      priority: announcement.priority,
      allClasses: announcement.all_classes,
      classType: announcement.class_type || "",
      expiresAt: announcement.expires_at
        ? format(new Date(announcement.expires_at), "yyyy-MM-dd'T'HH:mm")
        : "",
      targetType,
      childId: announcement.child_id || "",
    });
    setEditingId(announcement.id);
    setDialogOpen(true);
  };

  const saveAnnouncement = async () => {
    if (!user || !formData.title.trim() || !formData.content.trim()) {
      toast.error("Preencha título e conteúdo do aviso");
      return;
    }

    setSaving(true);

    let allClasses = true;
    let classType: "bercario" | "maternal" | "jardim" | null = null;
    let childId: string | null = null;

    if (formData.targetType === "class") {
      allClasses = false;
      classType = formData.classType as "bercario" | "maternal" | "jardim" || null;
    } else if (formData.targetType === "child") {
      allClasses = false;
      childId = formData.childId || null;
    }

    const announcementData = {
      title: formData.title.trim(),
      content: formData.content.trim(),
      priority: formData.priority,
      all_classes: allClasses,
      class_type: classType,
      child_id: childId,
      expires_at: formData.expiresAt ? new Date(formData.expiresAt).toISOString() : null,
      created_by: user.id,
      is_active: true,
    };

    let error;
    if (editingId) {
      const { error: updateError } = await supabase
        .from("announcements")
        .update(announcementData)
        .eq("id", editingId);
      error = updateError;
    } else {
      const { error: insertError } = await supabase
        .from("announcements")
        .insert([announcementData]);
      error = insertError;
    }

    if (error) {
      console.error("Error saving announcement:", error);
      toast.error("Erro ao salvar aviso");
    } else {
      toast.success(editingId ? "Aviso atualizado!" : "Aviso criado com sucesso!");

      // If it's a new announcement, trigger Push Notification
      if (!editingId && announcementData.is_active !== false) {
        let parentIds: string[] = [];

        if (childId) {
          const { data: regs } = await supabase
            .from("child_registrations")
            .select("parent_id")
            .eq("child_id", childId)
            .eq("status", "approved");
          if (regs) parentIds = [...new Set(regs.map(r => r.parent_id))].filter(Boolean) as string[];
        } else {
          let query = supabase.from("children").select("id").eq("status", "active");
          if (classType) query = query.eq("class_type", classType);
          const { data: childrenInScope } = await query;

          if (childrenInScope && childrenInScope.length > 0) {
            const cIds = childrenInScope.map(c => c.id);
            const { data: regs } = await supabase
              .from("child_registrations")
              .select("parent_id")
              .in("child_id", cIds)
              .eq("status", "approved");
            if (regs) parentIds = [...new Set(regs.map(r => r.parent_id))].filter(Boolean) as string[];
          }
        }

        if (parentIds.length > 0) {
          const titleMap = {
            low: "Novo aviso escolar",
            normal: "📅 Novo aviso escolar",
            high: "⚠️ Importante: Aviso escolar",
            urgent: "🚨 URGENTE: Aviso da escola",
          };

          supabase.functions.invoke("send-push-notification", {
            body: {
              user_ids: parentIds,
              title: titleMap[formData.priority] || "Novo aviso",
              body: formData.title,
              url: "/painel/mural",
              tag: "announcement",
            },
          }).catch(err => console.error("Push API error:", err));
        }
      }

      resetForm();
      setDialogOpen(false);
      fetchAnnouncements();
    }

    setSaving(false);
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from("announcements")
      .update({ is_active: !currentStatus })
      .eq("id", id);

    if (error) {
      toast.error("Erro ao atualizar status");
    } else {
      toast.success(!currentStatus ? "Aviso ativado" : "Aviso desativado");
      fetchAnnouncements();
    }
  };

  const deleteAnnouncement = async (id: string) => {
    const { error } = await supabase
      .from("announcements")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Erro ao excluir aviso");
    } else {
      toast.success("Aviso excluído");
      fetchAnnouncements();
    }
  };

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Novo Aviso
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingId ? "Editar Aviso" : "Criar Novo Aviso"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <Label htmlFor="title">Título *</Label>
                <Input
                  id="title"
                  placeholder="Ex: Reunião de Pais"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="content">Conteúdo *</Label>
                <Textarea
                  id="content"
                  placeholder="Escreva o aviso completo aqui..."
                  rows={4}
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Prioridade</Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(v) => setFormData({ ...formData, priority: v as any })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">🔵 Baixa</SelectItem>
                      <SelectItem value="normal">🔔 Normal</SelectItem>
                      <SelectItem value="high">⚠️ Alta</SelectItem>
                      <SelectItem value="urgent">🚨 Urgente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="expiresAt">Expira em (opcional)</Label>
                  <Input
                    id="expiresAt"
                    type="datetime-local"
                    value={formData.expiresAt}
                    onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <Label>Destinatário</Label>
                  <Select
                    value={formData.targetType}
                    onValueChange={(v) => setFormData({
                      ...formData,
                      targetType: v as "general" | "class" | "child",
                      classType: "",
                      childId: "",
                      allClasses: v === "general"
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">🌐 Todas as turmas</SelectItem>
                      <SelectItem value="class">🏫 Turma específica</SelectItem>
                      <SelectItem value="child">👶 Criança individual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.targetType === "class" && (
                  <div>
                    <Label>Turma</Label>
                    <Select
                      value={formData.classType}
                      onValueChange={(v) => setFormData({ ...formData, classType: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a turma" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bercario">Berçário</SelectItem>
                        <SelectItem value="maternal">Maternal</SelectItem>
                        <SelectItem value="jardim">Jardim</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {formData.targetType === "child" && (
                  <div>
                    <Label>Criança</Label>
                    <Select
                      value={formData.childId}
                      onValueChange={(v) => setFormData({ ...formData, childId: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a criança" />
                      </SelectTrigger>
                      <SelectContent>
                        {children.map((child) => (
                          <SelectItem key={child.id} value={child.id}>
                            {child.full_name} ({classLabels[child.class_type]})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setDialogOpen(false);
                    resetForm();
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  className="flex-1"
                  onClick={saveAnnouncement}
                  disabled={saving}
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : null}
                  {editingId ? "Salvar" : "Publicar"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Announcements List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Avisos Publicados</CardTitle>
          <CardDescription>
            {announcements.filter((a) => a.is_active && !isExpired(a.expires_at)).length} avisos ativos
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-pimpo-blue" />
            </div>
          ) : announcements.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Megaphone className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p>Nenhum aviso publicado ainda</p>
            </div>
          ) : (
            <div className="space-y-4">
              {announcements.map((announcement) => {
                const config = priorityConfig[announcement.priority];
                const PriorityIcon = config.icon;
                const expired = isExpired(announcement.expires_at);

                return (
                  <div
                    key={announcement.id}
                    className={`p-4 rounded-lg border transition-all ${!announcement.is_active || expired
                      ? "bg-muted/50 border-muted opacity-60"
                      : announcement.priority === "urgent"
                        ? "bg-pimpo-red/5 border-pimpo-red/30"
                        : announcement.priority === "high"
                          ? "bg-pimpo-yellow/10 border-pimpo-yellow/30"
                          : "bg-card border-border"
                      }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <Badge className={config.color}>
                            <PriorityIcon className="w-3 h-3 mr-1" />
                            {config.label}
                          </Badge>
                          {announcement.child_id ? (
                            <Badge variant="secondary" className="bg-pimpo-blue/20 text-pimpo-blue border-pimpo-blue/30">
                              👶 {children.find(c => c.id === announcement.child_id)?.full_name || "Criança"}
                            </Badge>
                          ) : announcement.all_classes ? (
                            <Badge variant="outline">Todas as turmas</Badge>
                          ) : announcement.class_type ? (
                            <Badge variant="secondary">
                              {classLabels[announcement.class_type]}
                            </Badge>
                          ) : null}
                          {expired && (
                            <Badge variant="destructive">Expirado</Badge>
                          )}
                          {!announcement.is_active && (
                            <Badge variant="secondary">
                              <EyeOff className="w-3 h-3 mr-1" />
                              Inativo
                            </Badge>
                          )}
                        </div>
                        <h3 className="font-semibold text-lg">{announcement.title}</h3>
                        <p className="text-muted-foreground mt-1 whitespace-pre-wrap line-clamp-3">
                          {announcement.content}
                        </p>
                        <div className="flex flex-wrap gap-3 mt-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Criado em {format(new Date(announcement.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </span>
                          {announcement.expires_at && (
                            <span className="flex items-center gap-1">
                              {expired ? "Expirou" : "Expira"} em {format(new Date(announcement.expires_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleActive(announcement.id, announcement.is_active)}
                          title={announcement.is_active ? "Desativar" : "Ativar"}
                        >
                          {announcement.is_active ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(announcement)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteAnnouncement(announcement.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
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
