import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  Search, 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Trash2, 
  Database,
  Shield,
  Mail
} from "lucide-react";

interface DiagnosticResult {
  source: string;
  found: boolean;
  count?: number;
  details?: string;
}

interface EmailDiagnosticModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialEmail?: string;
  onCleanupComplete?: () => void;
}

type CleanupStep = 
  | "idle" 
  | "confirming" 
  | "deleting" 
  | "success" 
  | "error";

export function EmailDiagnosticModal({ 
  open, 
  onOpenChange, 
  initialEmail = "", 
  onCleanupComplete 
}: EmailDiagnosticModalProps) {
  const [email, setEmail] = useState(initialEmail);
  const [loading, setLoading] = useState(false);
  const [diagnostics, setDiagnostics] = useState<DiagnosticResult[] | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [foundEmail, setFoundEmail] = useState<string | null>(null);
  
  // Cleanup state
  const [cleanupStep, setCleanupStep] = useState<CleanupStep>("idle");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [cleanupResults, setCleanupResults] = useState<any[] | null>(null);

  const handleSearch = async () => {
    if (!email.trim()) {
      toast.error("Digite um e-mail para pesquisar");
      return;
    }

    setLoading(true);
    setDiagnostics(null);
    setUserId(null);
    setFoundEmail(null);
    setCleanupStep("idle");
    setConfirmEmail("");
    setCleanupResults(null);

    try {
      const { data, error } = await supabase.functions.invoke("delete-user", {
        body: { email: email.trim().toLowerCase(), diagnoseOnly: true },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setDiagnostics(data.diagnostics || []);
      setUserId(data.userId || null);
      setFoundEmail(data.email || email.trim().toLowerCase());
    } catch (error) {
      console.error("Error diagnosing email:", error);
      toast.error("Erro ao diagnosticar e-mail: " + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleStartCleanup = () => {
    setCleanupStep("confirming");
    setConfirmEmail("");
  };

  const handleConfirmCleanup = async () => {
    if (confirmEmail.toLowerCase() !== (foundEmail || email).toLowerCase()) {
      toast.error("O e-mail digitado não confere");
      return;
    }

    setCleanupStep("deleting");

    try {
      const { data, error } = await supabase.functions.invoke("delete-user", {
        body: { email: (foundEmail || email).toLowerCase() },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setCleanupResults(data.deleteResults || []);
      setCleanupStep("success");
      toast.success("E-mail liberado com sucesso!");
      onCleanupComplete?.();
    } catch (error) {
      console.error("Error cleaning up email:", error);
      setCleanupStep("error");
      toast.error("Erro ao liberar e-mail: " + (error as Error).message);
    }
  };

  const handleClose = () => {
    setEmail("");
    setDiagnostics(null);
    setUserId(null);
    setFoundEmail(null);
    setCleanupStep("idle");
    setConfirmEmail("");
    setCleanupResults(null);
    onOpenChange(false);
  };

  const totalFound = diagnostics?.filter(d => d.found).length || 0;
  const hasAnyData = totalFound > 0;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="w-5 h-5 text-primary" />
            Diagnóstico de E-mail
          </DialogTitle>
          <DialogDescription>
            Verifique onde um e-mail está registrado no sistema e faça a limpeza segura.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search Input */}
          <div className="flex gap-2">
            <div className="flex-1">
              <Label htmlFor="diagnostic-email" className="sr-only">E-mail</Label>
              <Input
                id="diagnostic-email"
                type="email"
                placeholder="Digite o e-mail para diagnosticar..."
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading || cleanupStep === "deleting"}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
            </div>
            <Button 
              onClick={handleSearch} 
              disabled={loading || !email.trim() || cleanupStep === "deleting"}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
            </Button>
          </div>

          {/* Diagnostic Results */}
          {diagnostics && (
            <ScrollArea className="max-h-[300px]">
              <div className="space-y-2">
                {/* Summary */}
                <div className={`p-3 rounded-lg border ${
                  hasAnyData 
                    ? "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800" 
                    : "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800"
                }`}>
                  <div className="flex items-center gap-2">
                    {hasAnyData ? (
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                    )}
                    <span className={`text-sm font-medium ${
                      hasAnyData ? "text-amber-800 dark:text-amber-200" : "text-green-800 dark:text-green-200"
                    }`}>
                      {hasAnyData 
                        ? `Encontrado em ${totalFound} fonte(s)` 
                        : "E-mail livre - nenhum registro encontrado"
                      }
                    </span>
                  </div>
                  {userId && (
                    <p className="text-xs text-muted-foreground mt-1">
                      ID na autenticação: {userId}
                    </p>
                  )}
                </div>

                {/* Detailed Results */}
                <div className="space-y-1">
                  {diagnostics.map((d, i) => (
                    <div 
                      key={i} 
                      className={`flex items-center justify-between p-2 rounded-lg border ${
                        d.found 
                          ? "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800" 
                          : "bg-muted/50 border-transparent"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {d.found ? (
                          <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                        )}
                        <span className="text-sm">{d.source}</span>
                      </div>
                      {d.found && d.count !== undefined && d.count > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {d.count} registro(s)
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </ScrollArea>
          )}

          {/* Cleanup Flow */}
          {diagnostics && hasAnyData && cleanupStep === "idle" && (
            <Button 
              variant="destructive" 
              className="w-full"
              onClick={handleStartCleanup}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Limpar Todos os Registros
            </Button>
          )}

          {cleanupStep === "confirming" && (
            <div className="space-y-3 p-4 bg-destructive/10 rounded-lg border border-destructive/20">
              <div className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="w-5 h-5" />
                <span className="font-semibold">Confirmação de Segurança</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Para confirmar a exclusão, digite o e-mail abaixo:
              </p>
              <div className="flex items-center gap-2 p-2 bg-muted rounded border">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <code className="text-sm font-mono">{foundEmail || email}</code>
              </div>
              <Input
                type="email"
                placeholder="Digite o e-mail para confirmar..."
                value={confirmEmail}
                onChange={(e) => setConfirmEmail(e.target.value)}
                className="font-mono"
              />
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => setCleanupStep("idle")}
                >
                  Cancelar
                </Button>
                <Button 
                  variant="destructive" 
                  className="flex-1"
                  onClick={handleConfirmCleanup}
                  disabled={confirmEmail.toLowerCase() !== (foundEmail || email).toLowerCase()}
                >
                  Confirmar Exclusão
                </Button>
              </div>
            </div>
          )}

          {cleanupStep === "deleting" && (
            <div className="flex flex-col items-center gap-3 p-6">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Removendo registros...</p>
            </div>
          )}

          {cleanupStep === "success" && cleanupResults && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <span className="text-sm font-medium text-green-800 dark:text-green-200">
                  E-mail liberado com sucesso!
                </span>
              </div>
              <ScrollArea className="max-h-[150px]">
                <div className="space-y-1 text-sm">
                  {cleanupResults.filter(r => r.count > 0 || r.deleted).map((r, i) => (
                    <div key={i} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                      <span>{r.source}</span>
                      <Badge variant={r.deleted ? "default" : "destructive"} className="text-xs">
                        {r.deleted ? `${r.count || 0} removido(s)` : "Erro"}
                      </Badge>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {cleanupStep === "error" && (
            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-200 dark:border-red-800">
              <XCircle className="w-5 h-5 text-red-600" />
              <span className="text-sm font-medium text-red-800 dark:text-red-200">
                Erro ao limpar registros. Tente novamente.
              </span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
