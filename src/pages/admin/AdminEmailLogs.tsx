import { useState, useEffect } from "react";
import DOMPurify from "dompurify";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Mail,
  Search,
  Loader2,
  Send,
  Inbox,
  Calendar,
  User,
  ArrowUpRight,
  ArrowDownLeft,
  Star,
  StarOff,
  Eye,
  ExternalLink,
} from "lucide-react";
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
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Configure DOMPurify to allow safe email HTML tags only
const sanitizeEmailHtml = (html: string) => {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'b', 'i', 'u', 'a', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'div', 'span', 'table', 'tr', 'td', 'th', 'tbody', 'thead', 'img'],
    ALLOWED_ATTR: ['href', 'title', 'target', 'rel', 'src', 'alt', 'width', 'height', 'style', 'class'],
    ALLOW_DATA_ATTR: false,
  });
};

interface EmailLog {
  id: string;
  direction: string;
  from_address: string | null;
  to_address: string | null;
  cc: string | null;
  subject: string | null;
  snippet: string | null;
  body_text: string | null;
  body_html: string | null;
  labels: string[] | null;
  is_read: boolean | null;
  is_starred: boolean | null;
  gmail_id: string | null;
  thread_id: string | null;
  sent_at: string | null;
  received_at: string | null;
  created_at: string;
}

export default function AdminEmailLogs() {
  const [emails, setEmails] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [directionFilter, setDirectionFilter] = useState<string>("all");
  const [selectedEmail, setSelectedEmail] = useState<EmailLog | null>(null);

  useEffect(() => {
    fetchEmails();
  }, []);

  async function fetchEmails() {
    try {
      const { data, error } = await supabase
        .from("email_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);

      if (error) throw error;
      setEmails(data || []);
    } catch (error) {
      console.error("Error fetching email logs:", error);
      toast.error("Erro ao carregar logs de email");
    } finally {
      setLoading(false);
    }
  }

  const filteredEmails = emails.filter(email => {
    const matchesSearch = 
      (email.subject?.toLowerCase().includes(search.toLowerCase()) || false) ||
      (email.from_address?.toLowerCase().includes(search.toLowerCase()) || false) ||
      (email.to_address?.toLowerCase().includes(search.toLowerCase()) || false) ||
      (email.snippet?.toLowerCase().includes(search.toLowerCase()) || false);
    
    const matchesDirection = 
      directionFilter === "all" || email.direction === directionFilter;
    
    return matchesSearch && matchesDirection;
  });

  const stats = {
    total: emails.length,
    sent: emails.filter(e => e.direction === "outbound").length,
    received: emails.filter(e => e.direction === "inbound").length,
    unread: emails.filter(e => !e.is_read).length,
  };

  // Group by date
  const groupedByDate = filteredEmails.reduce((acc, email) => {
    const date = format(new Date(email.created_at), "yyyy-MM-dd");
    if (!acc[date]) acc[date] = [];
    acc[date].push(email);
    return acc;
  }, {} as Record<string, EmailLog[]>);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-fredoka text-2xl lg:text-3xl font-bold text-foreground flex items-center gap-2">
          <Mail className="w-7 h-7 text-primary" />
          Logs de Email
        </h1>
        <p className="text-muted-foreground">
          Histórico de emails enviados e recebidos pelo sistema
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Mail className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Send className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.sent}</p>
                <p className="text-sm text-muted-foreground">Enviados</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <Inbox className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.received}</p>
                <p className="text-sm text-muted-foreground">Recebidos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/10">
                <Eye className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.unread}</p>
                <p className="text-sm text-muted-foreground">Não lidos</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por assunto, remetente ou destinatário..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={directionFilter} onValueChange={setDirectionFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Direção" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="outbound">Enviados</SelectItem>
            <SelectItem value="inbound">Recebidos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Email List */}
      <Card>
        <CardHeader>
          <CardTitle>Emails ({filteredEmails.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {Object.keys(groupedByDate).length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhum email encontrado.
            </p>
          ) : (
            <ScrollArea className="h-[500px]">
              <div className="space-y-6">
                {Object.entries(groupedByDate).map(([date, emailsInDate]) => (
                  <div key={date}>
                    <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      {format(new Date(date), "EEEE, dd 'de' MMMM", { locale: ptBR })}
                    </h3>
                    <div className="space-y-2">
                      {emailsInDate.map((email) => (
                        <div
                          key={email.id}
                          className={`p-4 rounded-lg border cursor-pointer transition-colors hover:bg-accent/50 ${
                            !email.is_read ? "bg-primary/5 border-primary/20" : ""
                          }`}
                          onClick={() => setSelectedEmail(email)}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`p-2 rounded-full ${
                              email.direction === "outbound" 
                                ? "bg-blue-500/10" 
                                : "bg-green-500/10"
                            }`}>
                              {email.direction === "outbound" ? (
                                <ArrowUpRight className="w-4 h-4 text-blue-500" />
                              ) : (
                                <ArrowDownLeft className="w-4 h-4 text-green-500" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                {!email.is_read && (
                                  <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
                                )}
                                {email.is_starred && (
                                  <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                                )}
                                <span className="font-medium truncate">
                                  {email.subject || "(Sem assunto)"}
                                </span>
                              </div>
                              
                              <div className="text-sm text-muted-foreground mb-1">
                                {email.direction === "outbound" ? (
                                  <span>Para: {email.to_address}</span>
                                ) : (
                                  <span>De: {email.from_address}</span>
                                )}
                              </div>
                              
                              {email.snippet && (
                                <p className="text-sm text-muted-foreground line-clamp-1">
                                  {email.snippet}
                                </p>
                              )}
                            </div>
                            
                            <div className="text-right shrink-0">
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(email.created_at), "HH:mm")}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Email Detail Dialog */}
      <Dialog open={!!selectedEmail} onOpenChange={() => setSelectedEmail(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedEmail?.direction === "outbound" ? (
                <ArrowUpRight className="w-5 h-5 text-blue-500" />
              ) : (
                <ArrowDownLeft className="w-5 h-5 text-green-500" />
              )}
              {selectedEmail?.subject || "(Sem assunto)"}
            </DialogTitle>
          </DialogHeader>
          {selectedEmail && (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-4">
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-medium w-16">De:</span>
                    <span>{selectedEmail.from_address || "-"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium w-16">Para:</span>
                    <span>{selectedEmail.to_address || "-"}</span>
                  </div>
                  {selectedEmail.cc && (
                    <div className="flex items-center gap-2">
                      <span className="font-medium w-16">CC:</span>
                      <span>{selectedEmail.cc}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <span className="font-medium w-16">Data:</span>
                    <span>
                      {format(
                        new Date(selectedEmail.sent_at || selectedEmail.received_at || selectedEmail.created_at),
                        "PPpp",
                        { locale: ptBR }
                      )}
                    </span>
                  </div>
                  {selectedEmail.labels && selectedEmail.labels.length > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="font-medium w-16">Labels:</span>
                      <div className="flex flex-wrap gap-1">
                        {selectedEmail.labels.map((label, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {label}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="border-t pt-4">
                  {selectedEmail.body_html ? (
                    <div 
                      className="prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: sanitizeEmailHtml(selectedEmail.body_html) }}
                    />
                  ) : selectedEmail.body_text ? (
                    <pre className="whitespace-pre-wrap text-sm font-sans">
                      {selectedEmail.body_text}
                    </pre>
                  ) : (
                    <p className="text-muted-foreground">
                      {selectedEmail.snippet || "Sem conteúdo"}
                    </p>
                  )}
                </div>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
