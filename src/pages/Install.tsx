import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Download, Smartphone, Apple, Chrome, ArrowLeft, Check, Share } from "lucide-react";
import logo from "@/assets/logo-pimpolinhos.png";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function Install() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    // Detect platform
    const ua = navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(ua));
    setIsAndroid(/android/.test(ua));

    // Listen for install prompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === "accepted") {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pimpo-blue-light via-background to-pimpo-yellow-light py-8 px-4">
      <div className="container max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-block mb-4">
            <img src={logo} alt="Creche Pimpolinhos" className="h-20 mx-auto" />
          </Link>
          <h1 className="font-fredoka text-2xl font-bold">Instalar Aplicativo</h1>
          <p className="text-muted-foreground">
            Tenha acesso rápido ao portal da escola
          </p>
        </div>

        {isInstalled ? (
          <Card className="shadow-lg border-pimpo-green/30 bg-gradient-to-br from-pimpo-green/10 to-transparent">
            <CardContent className="py-12 text-center">
              <div className="w-16 h-16 rounded-full bg-pimpo-green/20 flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-pimpo-green" />
              </div>
              <h2 className="text-xl font-bold mb-2">Aplicativo Instalado!</h2>
              <p className="text-muted-foreground mb-6">
                O aplicativo Pimpolinhos já está na sua tela inicial
              </p>
              <Button asChild>
                <Link to="/">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Voltar ao Início
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Direct Install Button */}
            {deferredPrompt && (
              <Card className="shadow-lg border-pimpo-blue/30 bg-gradient-to-br from-pimpo-blue/10 to-transparent">
                <CardContent className="py-8 text-center">
                  <Smartphone className="w-12 h-12 mx-auto mb-4 text-pimpo-blue" />
                  <h2 className="text-xl font-bold mb-2">Instalação Rápida</h2>
                  <p className="text-muted-foreground mb-6">
                    Clique no botão abaixo para instalar o aplicativo
                  </p>
                  <Button size="lg" onClick={handleInstall} className="gap-2">
                    <Download className="w-5 h-5" />
                    Instalar Agora
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* iOS Instructions */}
            {isIOS && (
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Apple className="w-5 h-5" />
                    Instalar no iPhone/iPad
                  </CardTitle>
                  <CardDescription>
                    Siga os passos abaixo para instalar
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-pimpo-blue text-white flex items-center justify-center flex-shrink-0 font-bold">
                      1
                    </div>
                    <div>
                      <p className="font-medium">Toque no botão Compartilhar</p>
                      <p className="text-sm text-muted-foreground">
                        <Share className="w-4 h-4 inline mr-1" />
                        Na barra inferior do Safari
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-pimpo-blue text-white flex items-center justify-center flex-shrink-0 font-bold">
                      2
                    </div>
                    <div>
                      <p className="font-medium">Selecione "Adicionar à Tela de Início"</p>
                      <p className="text-sm text-muted-foreground">
                        Role para baixo no menu se necessário
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-pimpo-blue text-white flex items-center justify-center flex-shrink-0 font-bold">
                      3
                    </div>
                    <div>
                      <p className="font-medium">Toque em "Adicionar"</p>
                      <p className="text-sm text-muted-foreground">
                        O ícone aparecerá na sua tela inicial
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Android Instructions */}
            {isAndroid && !deferredPrompt && (
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Smartphone className="w-5 h-5" />
                    Instalar no Android
                  </CardTitle>
                  <CardDescription>
                    Siga os passos abaixo para instalar
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-pimpo-blue text-white flex items-center justify-center flex-shrink-0 font-bold">
                      1
                    </div>
                    <div>
                      <p className="font-medium">Toque no menu do navegador</p>
                      <p className="text-sm text-muted-foreground">
                        Os três pontinhos no canto superior direito
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-pimpo-blue text-white flex items-center justify-center flex-shrink-0 font-bold">
                      2
                    </div>
                    <div>
                      <p className="font-medium">Selecione "Instalar aplicativo"</p>
                      <p className="text-sm text-muted-foreground">
                        Ou "Adicionar à tela inicial"
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-pimpo-blue text-white flex items-center justify-center flex-shrink-0 font-bold">
                      3
                    </div>
                    <div>
                      <p className="font-medium">Confirme a instalação</p>
                      <p className="text-sm text-muted-foreground">
                        O ícone aparecerá na sua tela inicial
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Desktop Instructions */}
            {!isIOS && !isAndroid && !deferredPrompt && (
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Chrome className="w-5 h-5" />
                    Instalar no Computador
                  </CardTitle>
                  <CardDescription>
                    Siga os passos abaixo para instalar
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-pimpo-blue text-white flex items-center justify-center flex-shrink-0 font-bold">
                      1
                    </div>
                    <div>
                      <p className="font-medium">Procure o ícone de instalação</p>
                      <p className="text-sm text-muted-foreground">
                        Na barra de endereço do Chrome/Edge
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-pimpo-blue text-white flex items-center justify-center flex-shrink-0 font-bold">
                      2
                    </div>
                    <div>
                      <p className="font-medium">Clique em "Instalar"</p>
                      <p className="text-sm text-muted-foreground">
                        Um atalho será criado no seu computador
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Benefits */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Benefícios do Aplicativo</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  <li className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-pimpo-green" />
                    <span>Acesso rápido pela tela inicial</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-pimpo-green" />
                    <span>Funciona offline</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-pimpo-green" />
                    <span>Carregamento mais rápido</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-pimpo-green" />
                    <span>Experiência em tela cheia</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Button variant="outline" asChild className="w-full">
              <Link to="/">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar ao Site
              </Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
