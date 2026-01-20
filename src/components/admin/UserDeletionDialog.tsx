import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { 
  AlertTriangle, 
  Trash2, 
  Loader2, 
  Mail,
  CheckCircle2,
  XCircle
} from "lucide-react";

interface DeleteResult {
  source: string;
  deleted: boolean;
  count?: number;
  error?: string;
}

type DeletionStep = 
  | "loading" 
  | "confirm" 
  | "deleting" 
  | "success" 
  | "error";

interface UserDeletionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string;
  onDeleteComplete?: () => void;
}

export function UserDeletionDialog({
  open,
  onOpenChange,
  userId,
  userName,
  onDeleteComplete,
}: UserDeletionDialogProps) {
  const [step, setStep] = useState<DeletionStep>("loading");
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [confirmEmail, setConfirmEmail] = useState("");
  const [deleteResults, setDeleteResults] = useState<DeleteResult[] | null>(null);

  // Fetch email when dialog opens
  useEffect(() => {
    if (!open || !userId) return;

    setStep("loading");
    setUserEmail(null);
    setConfirmEmail("");
    setDeleteResults(null);

    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("delete-user", {
          body: { userId, checkOnly: true },
        });
        if (error) throw error;
        setUserEmail(data?.email || null);
        setStep("confirm");
      } catch (err) {
        console.error("Error fetching user email:", err);
        setUserEmail(null);
        setStep("confirm");
      }
    })();
  }, [open, userId]);

  const handleDelete = async () => {
    if (!userEmail || confirmEmail.toLowerCase() !== userEmail.toLowerCase()) {
      toast.error("O e-mail digitado não confere");
      return;
    }

    setStep("deleting");

    try {
      const { data, error } = await supabase.functions.invoke("delete-user", {
        body: { userId },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setDeleteResults(data.deleteResults || []);
      setStep("success");
      toast.success(`Usuário ${userName} removido do sistema`);
      onDeleteComplete?.();
    } catch (error) {
      console.error("Error deleting user:", error);
      setStep("error");
      toast.error("Erro ao deletar usuário: " + (error as Error).message);
    }
  };

  const handleClose = () => {
    setStep("loading");
    setUserEmail(null);
    setConfirmEmail("");
    setDeleteResults(null);
    onOpenChange(false);
  };

  const isConfirmValid = userEmail && confirmEmail.toLowerCase() === userEmail.toLowerCase();

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-5 h-5" />
            Confirmar Exclusão
          </DialogTitle>
          <DialogDescription>
            Exclusão permanente do usuário <strong>{userName}</strong>
          </DialogDescription>
        </DialogHeader>

        {step === "loading" && (
          <div className="flex flex-col items-center gap-3 py-6">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Carregando informações...</p>
          </div>
        )}

        {step === "confirm" && (
          <div className="space-y-4">
            {/* Email Display */}
            {userEmail ? (
              <div className="p-3 bg-muted rounded-lg border">
                <Label className="text-xs text-muted-foreground">E-mail da conta:</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Mail className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <code className="text-sm font-mono font-semibold break-all">{userEmail}</code>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  ⚠️ Não foi possível recuperar o e-mail da conta
                </p>
              </div>
            )}

            {/* Warning */}
            <div className="p-4 bg-destructive/10 rounded-lg border border-destructive/20">
              <p className="text-sm text-destructive font-medium mb-2">Esta ação irá:</p>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>Remover o acesso ao sistema</li>
                <li>Apagar todos os dados relacionados</li>
                <li>Apagar convites e formulários com este e-mail</li>
                <li>Liberar o e-mail para novo cadastro</li>
              </ul>
              <p className="text-sm text-destructive font-semibold mt-3">
                Esta ação não pode ser desfeita!
              </p>
            </div>

            {/* Confirmation Input */}
            {userEmail && (
              <div className="space-y-2">
                <Label htmlFor="confirm-email" className="text-sm font-medium">
                  Para confirmar, digite o e-mail acima:
                </Label>
                <Input
                  id="confirm-email"
                  type="email"
                  placeholder="Digite o e-mail para confirmar..."
                  value={confirmEmail}
                  onChange={(e) => setConfirmEmail(e.target.value)}
                  className="font-mono"
                />
                {confirmEmail && !isConfirmValid && (
                  <p className="text-xs text-destructive">O e-mail não confere</p>
                )}
              </div>
            )}
          </div>
        )}

        {step === "deleting" && (
          <div className="flex flex-col items-center gap-4 py-6">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
            <div className="text-center">
              <p className="font-medium">Removendo usuário...</p>
              <p className="text-sm text-muted-foreground mt-1">
                Aguarde enquanto limpamos todos os registros
              </p>
            </div>
          </div>
        )}

        {step === "success" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <span className="text-sm font-medium text-green-800 dark:text-green-200">
                Usuário removido com sucesso!
              </span>
            </div>

            {deleteResults && deleteResults.filter(r => r.count && r.count > 0).length > 0 && (
              <ScrollArea className="max-h-[150px]">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Registros removidos:</Label>
                  {deleteResults.filter(r => r.count && r.count > 0).map((r, i) => (
                    <div key={i} className="flex items-center justify-between p-2 bg-muted/50 rounded text-sm">
                      <span>{r.source}</span>
                      <Badge variant={r.deleted ? "default" : "destructive"} className="text-xs">
                        {r.deleted ? `${r.count} removido(s)` : "Erro"}
                      </Badge>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        )}

        {step === "error" && (
          <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-200 dark:border-red-800">
            <XCircle className="w-5 h-5 text-red-600" />
            <span className="text-sm font-medium text-red-800 dark:text-red-200">
              Erro ao excluir usuário. Tente novamente.
            </span>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          {(step === "confirm" || step === "error") && (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={!isConfirmValid}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Excluir Permanentemente
              </Button>
            </>
          )}
          {step === "success" && (
            <Button onClick={handleClose}>
              Fechar
            </Button>
          )}
          {step === "loading" && (
            <Button variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
