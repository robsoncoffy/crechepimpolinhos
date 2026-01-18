import { Link } from "react-router-dom";
import { ShieldX, Home, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AccessDenied() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/30 p-4">
      <div className="text-center max-w-md">
        {/* Icon */}
        <div className="mx-auto w-24 h-24 bg-destructive/10 rounded-full flex items-center justify-center mb-6">
          <ShieldX className="w-12 h-12 text-destructive" />
        </div>

        {/* Title */}
        <h1 className="font-fredoka text-4xl font-bold text-foreground mb-2">
          Acesso Negado
        </h1>
        
        {/* Code */}
        <p className="text-6xl font-bold text-muted-foreground/30 mb-4">403</p>

        {/* Description */}
        <p className="text-muted-foreground mb-8">
          Você não tem permissão para acessar esta página. 
          Entre em contato com o administrador caso precise de acesso.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild variant="outline">
            <Link to="/painel">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar ao Painel
            </Link>
          </Button>
          <Button asChild>
            <Link to="/">
              <Home className="w-4 h-4 mr-2" />
              Página Inicial
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
