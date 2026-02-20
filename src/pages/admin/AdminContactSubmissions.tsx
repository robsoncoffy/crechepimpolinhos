import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Mail,
  Phone,
  User,
  Calendar,
  CheckCircle,
  Circle,
  Search,
  Loader2,
  MessageSquare,
  Trash2,
  ExternalLink,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ContactSubmission {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  message: string;
  is_read: boolean | null;
  created_at: string;
}

export default function AdminContactSubmissions() {
  const [submissions, setSubmissions] = useState<ContactSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "unread" | "read">("all");
  const [selectedSubmission, setSelectedSubmission] = useState<ContactSubmission | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    fetchSubmissions();
  }, []);

  async function fetchSubmissions() {
    try {
      const { data, error } = await supabase
        .from("contact_submissions")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setSubmissions(data || []);
    } catch (error) {
      console.error("Error fetching submissions:", error);
      toast.error("Erro ao carregar mensagens");
    } finally {
      setLoading(false);
    }
  }

  async function markAsRead(id: string, isRead: boolean) {
    try {
      const { error } = await supabase
        .from("contact_submissions")
        .update({ is_read: isRead })
        .eq("id", id);

      if (error) throw error;
      
      setSubmissions(prev => 
        prev.map(s => s.id === id ? { ...s, is_read: isRead } : s)
      );
      
      if (selectedSubmission?.id === id) {
        setSelectedSubmission(prev => prev ? { ...prev, is_read: isRead } : null);
      }
      
      toast.success(isRead ? "Marcada como lida" : "Marcada como não lida");
    } catch (error) {
      console.error("Error updating submission:", error);
      toast.error("Erro ao atualizar mensagem");
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    
    try {
      const { error } = await supabase
        .from("contact_submissions")
        .delete()
        .eq("id", deleteId);

      if (error) throw error;
      
      setSubmissions(prev => prev.filter(s => s.id !== deleteId));
      if (selectedSubmission?.id === deleteId) {
        setSelectedSubmission(null);
      }
      toast.success("Mensagem excluída");
    } catch (error) {
      console.error("Error deleting submission:", error);
      toast.error("Erro ao excluir mensagem");
    } finally {
      setDeleteId(null);
    }
  }

  const filteredSubmissions = submissions.filter(s => {
    const matchesSearch = 
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase()) ||
      s.message.toLowerCase().includes(search.toLowerCase());
    
    const matchesFilter = 
      filter === "all" ||
      (filter === "unread" && !s.is_read) ||
      (filter === "read" && s.is_read);
    
    return matchesSearch && matchesFilter;
  });

  const unreadCount = submissions.filter(s => !s.is_read).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-fredoka text-2xl lg:text-3xl font-bold text-foreground">
            Mensagens do Site
          </h1>
          <p className="text-muted-foreground">
            Mensagens recebidas pelo formulário de contato
          </p>
        </div>
        {unreadCount > 0 && (
          <Badge variant="destructive" className="self-start">
            {unreadCount} não lida{unreadCount > 1 ? "s" : ""}
          </Badge>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, email ou mensagem..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={filter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("all")}
          >
            Todas ({submissions.length})
          </Button>
          <Button
            variant={filter === "unread" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("unread")}
          >
            Não lidas ({unreadCount})
          </Button>
          <Button
            variant={filter === "read" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("read")}
          >
            Lidas ({submissions.length - unreadCount})
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <MessageSquare className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{submissions.length}</p>
                <p className="text-sm text-muted-foreground">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10">
                <Circle className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold">{unreadCount}</p>
                <p className="text-sm text-muted-foreground">Não lidas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <CheckCircle className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{submissions.length - unreadCount}</p>
                <p className="text-sm text-muted-foreground">Lidas</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Submissions List */}
      <Card>
        <CardHeader>
          <CardTitle>Mensagens</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredSubmissions.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              {search || filter !== "all" 
                ? "Nenhuma mensagem encontrada com os filtros aplicados."
                : "Nenhuma mensagem recebida ainda."}
            </p>
          ) : (
            <div className="space-y-3">
              {filteredSubmissions.map((submission) => (
                <div
                  key={submission.id}
                  className={`p-4 rounded-lg border cursor-pointer transition-colors hover:bg-accent/50 ${
                    !submission.is_read ? "bg-primary/5 border-primary/20" : ""
                  }`}
                  onClick={() => {
                    setSelectedSubmission(submission);
                    if (!submission.is_read) {
                      markAsRead(submission.id, true);
                    }
                  }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {!submission.is_read && (
                          <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
                        )}
                        <span className="font-medium truncate">{submission.name}</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground mb-2">
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {submission.email}
                        </span>
                        {submission.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {submission.phone}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {submission.message}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(submission.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!selectedSubmission} onOpenChange={() => setSelectedSubmission(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Mensagem de Contato</DialogTitle>
          </DialogHeader>
          {selectedSubmission && (
            <div className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">{selectedSubmission.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <a 
                    href={`mailto:${selectedSubmission.email}`}
                    className="text-primary hover:underline flex items-center gap-1"
                  >
                    {selectedSubmission.email}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                {selectedSubmission.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <a 
                      href={`tel:${selectedSubmission.phone}`}
                      className="text-primary hover:underline"
                    >
                      {selectedSubmission.phone}
                    </a>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  {format(new Date(selectedSubmission.created_at), "PPpp", { locale: ptBR })}
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-2">Mensagem:</h4>
                <ScrollArea className="max-h-[200px]">
                  <p className="text-muted-foreground whitespace-pre-wrap">
                    {selectedSubmission.message}
                  </p>
                </ScrollArea>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => markAsRead(selectedSubmission.id, !selectedSubmission.is_read)}
                >
                  {selectedSubmission.is_read ? (
                    <>
                      <Circle className="w-4 h-4 mr-2" />
                      Marcar como não lida
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Marcar como lida
                    </>
                  )}
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setDeleteId(selectedSubmission.id)}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Excluir
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir mensagem?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A mensagem será permanentemente excluída.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
