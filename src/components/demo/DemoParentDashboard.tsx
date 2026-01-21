import { useState } from "react";
import { Link } from "react-router-dom";
import { DemoMiniCalendar } from "./DemoMiniCalendar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
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
  GraduationCap,
  Send,
  Newspaper,
  Heart,
  MessageCircle,
  Check,
  CheckCheck,
  Brain,
  Palette,
  Target,
  ArrowRight,
  Star,
  Settings,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  Shield,
  Users,
} from "lucide-react";
import logo from "@/assets/logo-pimpolinhos.png";
import { DemoWeatherWidget } from "./DemoWeatherWidget";
import { DemoPickupNotification } from "./DemoPickupNotification";
import { EvaluationDetailDialog } from "@/components/parent/EvaluationDetailDialog";

// Message interface with read status
interface DemoParentMessage {
  id: string;
  content: string;
  isOwn: boolean;
  time: string;
  sender: string;
  isRead: boolean;
  channel: "school" | "nutritionist";
}

// Initial messages with read status
const initialMessages: DemoParentMessage[] = [
  { id: "m1", content: "Bom dia! Maria participou muito bem das atividades hoje!", sender: "Prof. Ana", isOwn: false, time: "10:30", isRead: false, channel: "school" },
  { id: "m2", content: "Ela está muito animada com as aulas de pintura 🎨", sender: "Prof. Ana", isOwn: false, time: "14:15", isRead: false, channel: "school" },
  { id: "m3", content: "Olá! Sobre a alergia da Maria, estamos adaptando o lanche de amanhã.", sender: "Nutricionista", isOwn: false, time: "15:00", isRead: false, channel: "nutritionist" },
];

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

// Mock evaluation data for demo
const mockEvaluations = [
  {
    id: "eval-1",
    quarter: 1,
    year: 2026,
    cognitive_development: "Maria demonstra excelente capacidade de concentração e resolução de problemas. Consegue seguir instruções complexas de 3 ou mais passos e mostra curiosidade natural para explorar novos conceitos. Tem facilidade em identificar cores, formas e números até 10.",
    motor_development: "Apresenta coordenação motora fina e grossa bem desenvolvidas para a idade. Manipula tesoura com segurança, consegue desenhar formas reconhecíveis e corre com equilíbrio. Está progredindo bem nas atividades de recorte e colagem.",
    social_emotional: "Interage positivamente com os colegas, demonstrando empatia e capacidade de compartilhar. Ainda está desenvolvendo habilidades de lidar com frustração, mas mostra progresso consistente. Participa ativamente das atividades em grupo.",
    language_development: "Vocabulário amplo e expressivo para a idade. Conta pequenas histórias com começo, meio e fim. Faz perguntas elaboradas e demonstra interesse por livros. Está começando a reconhecer algumas letras do alfabeto.",
    creativity_arts: "Muito criativa nas atividades artísticas! Usa cores vibrantes e gosta de experimentar diferentes materiais. Demonstra originalidade nos desenhos e pinturas, criando narrativas visuais interessantes.",
    overall_summary: "Maria teve um excelente primeiro trimestre! Ela se adaptou muito bem à rotina escolar e demonstra entusiasmo em participar de todas as atividades propostas. Sua evolução em todas as áreas do desenvolvimento está acima do esperado para a faixa etária.",
    recommendations: "Continue incentivando a leitura em casa com histórias variadas. Jogos de quebra-cabeça e blocos de montar ajudam no desenvolvimento cognitivo. Atividades ao ar livre são ótimas para a coordenação motora.",
    next_steps: "No próximo trimestre, vamos focar no reconhecimento das letras do alfabeto e iniciação à escrita do nome. Também trabalharemos atividades que desenvolvam ainda mais a paciência e tolerância à frustração.",
    created_at: "2026-03-28T10:00:00Z",
    pedagogue_name: "Lucia Fernandes",
  },
];

