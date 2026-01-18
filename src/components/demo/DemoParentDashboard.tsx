import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Calendar,
  TrendingUp,
  Home,
  UserPlus,
  UtensilsCrossed,
  Camera,
  CalendarDays,
  CreditCard,
  User,
  MessageSquare,
  Bell,
  Sun,
  Moon,
  Utensils,
  Baby,
  Sparkles,
  Smile,
  FileText,
  Droplets,
} from "lucide-react";
import logo from "@/assets/logo-pimpolinhos.png";
import { DemoWeatherWidget } from "./DemoWeatherWidget";
import { DemoPickupNotification } from "./DemoPickupNotification";

// Mock data for demo
const mockChild = {
  id: "demo-child-1",
  full_name: "Maria Silva",
  class_type: "maternal",
  photo_url: null,
  birth_date: "2022-03-15",
  shift_type: "integral",
  allergies: "Amendoim",
};

const classTypeLabels: Record<string, string> = {
  bercario: "Berçário",
  maternal: "Maternal",
  jardim: "Jardim",
};

const shiftLabels: Record<string, string> = {
  manha: "Manhã",
  tarde: "Tarde",
  integral: "Integral",
};

export function DemoParentDashboard() {
  const [activeTab, setActiveTab] = useState("agenda");

  const calculateAge = (birthDate: string) => {
    const birth = new Date(birthDate);
    const today = new Date();
    const years = today.getFullYear() - birth.getFullYear();
    const months = today.getMonth() - birth.getMonth();
    if (years === 0) return `${months} meses`;
    if (years === 1) return months >= 0 ? `1 ano` : `${12 + months} meses`;
    return `${years} anos`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-pimpo-blue-light/30 to-background relative">
      {/* Header */}
      <header className="bg-card/80 backdrop-blur-sm shadow-sm sticky top-0 z-40 border-b">
        <div className="container py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img src={logo} alt="Creche Pimpolinhos" className="h-10" />
            <span className="font-fredoka text-lg font-bold hidden sm:inline">Pimpolinhos</span>
          </Link>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                  J
                </AvatarFallback>
              </Avatar>
              <span>João Silva (Demo)</span>
            </div>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center">
                2
              </span>
            </Button>
            <Button variant="ghost" size="sm" asChild className="hidden sm:flex">
              <Link to="/">
                <Home className="w-4 h-4 mr-2" />
                Site
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container py-6 max-w-5xl">
        <div className="mb-6">
          <h1 className="font-fredoka text-2xl sm:text-3xl font-bold">
            Olá, João! 👋
          </h1>
          <p className="text-muted-foreground">
            Acompanhe a rotina e desenvolvimento do seu filho
          </p>
        </div>

        <div className="space-y-6">
          {/* Quick Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card className="bg-gradient-to-br from-pimpo-blue/10 to-pimpo-blue/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="bg-pimpo-blue text-white font-fredoka text-lg">
                      {mockChild.full_name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold">{mockChild.full_name.split(" ")[0]}</p>
                    <p className="text-xs text-muted-foreground">{calculateAge(mockChild.birth_date)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Baby className="w-5 h-5 mx-auto text-pimpo-green mb-1" />
                <p className="text-xs text-muted-foreground">Turma</p>
                <p className="font-semibold">{classTypeLabels[mockChild.class_type]}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Sun className="w-5 h-5 mx-auto text-pimpo-yellow mb-1" />
                <p className="text-xs text-muted-foreground">Turno</p>
                <p className="font-semibold">{shiftLabels[mockChild.shift_type || "integral"]}</p>
              </CardContent>
            </Card>
            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-4 text-center relative">
                <MessageSquare className="w-5 h-5 mx-auto text-primary mb-1" />
                <p className="text-xs text-muted-foreground">Chat</p>
                <p className="font-semibold">Mensagens</p>
                <Badge variant="destructive" className="absolute -top-2 -right-2">
                  3
                </Badge>
              </CardContent>
            </Card>
          </div>

          {/* Pickup Button - Prominent */}
          <DemoPickupNotification childName={mockChild.full_name} />

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column */}
            <div className="lg:col-span-1 space-y-4">
              {/* Weather Widget */}
              <DemoWeatherWidget pickupTime="17:00" />

              {/* Announcements */}
              <Card className="border-l-4 border-l-pimpo-yellow">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-pimpo-yellow" />
                    Avisos Recentes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="p-2 bg-muted/50 rounded text-sm">
                      <p className="font-medium">Reunião de Pais</p>
                      <p className="text-xs text-muted-foreground">Sexta-feira às 18h</p>
                    </div>
                    <div className="p-2 bg-muted/50 rounded text-sm">
                      <p className="font-medium">Festa Junina</p>
                      <p className="text-xs text-muted-foreground">24 de Junho</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Today at School */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-primary" />
                    Hoje na Escola
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm flex items-center gap-2">
                        <Utensils className="w-4 h-4 text-pimpo-green" />
                        Café da manhã
                      </span>
                      <Badge variant="secondary">Comeu tudo ✓</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm flex items-center gap-2">
                        <Utensils className="w-4 h-4 text-pimpo-red" />
                        Almoço
                      </span>
                      <Badge variant="secondary">Quase tudo</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm flex items-center gap-2">
                        <Moon className="w-4 h-4 text-pimpo-blue" />
                        Sono (manhã)
                      </span>
                      <Badge variant="secondary">1h30</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm flex items-center gap-2">
                        <Droplets className="w-4 h-4 text-pimpo-blue" />
                        Higiene
                      </span>
                      <Badge variant="secondary">Normal</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm flex items-center gap-2">
                        <Smile className="w-4 h-4 text-pimpo-yellow" />
                        Humor
                      </span>
                      <Badge variant="secondary">😊 Feliz</Badge>
                    </div>
                  </div>
                  {/* School Note */}
                  <div className="mt-4 pt-3 border-t">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="w-4 h-4 text-pimpo-green" />
                      <span className="text-sm font-medium">Bilhetinho da Escola</span>
                    </div>
                    <p className="text-sm text-muted-foreground bg-pimpo-green/5 p-3 rounded-lg border border-pimpo-green/20">
                      "Hoje a Maria participou das atividades de pintura com muita animação! Brincou bastante no parquinho. 🎨"
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Tabs - Right Column */}
            <div className="lg:col-span-2">
              <Card className="shadow-lg overflow-hidden">
                <CardContent className="p-0">
                  <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <div className="border-b bg-muted/30">
                      <TabsList className="w-full h-auto p-0 bg-transparent rounded-none grid grid-cols-5">
                        <TabsTrigger value="agenda" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3">
                          <Calendar className="w-4 h-4" />
                        </TabsTrigger>
                        <TabsTrigger value="galeria" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3">
                          <Camera className="w-4 h-4" />
                        </TabsTrigger>
                        <TabsTrigger value="cardapio" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3">
                          <UtensilsCrossed className="w-4 h-4" />
                        </TabsTrigger>
                        <TabsTrigger value="crescimento" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3">
                          <TrendingUp className="w-4 h-4" />
                        </TabsTrigger>
                        <TabsTrigger value="perfil" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3">
                          <User className="w-4 h-4" />
                        </TabsTrigger>
                      </TabsList>
                    </div>

                    <div className="p-4">
                      <TabsContent value="agenda" className="mt-0">
                        <h3 className="font-semibold mb-4">Agenda da Semana</h3>
                        <div className="space-y-3">
                          {["Segunda", "Terça", "Quarta", "Quinta", "Sexta"].map((day, i) => (
                            <div key={day} className={`p-3 rounded-lg border ${i === new Date().getDay() - 1 ? "bg-primary/5 border-primary" : ""}`}>
                              <p className="font-medium">{day}</p>
                              <p className="text-sm text-muted-foreground">
                                {i === new Date().getDay() - 1 ? "Atividades de artes e brincadeiras" : "Ver registro completo"}
                              </p>
                            </div>
                          ))}
                        </div>
                      </TabsContent>

                      <TabsContent value="galeria" className="mt-0">
                        <h3 className="font-semibold mb-4">Galeria de Fotos</h3>
                        <div className="grid grid-cols-3 gap-2">
                          {[1, 2, 3, 4, 5, 6].map((i) => (
                            <div key={i} className="aspect-square bg-muted rounded-lg flex items-center justify-center">
                              <Camera className="w-8 h-8 text-muted-foreground/50" />
                            </div>
                          ))}
                        </div>
                        <p className="text-sm text-muted-foreground mt-4 text-center">
                          Fotos de atividades serão exibidas aqui
                        </p>
                      </TabsContent>

                      <TabsContent value="cardapio" className="mt-0">
                        <h3 className="font-semibold mb-4">Cardápio Semanal</h3>
                        <div className="space-y-3">
                          <div className="p-3 bg-muted/50 rounded-lg">
                            <p className="font-medium">☕ Café da Manhã</p>
                            <p className="text-sm text-muted-foreground">Pão, leite, frutas</p>
                          </div>
                          <div className="p-3 bg-muted/50 rounded-lg">
                            <p className="font-medium">🍽️ Almoço</p>
                            <p className="text-sm text-muted-foreground">Arroz, feijão, carne, salada</p>
                          </div>
                          <div className="p-3 bg-muted/50 rounded-lg">
                            <p className="font-medium">🍪 Lanche</p>
                            <p className="text-sm text-muted-foreground">Biscoitos, suco natural</p>
                          </div>
                        </div>
                        {mockChild.allergies && (
                          <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                            <p className="text-sm text-destructive font-medium">
                              ⚠️ Alerta de alergia: {mockChild.allergies}
                            </p>
                          </div>
                        )}
                      </TabsContent>

                      <TabsContent value="crescimento" className="mt-0">
                        <h3 className="font-semibold mb-4">Acompanhamento de Crescimento</h3>
                        <div className="grid grid-cols-2 gap-4 mb-6">
                          <Card className="bg-pimpo-blue/10">
                            <CardContent className="p-4 text-center">
                              <p className="text-2xl font-fredoka font-bold text-pimpo-blue">12.5 kg</p>
                              <p className="text-xs text-muted-foreground">Peso atual</p>
                            </CardContent>
                          </Card>
                          <Card className="bg-pimpo-green/10">
                            <CardContent className="p-4 text-center">
                              <p className="text-2xl font-fredoka font-bold text-pimpo-green">92 cm</p>
                              <p className="text-xs text-muted-foreground">Altura atual</p>
                            </CardContent>
                          </Card>
                        </div>
                        <div className="h-40 bg-muted/50 rounded-lg flex items-center justify-center">
                          <TrendingUp className="w-12 h-12 text-muted-foreground/30" />
                        </div>
                        <p className="text-sm text-muted-foreground mt-2 text-center">
                          Gráfico de evolução
                        </p>
                      </TabsContent>

                      <TabsContent value="perfil" className="mt-0">
                        <h3 className="font-semibold mb-4">Perfil da Criança</h3>
                        <div className="space-y-4">
                          <div className="flex items-center gap-4">
                            <Avatar className="h-20 w-20">
                              <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-fredoka">
                                {mockChild.full_name.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <h4 className="font-fredoka text-xl font-bold">{mockChild.full_name}</h4>
                              <p className="text-muted-foreground">{classTypeLabels[mockChild.class_type]} • {shiftLabels[mockChild.shift_type || "integral"]}</p>
                            </div>
                          </div>
                          <div className="grid gap-3">
                            <div className="p-3 bg-muted/50 rounded-lg">
                              <p className="text-xs text-muted-foreground">Data de Nascimento</p>
                              <p className="font-medium">15 de Março de 2022</p>
                            </div>
                            <div className="p-3 bg-muted/50 rounded-lg">
                              <p className="text-xs text-muted-foreground">Alergias</p>
                              <p className="font-medium">{mockChild.allergies || "Nenhuma registrada"}</p>
                            </div>
                          </div>
                        </div>
                      </TabsContent>
                    </div>
                  </Tabs>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
