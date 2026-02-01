import { Clock, CheckCircle2, Mail } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export default function PendingApproval() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardContent className="pt-8 pb-6 text-center space-y-6">
          <div className="mx-auto w-20 h-20 bg-secondary rounded-full flex items-center justify-center">
            <Clock className="w-10 h-10 text-secondary-foreground" />
          </div>
          
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground">
              Cadastro Enviado!
            </h1>
            <p className="text-muted-foreground">
              Seu cadastro foi recebido e está aguardando aprovação da direção.
            </p>
          </div>

          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <h3 className="font-medium text-sm text-foreground">Próximos passos:</h3>
            <ul className="text-sm text-muted-foreground space-y-2 text-left">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <span>Seu cadastro será revisado pela equipe administrativa</span>
              </li>
              <li className="flex items-start gap-2">
                <Mail className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <span>Você receberá um e-mail quando seu acesso for liberado</span>
              </li>
            </ul>
          </div>

          <p className="text-xs text-muted-foreground">
            Isso geralmente leva até 24 horas úteis.
          </p>

          <Button 
            variant="outline" 
            onClick={() => navigate("/")}
            className="w-full"
          >
            Voltar ao Início
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