export function DemoParentDashboard() {
  const [activeTab, setActiveTab] = useState("feed");
  const [activeChannel, setActiveChannel] = useState<"school" | "nutritionist">("school");
  const [messages, setMessages] = useState<DemoParentMessage[]>(initialMessages);
  const [chatInput, setChatInput] = useState("");
  const [selectedEvaluation, setSelectedEvaluation] = useState<typeof mockEvaluations[0] | null>(null);
  const [evaluationDialogOpen, setEvaluationDialogOpen] = useState(false);
  
  // Settings state
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Get unread count per channel
  const getUnreadCount = (channel: "school" | "nutritionist") => {
    return messages.filter((m) => m.channel === channel && !m.isOwn && !m.isRead).length;
  };

  // Mark messages as read when switching channels
  const handleChannelChange = (channel: "school" | "nutritionist") => {
    setActiveChannel(channel);
    setMessages((prev) =>
      prev.map((msg) =>
        msg.channel === channel && !msg.isOwn ? { ...msg, isRead: true } : msg
      )
    );
  };

  // Send message
  const handleSendMessage = () => {
    if (!chatInput.trim()) return;
    const newMessage: DemoParentMessage = {
      id: `new-${Date.now()}`,
      content: chatInput,
      isOwn: true,
      time: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      sender: "Você",
      isRead: false,
      channel: activeChannel,
    };
    setMessages((prev) => [...prev, newMessage]);
    setChatInput("");
    
    // Simulate read receipt after 2 seconds
    setTimeout(() => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === newMessage.id ? { ...msg, isRead: true } : msg
        )
      );
    }, 2000);
  };

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
              <Card className="border-l-4 border-l-pimpo-yellow overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-pimpo-yellow" />
                    Avisos Recentes
                  </CardTitle>
                </CardHeader>
                <CardContent className="overflow-hidden">
                  <div className="space-y-2">
                    <div className="p-2 bg-muted/50 rounded text-sm">
                      <p className="font-medium truncate">Reunião de Pais</p>
                      <p className="text-xs text-muted-foreground truncate">Sexta-feira às 18h</p>
                    </div>
                    <div className="p-2 bg-muted/50 rounded text-sm">
                      <p className="font-medium truncate">Festa Junina</p>
                      <p className="text-xs text-muted-foreground truncate">24 de Junho</p>
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
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-pimpo-green" />
                        <span className="text-sm font-medium">Bilhetinho da Escola</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        Atualizado às 15:42
                      </span>
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
                      <TabsList className="w-full h-auto p-0 bg-transparent rounded-none grid grid-cols-9">
                        <TabsTrigger value="feed" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3">
                          <Newspaper className="w-4 h-4" />
                        </TabsTrigger>
                        <TabsTrigger value="agenda" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3">
                          <Calendar className="w-4 h-4" />
                        </TabsTrigger>
                        <TabsTrigger value="chat" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3 gap-1">
                          <MessageSquare className="w-4 h-4" />
                          {(getUnreadCount("school") + getUnreadCount("nutritionist")) > 0 && (
                            <Badge variant="destructive" className="h-4 min-w-[1rem] px-1 text-[10px]">
                              {getUnreadCount("school") + getUnreadCount("nutritionist")}
                            </Badge>
                          )}
                        </TabsTrigger>
                        <TabsTrigger value="cardapio" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3">
                          <UtensilsCrossed className="w-4 h-4" />
                        </TabsTrigger>
                        <TabsTrigger value="galeria" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3">
                          <Camera className="w-4 h-4" />
                        </TabsTrigger>
                        <TabsTrigger value="calendario" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3">
                          <CalendarDays className="w-4 h-4" />
                        </TabsTrigger>
                        <TabsTrigger value="avaliacoes" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3">
                          <GraduationCap className="w-4 h-4" />
                        </TabsTrigger>
                        <TabsTrigger value="pagamentos" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3">
                          <CreditCard className="w-4 h-4" />
                        </TabsTrigger>
                        <TabsTrigger value="configuracoes" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3">
                          <Settings className="w-4 h-4" />
                        </TabsTrigger>
                      </TabsList>
                    </div>

                    <div className="p-4">
                      {/* Feed Tab */}
                      <TabsContent value="feed" className="mt-0">
                        <h3 className="font-semibold mb-4">Feed da Escola</h3>
                        <ScrollArea className="h-[400px] pr-3">
                          <div className="space-y-4">
                            {/* Mock Feed Posts */}
                            <div className="border rounded-lg overflow-hidden">
                              <div className="aspect-video bg-gradient-to-br from-pimpo-blue/20 to-pimpo-green/20 flex items-center justify-center">
                                <span className="text-4xl">🎨</span>
                              </div>
                              <div className="p-3">
                                <div className="flex items-center gap-2 mb-2">
                                  <Avatar className="h-7 w-7">
                                    <AvatarFallback className="bg-primary/10 text-primary text-xs">P</AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <p className="text-sm font-medium">Prof. Ana Silva</p>
                                    <p className="text-xs text-muted-foreground">Há 2 horas</p>
                                  </div>
                                </div>
                                <p className="text-sm mb-3">
                                  Hoje foi dia de pintura livre! As crianças adoraram explorar as cores e criar suas obras de arte. 🎨✨ #AtividadesCriativas
                                </p>
                                <div className="flex items-center gap-4 text-muted-foreground">
                                  <button className="flex items-center gap-1 text-xs hover:text-pimpo-red transition-colors">
                                    <Heart className="w-4 h-4" /> 12
                                  </button>
                                  <button className="flex items-center gap-1 text-xs hover:text-primary transition-colors">
                                    <MessageCircle className="w-4 h-4" /> 3
                                  </button>
                                </div>
                              </div>
                            </div>

                            <div className="border rounded-lg overflow-hidden">
                              <div className="p-3">
                                <div className="flex items-center gap-2 mb-2">
                                  <Avatar className="h-7 w-7">
                                    <AvatarFallback className="bg-pimpo-yellow/20 text-pimpo-yellow text-xs">D</AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <p className="text-sm font-medium">Direção</p>
                                    <p className="text-xs text-muted-foreground">Ontem</p>
                                  </div>
                                </div>
                                <p className="text-sm mb-3">
                                  📢 Lembramos que na próxima sexta-feira teremos nossa tradicional Festa Junina! Não esqueçam das comidas típicas para a mesa coletiva. Vamos fazer uma festa linda! 🎉🌽
                                </p>
                                <div className="flex items-center gap-4 text-muted-foreground">
                                  <button className="flex items-center gap-1 text-xs hover:text-pimpo-red transition-colors">
                                    <Heart className="w-4 h-4" /> 28
                                  </button>
                                  <button className="flex items-center gap-1 text-xs hover:text-primary transition-colors">
                                    <MessageCircle className="w-4 h-4" /> 8
                                  </button>
                                </div>
                              </div>
                            </div>

                            <div className="border rounded-lg overflow-hidden">
                              <div className="aspect-video bg-gradient-to-br from-pimpo-green/20 to-pimpo-yellow/20 flex items-center justify-center">
                                <span className="text-4xl">🎶</span>
                              </div>
                              <div className="p-3">
                                <div className="flex items-center gap-2 mb-2">
                                  <Avatar className="h-7 w-7">
                                    <AvatarFallback className="bg-primary/10 text-primary text-xs">M</AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <p className="text-sm font-medium">Prof. Maria Clara</p>
                                    <p className="text-xs text-muted-foreground">2 dias atrás</p>
                                  </div>
                                </div>
                                <p className="text-sm mb-3">
                                  Aula de música com muita diversão! As crianças aprenderam a tocar xilofone e cantaram músicas infantis. Foi lindo ver a alegria de cada um! 🎵
                                </p>
                                <div className="flex items-center gap-4 text-muted-foreground">
                                  <button className="flex items-center gap-1 text-xs hover:text-pimpo-red transition-colors">
                                    <Heart className="w-4 h-4" /> 19
                                  </button>
                                  <button className="flex items-center gap-1 text-xs hover:text-primary transition-colors">
                                    <MessageCircle className="w-4 h-4" /> 5
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </ScrollArea>
                      </TabsContent>

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

                      {/* Chat Tab */}
                      <TabsContent value="chat" className="mt-0">
                        <h3 className="font-semibold mb-4">Mensagens</h3>
                        <div className="space-y-4">
                          {/* Channel Selector */}
                          <div className="flex gap-2">
                            <Button 
                              variant={activeChannel === "school" ? "default" : "outline"} 
                              size="sm" 
                              className="flex-1"
                              onClick={() => handleChannelChange("school")}
                            >
                              🏫 Escola
                              {getUnreadCount("school") > 0 && (
                                <Badge variant="destructive" className="ml-2 h-5 px-1.5">
                                  {getUnreadCount("school")}
                                </Badge>
                              )}
                            </Button>
                            <Button 
                              variant={activeChannel === "nutritionist" ? "default" : "outline"} 
                              size="sm" 
                              className="flex-1"
                              onClick={() => handleChannelChange("nutritionist")}
                            >
                              🥗 Nutrição
                              {getUnreadCount("nutritionist") > 0 && (
                                <Badge variant="destructive" className="ml-2 h-5 px-1.5">
                                  {getUnreadCount("nutritionist")}
                                </Badge>
                              )}
                            </Button>
                          </div>
                          {/* Messages */}
                          <ScrollArea className="h-[220px] pr-2">
                            <div className="space-y-3">
                              {messages
                                .filter((msg) => msg.channel === activeChannel)
                                .map((msg) => (
                                  <div
                                    key={msg.id}
                                    className={`flex ${msg.isOwn ? "justify-end" : "justify-start"}`}
                                  >
                                    <div
                                      className={`max-w-[80%] rounded-lg px-3 py-2 ${
                                        msg.isOwn
                                          ? "bg-primary text-primary-foreground"
                                          : "bg-muted"
                                      }`}
                                    >
                                      {!msg.isOwn && (
                                        <p className="text-xs font-medium text-primary mb-1">{msg.sender}</p>
                                      )}
                                      <p className="text-sm">{msg.content}</p>
                                      <div className={`flex items-center gap-1 mt-1 ${msg.isOwn ? "justify-end" : ""}`}>
                                        <span className={`text-xs ${msg.isOwn ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                                          {msg.time}
                                        </span>
                                        {msg.isOwn && (
                                          <span className={msg.isRead ? "text-pimpo-blue" : "text-primary-foreground/70"}>
                                            {msg.isRead ? (
                                              <CheckCheck className="w-3.5 h-3.5" />
                                            ) : (
                                              <Check className="w-3.5 h-3.5" />
                                            )}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              {messages.filter((msg) => msg.channel === activeChannel).length === 0 && (
                                <div className="text-center py-8 text-muted-foreground">
                                  <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-30" />
                                  <p className="text-sm">Nenhuma mensagem ainda</p>
                                </div>
                              )}
                            </div>
                          </ScrollArea>
                          {/* Input */}
                          <div className="flex gap-2">
                            <Input 
                              value={chatInput}
                              onChange={(e) => setChatInput(e.target.value)}
                              onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                              placeholder="Digite sua mensagem..."
                              className="flex-1"
                            />
                            <Button size="sm" onClick={handleSendMessage} disabled={!chatInput.trim()}>
                              <Send className="w-4 h-4" />
                            </Button>
                          </div>
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
                        
                        {/* Today's Menu Highlight */}
                        <div className="mb-4 p-3 bg-primary/5 border border-primary/20 rounded-lg">
                          <p className="text-xs font-medium text-primary mb-2">📅 Cardápio de Hoje (Terça-feira)</p>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div><span className="text-muted-foreground">☕ Café:</span> Pão integral, leite</div>
                            <div><span className="text-muted-foreground">🍽️ Almoço:</span> Arroz, frango</div>
                            <div><span className="text-muted-foreground">🍪 Lanche:</span> Iogurte natural</div>
                            <div><span className="text-muted-foreground">🌙 Jantar:</span> Sopa de legumes</div>
                          </div>
                        </div>

                        {/* Weekly Menu */}
                        <div className="space-y-2">
                          {[
                            { day: "Segunda", cafe: "Pão com queijo, leite", almoco: "Arroz, feijão, carne moída", lanche: "Fruta picada", janta: "Canja de galinha" },
                            { day: "Terça", cafe: "Pão integral, achocolatado", almoco: "Arroz, frango grelhado, salada", lanche: "Iogurte natural", janta: "Sopa de legumes" },
                            { day: "Quarta", cafe: "Biscoito, leite", almoco: "Macarrão com molho, carne", lanche: "Bolo de cenoura", janta: "Purê de batata" },
                            { day: "Quinta", cafe: "Pão, manteiga, leite", almoco: "Arroz, feijão, peixe", lanche: "Fruta com granola", janta: "Sopa de feijão" },
                            { day: "Sexta", cafe: "Mingau de aveia", almoco: "Arroz, strogonoff de frango", lanche: "Biscoito integral", janta: "Caldo verde" },
                          ].map((item, i) => (
                            <div key={item.day} className={`p-3 rounded-lg border ${i === 1 ? "bg-primary/5 border-primary" : ""}`}>
                              <p className="font-medium text-sm mb-1">{item.day}</p>
                              <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
                                <span>☕ {item.cafe}</span>
                                <span>🍽️ {item.almoco}</span>
                                <span>🍪 {item.lanche}</span>
                                <span>🌙 {item.janta}</span>
                              </div>
                            </div>
                          ))}
                        </div>

                        {mockChild.allergies && (
                          <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                            <p className="text-sm text-destructive font-medium">
                              ⚠️ Alerta de alergia: {mockChild.allergies}
                            </p>
                          </div>
                        )}
                      </TabsContent>

                      {/* Calendario Tab */}
                      <TabsContent value="calendario" className="mt-0">
                        <h3 className="font-semibold mb-4">Calendário Escolar</h3>
                        <div className="space-y-3">
                          <div className="p-3 border rounded-lg bg-pimpo-yellow/10 border-pimpo-yellow/30">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge className="bg-pimpo-yellow text-white">Jun 24</Badge>
                              <span className="font-medium">Festa Junina</span>
                            </div>
                            <p className="text-sm text-muted-foreground">Festa junina da escola com comidas típicas</p>
                          </div>
                          <div className="p-3 border rounded-lg">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline">Jul 05</Badge>
                              <span className="font-medium">Reunião de Pais</span>
                            </div>
                            <p className="text-sm text-muted-foreground">Reunião semestral às 18h</p>
                          </div>
                          <div className="p-3 border rounded-lg">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="secondary">Jul 15-29</Badge>
                              <span className="font-medium">Férias de Inverno</span>
                            </div>
                            <p className="text-sm text-muted-foreground">Recesso escolar</p>
                          </div>
                        </div>
                      </TabsContent>

                      {/* Avaliacoes Tab */}
                      <TabsContent value="avaliacoes" className="mt-0">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="p-2 rounded-lg bg-primary/10">
                            <GraduationCap className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-semibold">Avaliações Trimestrais</h3>
                            <p className="text-xs text-muted-foreground">
                              Acompanhamento pedagógico exclusivo do Plano Plus+
                            </p>
                          </div>
                          <Badge variant="secondary" className="ml-auto flex items-center gap-1">
                            <Star className="w-3 h-3" />
                            Plus+
                          </Badge>
                        </div>

                        <div className="space-y-4">
                          {mockEvaluations.map((evaluation) => (
                            <Card key={evaluation.id} className="border-l-4 border-l-green-500">
                              <CardContent className="p-4">
                                <div className="flex justify-between items-start mb-3">
                                  <div>
                                    <p className="font-medium">
                                      {evaluation.quarter}º Trimestre {evaluation.year}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      Pedagoga {evaluation.pedagogue_name}
                                    </p>
                                  </div>
                                  <Badge className="bg-green-500 hover:bg-green-600">Disponível</Badge>
                                </div>
                                
                                <div className="space-y-2 text-sm">
                                  <div className="flex justify-between items-center">
                                    <span className="text-muted-foreground flex items-center gap-1.5">
                                      <Target className="w-3.5 h-3.5" />
                                      Desenvolvimento Motor
                                    </span>
                                    <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50">
                                      Excelente
                                    </Badge>
                                  </div>
                                  <div className="flex justify-between items-center">
                                    <span className="text-muted-foreground flex items-center gap-1.5">
                                      <Heart className="w-3.5 h-3.5" />
                                      Socioemocional
                                    </span>
                                    <Badge variant="outline" className="text-blue-600 border-blue-300 bg-blue-50">
                                      Muito Bom
                                    </Badge>
                                  </div>
                                  <div className="flex justify-between items-center">
                                    <span className="text-muted-foreground flex items-center gap-1.5">
                                      <MessageCircle className="w-3.5 h-3.5" />
                                      Linguagem
                                    </span>
                                    <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50">
                                      Excelente
                                    </Badge>
                                  </div>
                                  <div className="flex justify-between items-center">
                                    <span className="text-muted-foreground flex items-center gap-1.5">
                                      <Brain className="w-3.5 h-3.5" />
                                      Cognitivo
                                    </span>
                                    <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50">
                                      Excelente
                                    </Badge>
                                  </div>
                                  <div className="flex justify-between items-center">
                                    <span className="text-muted-foreground flex items-center gap-1.5">
                                      <Palette className="w-3.5 h-3.5" />
                                      Criatividade
                                    </span>
                                    <Badge variant="outline" className="text-purple-600 border-purple-300 bg-purple-50">
                                      Destaque
                                    </Badge>
                                  </div>
                                </div>

                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="w-full mt-4 border-primary/50 text-primary hover:bg-primary/5"
                                  onClick={() => {
                                    setSelectedEvaluation(evaluation);
                                    setEvaluationDialogOpen(true);
                                  }}
                                >
                                  <ArrowRight className="w-4 h-4 mr-2" />
                                  Ver Avaliação Completa
                                </Button>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </TabsContent>

                      {/* Pagamentos Tab */}
                      <TabsContent value="pagamentos" className="mt-0">
                        <h3 className="font-semibold mb-4">Pagamentos</h3>
                        <div className="space-y-3">
                          <div className="p-4 border rounded-lg flex items-center justify-between">
                            <div>
                              <p className="font-medium">Mensalidade - Janeiro/2026</p>
                              <p className="text-sm text-muted-foreground">Vence em 10/01/2026</p>
                            </div>
                            <Badge className="bg-pimpo-green">Pago</Badge>
                          </div>
                          <div className="p-4 border rounded-lg flex items-center justify-between">
                            <div>
                              <p className="font-medium">Mensalidade - Fevereiro/2026</p>
                              <p className="text-sm text-muted-foreground">Vence em 10/02/2026</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge className="bg-pimpo-yellow text-white">Pendente</Badge>
                              <Button size="sm">Pagar</Button>
                            </div>
                          </div>
                        </div>
                        <div className="mt-4 p-3 bg-muted/50 rounded-lg text-center">
                          <p className="text-sm text-muted-foreground">
                            Valor mensal: <span className="font-semibold text-foreground">R$ 1.200,00</span>
                          </p>
                        </div>
                      </TabsContent>

                      {/* Configurações Tab */}
                      <TabsContent value="configuracoes" className="mt-0">
                        <h3 className="font-semibold mb-4">Configurações</h3>
                        <ScrollArea className="h-[400px] pr-3">
                          <div className="space-y-6">
                            {/* Perfil do Responsável */}
                            <Card>
                              <CardHeader className="pb-3">
                                <CardTitle className="text-base flex items-center gap-2">
                                  <User className="w-4 h-4 text-primary" />
                                  Meu Perfil
                                </CardTitle>
                              </CardHeader>
                              <CardContent className="space-y-4">
                                <div className="flex items-center gap-4">
                                  <Avatar className="h-16 w-16">
                                    <AvatarFallback className="bg-primary/10 text-primary text-xl font-semibold">
                                      J
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1">
                                    <p className="font-semibold text-lg">João Silva</p>
                                    <p className="text-sm text-muted-foreground">Responsável</p>
                                  </div>
                                </div>
                                
                                <div className="grid gap-3 pt-2">
                                  <div className="flex items-center gap-3 text-sm">
                                    <Mail className="w-4 h-4 text-muted-foreground" />
                                    <span>joao.silva@email.com</span>
                                  </div>
                                  <div className="flex items-center gap-3 text-sm">
                                    <Phone className="w-4 h-4 text-muted-foreground" />
                                    <span>(11) 99999-9999</span>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>

                            {/* Crianças Vinculadas */}
                            <Card>
                              <CardHeader className="pb-3">
                                <CardTitle className="text-base flex items-center gap-2">
                                  <Users className="w-4 h-4 text-pimpo-blue" />
                                  Crianças Vinculadas
                                </CardTitle>
                              </CardHeader>
                              <CardContent>
                                <div className="space-y-3">
                                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                                    <div className="flex items-center gap-3">
                                      <Avatar className="h-10 w-10">
                                        <AvatarFallback className="bg-pimpo-blue text-white font-fredoka">
                                          M
                                        </AvatarFallback>
                                      </Avatar>
                                      <div>
                                        <p className="font-medium">{mockChild.full_name}</p>
                                        <p className="text-xs text-muted-foreground">
                                          {classTypeLabels[mockChild.class_type]} • {shiftLabels[mockChild.shift_type || "integral"]}
                                        </p>
                                      </div>
                                    </div>
                                    <Badge variant="outline" className="text-pimpo-green border-pimpo-green">
                                      {calculateAge(mockChild.birth_date)}
                                    </Badge>
                                  </div>
                                </div>
                                
                                <Button variant="outline" size="sm" className="w-full mt-3">
                                  <UserPlus className="w-4 h-4 mr-2" />
                                  Convidar Outro Responsável
                                </Button>
                              </CardContent>
                            </Card>

                            {/* Segurança */}
                            <Card>
                              <CardHeader className="pb-3">
                                <CardTitle className="text-base flex items-center gap-2">
                                  <Shield className="w-4 h-4 text-pimpo-red" />
                                  Segurança
                                </CardTitle>
                              </CardHeader>
                              <CardContent className="space-y-4">
                                <div className="space-y-3">
                                  <div className="space-y-2">
                                    <label className="text-sm font-medium flex items-center gap-2">
                                      <Lock className="w-4 h-4" />
                                      Senha Atual
                                    </label>
                                    <div className="relative">
                                      <Input
                                        type={showCurrentPassword ? "text" : "password"}
                                        placeholder="Digite sua senha atual"
                                        value={currentPassword}
                                        onChange={(e) => setCurrentPassword(e.target.value)}
                                        className="pr-10"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                      >
                                        {showCurrentPassword ? (
                                          <EyeOff className="w-4 h-4" />
                                        ) : (
                                          <Eye className="w-4 h-4" />
                                        )}
                                      </button>
                                    </div>
                                  </div>

                                  <div className="space-y-2">
                                    <label className="text-sm font-medium">Nova Senha</label>
                                    <div className="relative">
                                      <Input
                                        type={showNewPassword ? "text" : "password"}
                                        placeholder="Digite a nova senha"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className="pr-10"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => setShowNewPassword(!showNewPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                      >
                                        {showNewPassword ? (
                                          <EyeOff className="w-4 h-4" />
                                        ) : (
                                          <Eye className="w-4 h-4" />
                                        )}
                                      </button>
                                    </div>
                                  </div>

                                  <div className="space-y-2">
                                    <label className="text-sm font-medium">Confirmar Nova Senha</label>
                                    <Input
                                      type="password"
                                      placeholder="Confirme a nova senha"
                                      value={confirmPassword}
                                      onChange={(e) => setConfirmPassword(e.target.value)}
                                    />
                                  </div>
                                </div>

                                <Button 
                                  className="w-full"
                                  disabled={!currentPassword || !newPassword || newPassword !== confirmPassword}
                                  onClick={() => {
                                    alert("Demo: Senha alterada com sucesso!");
                                    setCurrentPassword("");
                                    setNewPassword("");
                                    setConfirmPassword("");
                                  }}
                                >
                                  <Lock className="w-4 h-4 mr-2" />
                                  Alterar Senha
                                </Button>
                              </CardContent>
                            </Card>
                          </div>
                        </ScrollArea>
                      </TabsContent>
                    </div>
                  </Tabs>
                </CardContent>
              </Card>

              {/* Mini Calendar */}
              <DemoMiniCalendar />
            </div>
          </div>
        </div>
      </main>

      {/* Evaluation Detail Dialog */}
      <EvaluationDetailDialog
        evaluation={selectedEvaluation}
        childName={mockChild.full_name}
        open={evaluationDialogOpen}
        onOpenChange={setEvaluationDialogOpen}
      />
    </div>
  );
}
