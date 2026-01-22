import { useState, useEffect } from "react";
import DOMPurify from "dompurify";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useGmail } from "@/hooks/useGmail";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { 
  Mail, 
  Send, 
  Inbox, 
  RefreshCw, 
  ExternalLink, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  Star,
  Paperclip,
  Reply,
  Search,
  Plus
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

// Configure DOMPurify to allow safe email HTML tags only
const sanitizeEmailHtml = (html: string) => {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'b', 'i', 'u', 'a', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'div', 'span', 'table', 'tr', 'td', 'th', 'tbody', 'thead', 'img'],
    ALLOWED_ATTR: ['href', 'title', 'target', 'rel', 'src', 'alt', 'width', 'height', 'style', 'class'],
    ALLOW_DATA_ATTR: false,
  });
};

export default function AdminEmails() {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const {
    emails,
    isLoading,
    error,
    isAuthorized,
    accountEmail,
    fetchEmails,
    sendEmail,
    checkStatus,
    getAuthUrl,
  } = useGmail();

  const [selectedEmail, setSelectedEmail] = useState<any>(null);
  const [isComposing, setIsComposing] = useState(false);
  const [composeData, setComposeData] = useState({
    to: "",
    cc: "",
    subject: "",
    body: "",
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [authUrlToShow, setAuthUrlToShow] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthorized) {
      fetchEmails({ maxResults: 30 });
    }
  }, [isAuthorized, fetchEmails]);

  // Periodically check if authorization was completed
  useEffect(() => {
    if (authUrlToShow && !isAuthorized) {
      const interval = setInterval(async () => {
        await checkStatus();
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [authUrlToShow, isAuthorized, checkStatus]);

  const handleAuthorize = async () => {
    setIsAuthorizing(true);
    const authUrl = await getAuthUrl();
    if (authUrl) {
      // Show the URL for the user to open manually (iframe blocks popups)
      setAuthUrlToShow(authUrl);
    }
    setIsAuthorizing(false);
  };

  const handleSend = async () => {
    if (!composeData.to || !composeData.subject || !composeData.body) {
      return;
    }

    setIsSending(true);
    const success = await sendEmail({
      to: composeData.to,
      cc: composeData.cc || undefined,
      subject: composeData.subject,
      bodyHtml: `<div style="font-family: sans-serif; line-height: 1.6;">${composeData.body.replace(/\n/g, "<br>")}</div>`,
      bodyText: composeData.body,
    });

    if (success) {
      setComposeData({ to: "", cc: "", subject: "", body: "" });
      setIsComposing(false);
      fetchEmails({ maxResults: 30 });
    }
    setIsSending(false);
  };

  const handleReply = async () => {
    if (!selectedEmail || !composeData.body) return;

    setIsSending(true);
    
    // Extract email from "Name <email@example.com>" format
    const fromMatch = selectedEmail.from.match(/<(.+)>/) || [null, selectedEmail.from];
    const replyTo = fromMatch[1] || selectedEmail.from;

    const success = await sendEmail({
      to: replyTo,
      subject: selectedEmail.subject.startsWith("Re:") 
        ? selectedEmail.subject 
        : `Re: ${selectedEmail.subject}`,
      bodyHtml: `
        <div style="font-family: sans-serif; line-height: 1.6;">
          ${composeData.body.replace(/\n/g, "<br>")}
        </div>
        <br>
        <div style="border-left: 2px solid #ccc; padding-left: 12px; margin-top: 16px; color: #666;">
          <p>Em ${selectedEmail.date}, ${selectedEmail.from} escreveu:</p>
          ${selectedEmail.bodyHtml || `<p>${selectedEmail.bodyText || selectedEmail.snippet}</p>`}
        </div>
      `,
      bodyText: composeData.body,
      threadId: selectedEmail.threadId,
    });

    if (success) {
      setComposeData({ to: "", cc: "", subject: "", body: "" });
      setSelectedEmail(null);
      fetchEmails({ maxResults: 30 });
    }
    setIsSending(false);
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const isToday = date.toDateString() === now.toDateString();
      
      if (isToday) {
        return format(date, "HH:mm", { locale: ptBR });
      }
      return format(date, "dd/MM/yyyy", { locale: ptBR });
    } catch {
      return dateStr;
    }
  };

  const extractName = (email: string) => {
    const match = email.match(/^(.+?)\s*</);
    if (match) return match[1].replace(/"/g, "");
    return email.split("@")[0];
  };

  if (!isAuthorized) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">📧 Central de E-mails</h1>
            <p className="text-muted-foreground mt-1">
              Gerencie e-mails da creche em um só lugar
            </p>
          </div>

          <Card className="max-w-2xl mx-auto mt-12">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <Mail className="w-8 h-8 text-primary" />
              </div>
              <CardTitle>Conectar ao Gmail</CardTitle>
              <CardDescription>
                Para usar a Central de E-mails, você precisa autorizar o acesso à conta de e-mail da creche.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                <h4 className="font-medium text-amber-800 dark:text-amber-200 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  Importante
                </h4>
                <ul className="text-sm text-amber-700 dark:text-amber-300 mt-2 space-y-1 list-disc list-inside">
                  <li>Use a conta oficial da creche (ex: contato@crechepimpolinhos.com.br)</li>
                  <li>A autorização permite ler e enviar e-mails através desta conta</li>
                  <li>Você pode revogar o acesso a qualquer momento nas configurações do Google</li>
                </ul>
              </div>

              {authUrlToShow ? (
                <div className="space-y-4">
                  <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-4">
                    <h4 className="font-medium text-green-800 dark:text-green-200 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" />
                      Link de autorização gerado!
                    </h4>
                    <p className="text-sm text-green-700 dark:text-green-300 mt-2">
                      Copie o link abaixo e abra em uma nova aba do navegador (fora do preview):
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Input 
                      value={authUrlToShow} 
                      readOnly 
                      className="text-xs"
                    />
                    <Button 
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard.writeText(authUrlToShow);
                        toast({
                          title: "Link copiado!",
                          description: "Cole em uma nova aba do navegador para autorizar.",
                        });
                      }}
                    >
                      Copiar
                    </Button>
                  </div>
                  <a 
                    href={authUrlToShow} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <Button className="w-full" size="lg">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Abrir Autorização do Google
                    </Button>
                  </a>
                  <p className="text-xs text-center text-muted-foreground">
                    Após autorizar no Google, volte aqui. A página atualizará automaticamente.
                  </p>
                </div>
              ) : (
                <>
                  <Button 
                    onClick={handleAuthorize} 
                    className="w-full" 
                    size="lg"
                    disabled={isAuthorizing}
                  >
                    {isAuthorizing ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <ExternalLink className="w-4 h-4 mr-2" />
                    )}
                    Autorizar Acesso ao Gmail
                  </Button>

                  <p className="text-xs text-center text-muted-foreground">
                    Clique para gerar o link de autorização do Google.
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">📧 Central de E-mails</h1>
            <div className="flex items-center gap-2 mt-1">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              <span className="text-sm text-muted-foreground">
                Conectado como <strong>{accountEmail}</strong>
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => fetchEmails({ maxResults: 30 })}
              disabled={isLoading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
              Atualizar
            </Button>
            <Dialog open={isComposing} onOpenChange={setIsComposing}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Novo E-mail
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle>Novo E-mail</DialogTitle>
                  <DialogDescription>
                    Envie um e-mail a partir de {accountEmail}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="to">Para</Label>
                    <Input
                      id="to"
                      placeholder="email@exemplo.com"
                      value={composeData.to}
                      onChange={(e) => setComposeData({ ...composeData, to: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cc">Cc (opcional)</Label>
                    <Input
                      id="cc"
                      placeholder="email@exemplo.com"
                      value={composeData.cc}
                      onChange={(e) => setComposeData({ ...composeData, cc: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="subject">Assunto</Label>
                    <Input
                      id="subject"
                      placeholder="Assunto do e-mail"
                      value={composeData.subject}
                      onChange={(e) => setComposeData({ ...composeData, subject: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="body">Mensagem</Label>
                    <Textarea
                      id="body"
                      placeholder="Digite sua mensagem..."
                      className="min-h-[200px]"
                      value={composeData.body}
                      onChange={(e) => setComposeData({ ...composeData, body: e.target.value })}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsComposing(false)}>
                      Cancelar
                    </Button>
                    <Button 
                      onClick={handleSend} 
                      disabled={isSending || !composeData.to || !composeData.subject || !composeData.body}
                    >
                      {isSending ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4 mr-2" />
                      )}
                      Enviar
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Email list */}
          <Card className="lg:col-span-1">
            <CardHeader className="pb-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar e-mails..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[600px]">
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                ) : emails.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Inbox className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhum e-mail encontrado</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {emails
                      .filter(email => 
                        !searchQuery || 
                        email.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        email.from?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        email.snippet?.toLowerCase().includes(searchQuery.toLowerCase())
                      )
                      .map((email) => (
                        <button
                          key={email.id}
                          className={`w-full text-left p-4 hover:bg-muted/50 transition-colors ${
                            selectedEmail?.id === email.id ? "bg-muted" : ""
                          } ${!email.isRead ? "bg-primary/5" : ""}`}
                          onClick={() => setSelectedEmail(email)}
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                {!email.isRead && (
                                  <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0" />
                                )}
                                <span className={`text-sm truncate ${!email.isRead ? "font-semibold" : ""}`}>
                                  {extractName(email.from)}
                                </span>
                                <span className="text-xs text-muted-foreground ml-auto flex-shrink-0">
                                  {formatDate(email.date)}
                                </span>
                              </div>
                              <p className={`text-sm truncate mt-1 ${!email.isRead ? "font-medium" : "text-muted-foreground"}`}>
                                {email.subject || "(sem assunto)"}
                              </p>
                              <p className="text-xs text-muted-foreground truncate mt-1">
                                {email.snippet}
                              </p>
                            </div>
                            {email.isStarred && (
                              <Star className="w-4 h-4 text-yellow-500 fill-yellow-500 flex-shrink-0" />
                            )}
                          </div>
                        </button>
                      ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Email viewer */}
          <Card className="lg:col-span-2">
            {selectedEmail ? (
              <>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg">{selectedEmail.subject || "(sem assunto)"}</CardTitle>
                      <div className="text-sm text-muted-foreground">
                        <p>De: <span className="text-foreground">{selectedEmail.from}</span></p>
                        <p>Para: <span className="text-foreground">{selectedEmail.to}</span></p>
                        {selectedEmail.cc && (
                          <p>Cc: <span className="text-foreground">{selectedEmail.cc}</span></p>
                        )}
                        <p className="mt-1">{selectedEmail.date}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {selectedEmail.isStarred && (
                        <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                      )}
                    </div>
                  </div>
                </CardHeader>
                <Separator />
                <CardContent className="p-6">
                  <ScrollArea className="h-[300px]">
                    {selectedEmail.bodyHtml ? (
                      <div 
                        className="prose prose-sm dark:prose-invert max-w-none"
                        dangerouslySetInnerHTML={{ __html: sanitizeEmailHtml(selectedEmail.bodyHtml) }}
                      />
                    ) : (
                      <pre className="whitespace-pre-wrap text-sm font-sans">
                        {selectedEmail.bodyText || selectedEmail.snippet}
                      </pre>
                    )}
                  </ScrollArea>
                </CardContent>
                <Separator />
                <div className="p-4 space-y-4">
                  <div className="flex items-center gap-2">
                    <Reply className="w-4 h-4" />
                    <span className="font-medium">Responder</span>
                  </div>
                  <Textarea
                    placeholder="Digite sua resposta..."
                    className="min-h-[100px]"
                    value={composeData.body}
                    onChange={(e) => setComposeData({ ...composeData, body: e.target.value })}
                  />
                  <div className="flex justify-end gap-2">
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setSelectedEmail(null);
                        setComposeData({ to: "", cc: "", subject: "", body: "" });
                      }}
                    >
                      Cancelar
                    </Button>
                    <Button 
                      onClick={handleReply}
                      disabled={isSending || !composeData.body}
                    >
                      {isSending ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4 mr-2" />
                      )}
                      Enviar Resposta
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-[600px] text-muted-foreground">
                <Mail className="w-16 h-16 mb-4 opacity-50" />
                <p className="text-lg">Selecione um e-mail para visualizar</p>
                <p className="text-sm">Ou clique em "Novo E-mail" para enviar uma mensagem</p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
