import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BookOpen,
  Home,
  Bell,
  Calendar,
  Save,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  Package,
  Target,
  FileText,
  Edit,
  Baby,
  Palette,
  BookMarked,
  MessageSquare,
  Users,
  GraduationCap,
  Brain,
  Heart,
  Sparkles,
  Loader2,
  Star,
  ArrowRight,
  Check,
  CheckCheck,
  Wand2,
} from "lucide-react";
import logo from "@/assets/logo-pimpolinhos.png";
import { DemoQuickPostCreator } from "./DemoQuickPostCreator";
import { DemoMiniCalendar } from "./DemoMiniCalendar";

// Message interface
interface DemoMessage {
  id: string;
  content: string;
  isOwn: boolean;
  time: string;
  sender: string;
  isRead: boolean;
}

// Staff chat channel type
type StaffChannel = "geral" | "professoras" | "direcao";

// Initial staff messages
const initialStaffMessages: Record<StaffChannel, DemoMessage[]> = {
  geral: [
    { id: "s1", content: "Bom dia, equipe! Reunião pedagógica amanhã às 14h. 📋", sender: "Diretora Maria", isOwn: false, time: "08:30", isRead: false },
    { id: "s2", content: "Preparei a pauta da reunião, vou enviar por email!", sender: "Pedagoga Lucia", isOwn: true, time: "08:35", isRead: true },
    { id: "s3", content: "Perfeito! Obrigada, Lucia 👍", sender: "Diretora Maria", isOwn: false, time: "08:40", isRead: false },
  ],
  professoras: [
    { id: "p1", content: "Lucia, preparei as atividades da semana conforme seu planejamento!", sender: "Prof. Ana", isOwn: false, time: "09:15", isRead: false },
    { id: "p2", content: "Ótimo! Passei lá e vi que ficou muito bom. Parabéns! 🎉", sender: "Pedagoga Lucia", isOwn: true, time: "09:20", isRead: true },
  ],
  direcao: [
    { id: "d1", content: "Lucia, preciso das avaliações do trimestre para a reunião de pais.", sender: "Diretora Maria", isOwn: false, time: "10:00", isRead: false },
    { id: "d2", content: "Estou finalizando! Envio até amanhã ao meio-dia.", sender: "Pedagoga Lucia", isOwn: true, time: "10:05", isRead: true },
  ],
};

// Parent messages for pedagogue
const initialParentMessages: Record<string, DemoMessage[]> = {
  "1": [
    { id: "m1", content: "Bom dia, pedagoga! Como está o desenvolvimento da Maria?", sender: "Mãe da Maria", isOwn: false, time: "08:15", isRead: true },
    { id: "m2", content: "Bom dia! Maria está ótima, evoluindo muito bem!", sender: "Pedagoga Lucia", isOwn: true, time: "08:20", isRead: true },
  ],
  "2": [
    { id: "m3", content: "Quando sai a avaliação trimestral do João?", sender: "Pai do João", isOwn: false, time: "09:00", isRead: false },
  ],
  "3": [],
};

// Mock children with Plus+ plan
const mockPlusChildren = [
  { id: "1", name: "Maria Silva", class: "maternal", photo: "https://images.unsplash.com/photo-1595074475609-81c60c568046?w=100", hasPlan: true },
  { id: "2", name: "João Pedro", class: "maternal", photo: "https://images.unsplash.com/photo-1503919545889-aef636e10ad4?w=100", hasPlan: true },
  { id: "3", name: "Ana Beatriz", class: "jardim", photo: "https://images.unsplash.com/photo-1519457431-44ccd64a579b?w=100", hasPlan: true },
];

// All children for parent chat
const allChildren = [
  ...mockPlusChildren,
  { id: "4", name: "Lucas Oliveira", class: "bercario", photo: "https://images.unsplash.com/photo-1596215143922-eedeaba0d91c?w=100", hasPlan: false },
];

const daysOfWeek = [
  { value: 0, label: "Segunda", fullLabel: "Segunda-feira" },
  { value: 1, label: "Terça", fullLabel: "Terça-feira" },
  { value: 2, label: "Quarta", fullLabel: "Quarta-feira" },
  { value: 3, label: "Quinta", fullLabel: "Quinta-feira" },
  { value: 4, label: "Sexta", fullLabel: "Sexta-feira" },
];

const classTypes = [
  { value: "bercario", label: "Berçário", icon: Baby },
  { value: "maternal", label: "Maternal", icon: BookMarked },
  { value: "jardim", label: "Jardim", icon: Palette },
];

const quarterLabels: Record<number, string> = {
  1: "1º Trimestre",
  2: "2º Trimestre",
  3: "3º Trimestre",
  4: "4º Trimestre",
};

// Mock weekly plans (same as before but simplified for brevity)
const mockWeeklyPlans = {
  bercario: {
    0: { morningActivities: "• Roda de música com instrumentos\n• Estimulação sensorial", afternoonActivities: "• Contação de história com fantoches\n• Relaxamento", materials: "Instrumentos musicais, tecidos", objectives: "Desenvolvimento motor, estimulação sensorial", notes: "" },
    1: { morningActivities: "• Pintura com as mãos\n• Exploração de objetos", afternoonActivities: "• Música e movimento\n• Massinha sensorial", materials: "Tinta atóxica, massinha caseira", objectives: "Coordenação motora fina, criatividade", notes: "" },
    2: { morningActivities: "• Brincadeira no espelho\n• Encaixes e formas", afternoonActivities: "• Exploração com água\n• Brincadeira de esconde", materials: "Espelhos, blocos de encaixe", objectives: "Auto-reconhecimento, raciocínio lógico", notes: "" },
    3: { morningActivities: "• Circuito motor adaptado\n• Bolhas de sabão", afternoonActivities: "• Contação de história\n• Momento calmo", materials: "Túnel, colchonetes, bolhas", objectives: "Desenvolvimento motor grosso", notes: "" },
    4: { morningActivities: "• Dia do brinquedo\n• Roda de cantigas", afternoonActivities: "• Pintura com pincéis grandes\n• Dança livre", materials: "Brinquedos variados, tintas", objectives: "Socialização, autonomia", notes: "" },
  },
  maternal: {
    0: { morningActivities: "• Roda de conversa\n• Recorte e colagem", afternoonActivities: "• História interativa\n• Faz-de-conta", materials: "Revistas, tesoura sem ponta, cola", objectives: "Linguagem oral, coordenação motora fina", notes: "" },
    1: { morningActivities: "• Aula de movimento\n• Jogos de encaixe", afternoonActivities: "• Pintura com guache\n• Hora do conto", materials: "Colchonetes, jogos, tinta guache", objectives: "Desenvolvimento motor, expressão artística", notes: "" },
    2: { morningActivities: "• Projeto da natureza\n• Exploração do jardim", afternoonActivities: "• Música e instrumentos\n• Jogos de memória", materials: "Vasinhos, terra, sementes", objectives: "Ciências naturais, observação", notes: "" },
    3: { morningActivities: "• Jogos matemáticos\n• Quebra-cabeça", afternoonActivities: "• Capoeira\n• Brincadeira de roda", materials: "Blocos lógicos, quebra-cabeças", objectives: "Noções matemáticas, cultura", notes: "" },
    4: { morningActivities: "• Culinária simples\n• Roda de música", afternoonActivities: "• Filme educativo\n• Atividade de artes", materials: "Ingredientes da receita", objectives: "Autonomia, trabalho em equipe", notes: "" },
  },
  jardim: {
    0: { morningActivities: "• Roda de leitura\n• Atividade de escrita", afternoonActivities: "• Projeto de ciências\n• Registro no caderno", materials: "Livros, cadernos, lápis", objectives: "Alfabetização, letramento", notes: "" },
    1: { morningActivities: "• Matemática lúdica\n• Jogos de tabuleiro", afternoonActivities: "• Educação física\n• Jogos coletivos", materials: "Jogos de tabuleiro, bolas", objectives: "Raciocínio matemático, trabalho em equipe", notes: "" },
    2: { morningActivities: "• Produção de texto\n• Ilustração", afternoonActivities: "• Artes: técnica mista\n• Exposição", materials: "Papel craft, tintas variadas", objectives: "Produção textual, criatividade", notes: "" },
    3: { morningActivities: "• Inglês básico\n• Música em inglês", afternoonActivities: "• Horta: cuidados\n• Observação", materials: "Flashcards, aparelho de som", objectives: "Introdução ao inglês, responsabilidade", notes: "" },
    4: { morningActivities: "• Revisão semanal\n• Jogos educativos", afternoonActivities: "• Tarde recreativa\n• Preparação para casa", materials: "Jogos variados", objectives: "Consolidação do aprendizado", notes: "" },
  },
};

export function DemoPedagogueDashboard() {
  const [activeTab, setActiveTab] = useState("planejamento");
  const [selectedClass, setSelectedClass] = useState("maternal");
  const [selectedDay, setSelectedDay] = useState(new Date().getDay() - 1 >= 0 ? new Date().getDay() - 1 : 0);
  const [isEditing, setIsEditing] = useState(false);
  const [plans, setPlans] = useState(mockWeeklyPlans);
  const [currentWeek, setCurrentWeek] = useState(new Date());

  // Staff chat states
  const [selectedStaffChannel, setSelectedStaffChannel] = useState<StaffChannel>("geral");
  const [staffChatMessage, setStaffChatMessage] = useState("");
  const [staffMessages, setStaffMessages] = useState<Record<StaffChannel, DemoMessage[]>>(initialStaffMessages);

  // Parent chat states
  const [selectedChatChild, setSelectedChatChild] = useState<string | null>(null);
  const [chatMessage, setChatMessage] = useState("");
  const [chatMessages, setChatMessages] = useState<Record<string, DemoMessage[]>>(initialParentMessages);

  // Evaluation states
  const [selectedEvalChild, setSelectedEvalChild] = useState<string | null>(null);
  const [selectedQuarter, setSelectedQuarter] = useState(1);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [evaluation, setEvaluation] = useState({
    cognitive: "",
    motor: "",
    socialEmotional: "",
    language: "",
    creativity: "",
    summary: "",
    recommendations: "",
    nextSteps: "",
  });

  const getWeekStart = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  };

  const weekStart = getWeekStart(currentWeek);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 4);

  const handlePrevWeek = () => {
    const newDate = new Date(currentWeek);
    newDate.setDate(newDate.getDate() - 7);
    setCurrentWeek(newDate);
  };

  const handleNextWeek = () => {
    const newDate = new Date(currentWeek);
    newDate.setDate(newDate.getDate() + 7);
    setCurrentWeek(newDate);
  };

  const currentPlan = plans[selectedClass as keyof typeof plans][selectedDay as keyof typeof plans.bercario];

  const updatePlan = (field: string, value: string) => {
    setPlans(prev => ({
      ...prev,
      [selectedClass]: {
        ...prev[selectedClass as keyof typeof prev],
        [selectedDay]: {
          ...prev[selectedClass as keyof typeof prev][selectedDay as keyof typeof prev.bercario],
          [field]: value,
        }
      }
    }));
  };

  // Staff chat functions
  const handleStaffChannelChange = (channel: StaffChannel) => {
    setSelectedStaffChannel(channel);
    setStaffMessages((prev) => ({
      ...prev,
      [channel]: prev[channel].map((msg) => msg.isOwn ? msg : { ...msg, isRead: true }),
    }));
  };

  const handleSendStaffMessage = () => {
    if (!staffChatMessage.trim()) return;
    const newMessage: DemoMessage = {
      id: `staff-${Date.now()}`,
      content: staffChatMessage,
      sender: "Pedagoga Lucia",
      isOwn: true,
      time: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      isRead: false,
    };
    setStaffMessages((prev) => ({
      ...prev,
      [selectedStaffChannel]: [...prev[selectedStaffChannel], newMessage],
    }));
    setStaffChatMessage("");
    setTimeout(() => {
      setStaffMessages((prev) => ({
        ...prev,
        [selectedStaffChannel]: prev[selectedStaffChannel].map((msg) =>
          msg.id === newMessage.id ? { ...msg, isRead: true } : msg
        ),
      }));
    }, 2000);
  };

  const getStaffUnreadCount = (channel: StaffChannel) => {
    return staffMessages[channel].filter((m) => !m.isOwn && !m.isRead).length;
  };

  // Parent chat functions
  const handleSelectChatChild = (childId: string) => {
    setSelectedChatChild(childId);
    setChatMessages((prev) => ({
      ...prev,
      [childId]: (prev[childId] || []).map((msg) => msg.isOwn ? msg : { ...msg, isRead: true }),
    }));
  };

  const handleSendParentMessage = () => {
    if (!chatMessage.trim() || !selectedChatChild) return;
    const newMessage: DemoMessage = {
      id: `new-${Date.now()}`,
      content: chatMessage,
      sender: "Pedagoga Lucia",
      isOwn: true,
      time: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      isRead: false,
    };
    setChatMessages((prev) => ({
      ...prev,
      [selectedChatChild]: [...(prev[selectedChatChild] || []), newMessage],
    }));
    setChatMessage("");
  };

  const getUnreadCount = (childId: string) => {
    return (chatMessages[childId] || []).filter((m) => !m.isOwn && !m.isRead).length;
  };

  // AI Generation for evaluation
  const generateWithAI = (field: string) => {
    setIsGeneratingAI(true);
    const child = mockPlusChildren.find(c => c.id === selectedEvalChild);
    const childName = child?.name.split(" ")[0] || "A criança";

    const aiResponses: Record<string, string> = {
      cognitive: `${childName} demonstra excelente capacidade de concentração e resolução de problemas. Consegue seguir instruções complexas e mostra curiosidade natural para explorar novos conceitos. Identifica cores, formas e números com facilidade.`,
      motor: `Apresenta coordenação motora fina e grossa bem desenvolvidas para a idade. Manipula materiais com segurança, consegue desenhar formas reconhecíveis e demonstra bom equilíbrio nas atividades físicas.`,
      socialEmotional: `Interage positivamente com os colegas, demonstrando empatia e capacidade de compartilhar. Participa ativamente das atividades em grupo e está desenvolvendo bem suas habilidades sociais.`,
      language: `Vocabulário amplo e expressivo para a idade. Conta pequenas histórias com sequência lógica. Faz perguntas elaboradas e demonstra interesse por livros e narrativas.`,
      creativity: `Muito criativa nas atividades artísticas! Usa cores vibrantes e experimenta diferentes materiais. Demonstra originalidade e imaginação nas produções.`,
      summary: `${childName} teve um excelente ${quarterLabels[selectedQuarter].toLowerCase()}! Demonstra entusiasmo em participar de todas as atividades propostas e sua evolução está acima do esperado para a faixa etária.`,
      recommendations: `Continue incentivando a leitura em casa com histórias variadas. Jogos de quebra-cabeça e blocos de montar ajudam no desenvolvimento cognitivo. Atividades ao ar livre são ótimas para a coordenação motora.`,
      nextSteps: `No próximo trimestre, vamos focar em atividades que desenvolvam ainda mais a autonomia e as habilidades de resolução de problemas, além de introduzir novos desafios pedagógicos.`,
    };

    setTimeout(() => {
      setEvaluation(prev => ({ ...prev, [field]: aiResponses[field] }));
      setIsGeneratingAI(false);
    }, 1200);
  };

  const generateAllWithAI = () => {
    setIsGeneratingAI(true);
    const child = mockPlusChildren.find(c => c.id === selectedEvalChild);
    const childName = child?.name.split(" ")[0] || "A criança";

    setTimeout(() => {
      setEvaluation({
        cognitive: `${childName} demonstra excelente capacidade de concentração e resolução de problemas. Consegue seguir instruções complexas e mostra curiosidade natural para explorar novos conceitos.`,
        motor: `Apresenta coordenação motora fina e grossa bem desenvolvidas para a idade. Demonstra bom equilíbrio e controle corporal nas atividades físicas.`,
        socialEmotional: `Interage positivamente com os colegas, demonstrando empatia e capacidade de compartilhar. Participa ativamente das atividades em grupo.`,
        language: `Vocabulário amplo e expressivo para a idade. Conta pequenas histórias com sequência lógica e demonstra interesse por livros.`,
        creativity: `Muito criativa nas atividades artísticas! Usa cores vibrantes e demonstra originalidade nas produções.`,
        summary: `${childName} teve um excelente ${quarterLabels[selectedQuarter].toLowerCase()}! Evolução acima do esperado para a faixa etária.`,
        recommendations: `Continuar incentivando leitura em casa. Jogos de raciocínio e atividades ao ar livre são recomendados.`,
        nextSteps: `Próximo trimestre: foco em autonomia, resolução de problemas e novos desafios pedagógicos.`,
      });
      setIsGeneratingAI(false);
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-purple-50/30 to-background relative">
      {/* Header */}
      <header className="bg-card/80 backdrop-blur-sm shadow-sm sticky top-0 z-40 border-b">
        <div className="container py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img src={logo} alt="Creche Pimpolinhos" className="h-10" />
            <span className="font-fredoka text-lg font-bold hidden sm:inline">
              Pedagogia
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-purple-600 text-white font-semibold">
                  L
                </AvatarFallback>
              </Avatar>
              <span>Pedagoga Lucia (Demo)</span>
            </div>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center">
                3
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
      <main className="container py-6 max-w-6xl">
        <div className="mb-6">
          <h1 className="font-fredoka text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <BookOpen className="w-8 h-8 text-purple-600" />
            Olá, Pedagoga Lucia! 👋
          </h1>
          <p className="text-muted-foreground">
            {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <Card className="bg-purple-50 border-purple-200">
            <CardContent className="p-4 text-center">
              <GraduationCap className="w-6 h-6 mx-auto mb-1 text-purple-600" />
              <p className="text-2xl font-bold text-purple-600">3</p>
              <p className="text-xs text-muted-foreground">Avaliações Pendentes</p>
            </CardContent>
          </Card>
          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-4 text-center">
              <FileText className="w-6 h-6 mx-auto mb-1 text-green-600" />
              <p className="text-2xl font-bold text-green-600">15</p>
              <p className="text-xs text-muted-foreground">Planos Semanais</p>
            </CardContent>
          </Card>
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4 text-center">
              <MessageSquare className="w-6 h-6 mx-auto mb-1 text-blue-600" />
              <p className="text-2xl font-bold text-blue-600">{Object.values(chatMessages).reduce((acc, msgs) => acc + msgs.filter(m => !m.isOwn && !m.isRead).length, 0)}</p>
              <p className="text-xs text-muted-foreground">Mensagens Novas</p>
            </CardContent>
          </Card>
          <Card className="bg-amber-50 border-amber-200">
            <CardContent className="p-4 text-center">
              <Star className="w-6 h-6 mx-auto mb-1 text-amber-600" />
              <p className="text-2xl font-bold text-amber-600">3</p>
              <p className="text-xs text-muted-foreground">Alunos Plus+</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Tabs */}
        <Card className="shadow-lg">
          <CardContent className="p-0">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <div className="border-b bg-muted/30 overflow-visible">
                <TabsList className="bg-transparent h-auto p-0 flex flex-wrap justify-start overflow-visible">
                  <TabsTrigger value="planejamento" className="rounded-none border-b-2 border-transparent data-[state=active]:border-purple-600 data-[state=active]:bg-transparent py-3 px-4">
                    <Calendar className="w-4 h-4 mr-2" />
                    <span className="hidden sm:inline">Planejamento</span>
                  </TabsTrigger>
                  <TabsTrigger value="avaliacoes" className="rounded-none border-b-2 border-transparent data-[state=active]:border-purple-600 data-[state=active]:bg-transparent py-3 px-4">
                    <GraduationCap className="w-4 h-4 mr-2" />
                    <span className="hidden sm:inline">Avaliações Plus+</span>
                    <Badge variant="secondary" className="ml-2 h-5 px-1.5 hidden sm:flex">3</Badge>
                  </TabsTrigger>
                  <TabsTrigger value="pais" className="rounded-none border-b-2 border-transparent data-[state=active]:border-purple-600 data-[state=active]:bg-transparent py-3 px-4 gap-1">
                    <Users className="w-4 h-4" />
                    <span className="hidden sm:inline">Chat Pais</span>
                    {Object.values(chatMessages).reduce((acc, msgs) => acc + msgs.filter(m => !m.isOwn && !m.isRead).length, 0) > 0 && (
                      <Badge variant="destructive" className="h-4 min-w-[1rem] px-1 text-[10px]">
                        {Object.values(chatMessages).reduce((acc, msgs) => acc + msgs.filter(m => !m.isOwn && !m.isRead).length, 0)}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="equipe" className="rounded-none border-b-2 border-transparent data-[state=active]:border-purple-600 data-[state=active]:bg-transparent py-3 px-4 gap-1">
                    <MessageSquare className="w-4 h-4" />
                    <span className="hidden sm:inline">Chat Equipe</span>
                    {(getStaffUnreadCount("geral") + getStaffUnreadCount("professoras") + getStaffUnreadCount("direcao")) > 0 && (
                      <Badge variant="destructive" className="h-4 min-w-[1rem] px-1 text-[10px]">
                        {getStaffUnreadCount("geral") + getStaffUnreadCount("professoras") + getStaffUnreadCount("direcao")}
                      </Badge>
                    )}
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className="p-4">
                {/* Planejamento Tab */}
                <TabsContent value="planejamento" className="mt-0 space-y-4">
                  {/* Week Navigation */}
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <Button variant="outline" size="icon" onClick={handlePrevWeek}>
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <p className="font-semibold">
                      Semana: {weekStart.toLocaleDateString("pt-BR", { day: "numeric", month: "short" })} - {weekEnd.toLocaleDateString("pt-BR", { day: "numeric", month: "short" })}
                    </p>
                    <Button variant="outline" size="icon" onClick={handleNextWeek}>
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Class Selector */}
                  <div className="flex gap-2 flex-wrap">
                    {classTypes.map((cls) => {
                      const Icon = cls.icon;
                      return (
                        <Button
                          key={cls.value}
                          variant={selectedClass === cls.value ? "default" : "outline"}
                          onClick={() => setSelectedClass(cls.value)}
                          className={selectedClass === cls.value ? "bg-purple-600 hover:bg-purple-700" : ""}
                        >
                          <Icon className="w-4 h-4 mr-2" />
                          {cls.label}
                        </Button>
                      );
                    })}
                  </div>

                  {/* Day Tabs */}
                  <Tabs value={String(selectedDay)} onValueChange={(v) => setSelectedDay(Number(v))}>
                    <TabsList className="grid grid-cols-5">
                      {daysOfWeek.map((day) => (
                        <TabsTrigger key={day.value} value={String(day.value)} className="text-xs sm:text-sm">
                          {day.label}
                        </TabsTrigger>
                      ))}
                    </TabsList>

                    {daysOfWeek.map((day) => (
                      <TabsContent key={day.value} value={String(day.value)}>
                        <Card>
                          <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <div>
                              <CardTitle className="text-lg">{day.fullLabel}</CardTitle>
                              <CardDescription>{classTypes.find(c => c.value === selectedClass)?.label}</CardDescription>
                            </div>
                            <Button
                              variant={isEditing ? "default" : "outline"}
                              onClick={() => setIsEditing(!isEditing)}
                              className={isEditing ? "bg-purple-600 hover:bg-purple-700" : ""}
                            >
                              {isEditing ? <><Save className="w-4 h-4 mr-2" />Salvar</> : <><Edit className="w-4 h-4 mr-2" />Editar</>}
                            </Button>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="space-y-2">
                              <Label className="flex items-center gap-2"><Sun className="w-4 h-4 text-yellow-500" />Atividades da Manhã</Label>
                              {isEditing ? (
                                <Textarea value={currentPlan?.morningActivities || ""} onChange={(e) => updatePlan("morningActivities", e.target.value)} rows={3} />
                              ) : (
                                <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-100">
                                  <pre className="text-sm whitespace-pre-wrap font-sans">{currentPlan?.morningActivities || "—"}</pre>
                                </div>
                              )}
                            </div>
                            <div className="space-y-2">
                              <Label className="flex items-center gap-2"><Moon className="w-4 h-4 text-blue-500" />Atividades da Tarde</Label>
                              {isEditing ? (
                                <Textarea value={currentPlan?.afternoonActivities || ""} onChange={(e) => updatePlan("afternoonActivities", e.target.value)} rows={3} />
                              ) : (
                                <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                                  <pre className="text-sm whitespace-pre-wrap font-sans">{currentPlan?.afternoonActivities || "—"}</pre>
                                </div>
                              )}
                            </div>
                            <div className="grid sm:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label className="flex items-center gap-2"><Package className="w-4 h-4 text-green-500" />Materiais</Label>
                                {isEditing ? (
                                  <Textarea value={currentPlan?.materials || ""} onChange={(e) => updatePlan("materials", e.target.value)} rows={2} />
                                ) : (
                                  <div className="p-3 bg-green-50 rounded-lg border border-green-100 text-sm">{currentPlan?.materials || "—"}</div>
                                )}
                              </div>
                              <div className="space-y-2">
                                <Label className="flex items-center gap-2"><Target className="w-4 h-4 text-purple-500" />Objetivos</Label>
                                {isEditing ? (
                                  <Textarea value={currentPlan?.objectives || ""} onChange={(e) => updatePlan("objectives", e.target.value)} rows={2} />
                                ) : (
                                  <div className="p-3 bg-purple-50 rounded-lg border border-purple-100 text-sm">{currentPlan?.objectives || "—"}</div>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </TabsContent>
                    ))}
                  </Tabs>
                </TabsContent>

                {/* Avaliações Plus+ Tab */}
                <TabsContent value="avaliacoes" className="mt-0 space-y-4">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-lg bg-purple-100">
                      <GraduationCap className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Avaliações Trimestrais - Plano Plus+</h3>
                      <p className="text-sm text-muted-foreground">Crie avaliações detalhadas para os alunos Plus+</p>
                    </div>
                    <Badge variant="secondary" className="ml-auto flex items-center gap-1">
                      <Star className="w-3 h-3" />
                      Plus+
                    </Badge>
                  </div>

                  <div className="grid md:grid-cols-3 gap-4">
                    {/* Child List */}
                    <div className="space-y-2">
                      <Label>Selecione o aluno:</Label>
                      {mockPlusChildren.map((child) => (
                        <div
                          key={child.id}
                          onClick={() => setSelectedEvalChild(child.id)}
                          className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                            selectedEvalChild === child.id ? "bg-purple-50 border-purple-300" : "hover:bg-muted/50"
                          }`}
                        >
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={child.photo} alt={child.name} />
                            <AvatarFallback className="bg-purple-100 text-purple-600">{child.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-sm">{child.name}</p>
                            <p className="text-xs text-muted-foreground capitalize">{child.class}</p>
                          </div>
                          <Badge variant="outline" className="ml-auto text-xs">Plus+</Badge>
                        </div>
                      ))}
                    </div>

                    {/* Evaluation Form */}
                    <div className="md:col-span-2">
                      {selectedEvalChild ? (
                        <Card>
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <Avatar className="h-10 w-10">
                                  <AvatarImage src={mockPlusChildren.find(c => c.id === selectedEvalChild)?.photo} />
                                  <AvatarFallback className="bg-purple-100 text-purple-600">
                                    {mockPlusChildren.find(c => c.id === selectedEvalChild)?.name.charAt(0)}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <CardTitle className="text-lg">
                                    {mockPlusChildren.find(c => c.id === selectedEvalChild)?.name}
                                  </CardTitle>
                                  <CardDescription>Avaliação Trimestral</CardDescription>
                                </div>
                              </div>
                              <Select value={String(selectedQuarter)} onValueChange={(v) => setSelectedQuarter(Number(v))}>
                                <SelectTrigger className="w-[150px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="1">1º Trimestre</SelectItem>
                                  <SelectItem value="2">2º Trimestre</SelectItem>
                                  <SelectItem value="3">3º Trimestre</SelectItem>
                                  <SelectItem value="4">4º Trimestre</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <Button
                              onClick={generateAllWithAI}
                              disabled={isGeneratingAI}
                              className="mt-3 w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                            >
                              {isGeneratingAI ? (
                                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Gerando com IA...</>
                              ) : (
                                <><Wand2 className="w-4 h-4 mr-2" />Preencher Tudo com IA</>
                              )}
                            </Button>
                          </CardHeader>
                          <CardContent>
                            <ScrollArea className="h-[400px] pr-4">
                              <div className="space-y-4">
                                {/* Cognitive */}
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <Label className="flex items-center gap-2"><Brain className="w-4 h-4 text-blue-500" />Desenvolvimento Cognitivo</Label>
                                    <Button variant="ghost" size="sm" onClick={() => generateWithAI("cognitive")} disabled={isGeneratingAI}>
                                      <Sparkles className="w-3 h-3 mr-1" />IA
                                    </Button>
                                  </div>
                                  <Textarea value={evaluation.cognitive} onChange={(e) => setEvaluation(prev => ({ ...prev, cognitive: e.target.value }))} rows={3} placeholder="Descreva o desenvolvimento cognitivo..." />
                                </div>

                                {/* Motor */}
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <Label className="flex items-center gap-2"><Target className="w-4 h-4 text-green-500" />Desenvolvimento Motor</Label>
                                    <Button variant="ghost" size="sm" onClick={() => generateWithAI("motor")} disabled={isGeneratingAI}>
                                      <Sparkles className="w-3 h-3 mr-1" />IA
                                    </Button>
                                  </div>
                                  <Textarea value={evaluation.motor} onChange={(e) => setEvaluation(prev => ({ ...prev, motor: e.target.value }))} rows={3} placeholder="Descreva o desenvolvimento motor..." />
                                </div>

                                {/* Social-Emotional */}
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <Label className="flex items-center gap-2"><Heart className="w-4 h-4 text-red-500" />Socioemocional</Label>
                                    <Button variant="ghost" size="sm" onClick={() => generateWithAI("socialEmotional")} disabled={isGeneratingAI}>
                                      <Sparkles className="w-3 h-3 mr-1" />IA
                                    </Button>
                                  </div>
                                  <Textarea value={evaluation.socialEmotional} onChange={(e) => setEvaluation(prev => ({ ...prev, socialEmotional: e.target.value }))} rows={3} placeholder="Descreva o desenvolvimento socioemocional..." />
                                </div>

                                {/* Language */}
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <Label className="flex items-center gap-2"><MessageSquare className="w-4 h-4 text-yellow-500" />Linguagem</Label>
                                    <Button variant="ghost" size="sm" onClick={() => generateWithAI("language")} disabled={isGeneratingAI}>
                                      <Sparkles className="w-3 h-3 mr-1" />IA
                                    </Button>
                                  </div>
                                  <Textarea value={evaluation.language} onChange={(e) => setEvaluation(prev => ({ ...prev, language: e.target.value }))} rows={3} placeholder="Descreva o desenvolvimento da linguagem..." />
                                </div>

                                {/* Creativity */}
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <Label className="flex items-center gap-2"><Palette className="w-4 h-4 text-purple-500" />Criatividade e Artes</Label>
                                    <Button variant="ghost" size="sm" onClick={() => generateWithAI("creativity")} disabled={isGeneratingAI}>
                                      <Sparkles className="w-3 h-3 mr-1" />IA
                                    </Button>
                                  </div>
                                  <Textarea value={evaluation.creativity} onChange={(e) => setEvaluation(prev => ({ ...prev, creativity: e.target.value }))} rows={3} placeholder="Descreva a criatividade e artes..." />
                                </div>

                                {/* Summary */}
                                <div className="space-y-2 pt-4 border-t">
                                  <div className="flex items-center justify-between">
                                    <Label className="flex items-center gap-2"><Star className="w-4 h-4 text-amber-500" />Resumo Geral</Label>
                                    <Button variant="ghost" size="sm" onClick={() => generateWithAI("summary")} disabled={isGeneratingAI}>
                                      <Sparkles className="w-3 h-3 mr-1" />IA
                                    </Button>
                                  </div>
                                  <Textarea value={evaluation.summary} onChange={(e) => setEvaluation(prev => ({ ...prev, summary: e.target.value }))} rows={3} placeholder="Resumo geral do desenvolvimento..." />
                                </div>

                                {/* Recommendations */}
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <Label className="flex items-center gap-2"><FileText className="w-4 h-4 text-blue-500" />Recomendações</Label>
                                    <Button variant="ghost" size="sm" onClick={() => generateWithAI("recommendations")} disabled={isGeneratingAI}>
                                      <Sparkles className="w-3 h-3 mr-1" />IA
                                    </Button>
                                  </div>
                                  <Textarea value={evaluation.recommendations} onChange={(e) => setEvaluation(prev => ({ ...prev, recommendations: e.target.value }))} rows={3} placeholder="Recomendações para casa..." />
                                </div>

                                {/* Next Steps */}
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <Label className="flex items-center gap-2"><ArrowRight className="w-4 h-4 text-green-500" />Próximos Passos</Label>
                                    <Button variant="ghost" size="sm" onClick={() => generateWithAI("nextSteps")} disabled={isGeneratingAI}>
                                      <Sparkles className="w-3 h-3 mr-1" />IA
                                    </Button>
                                  </div>
                                  <Textarea value={evaluation.nextSteps} onChange={(e) => setEvaluation(prev => ({ ...prev, nextSteps: e.target.value }))} rows={3} placeholder="Próximos passos para o trimestre..." />
                                </div>

                                <Button className="w-full bg-purple-600 hover:bg-purple-700">
                                  <Save className="w-4 h-4 mr-2" />
                                  Salvar Avaliação
                                </Button>
                              </div>
                            </ScrollArea>
                          </CardContent>
                        </Card>
                      ) : (
                        <div className="flex items-center justify-center h-[500px] border rounded-lg bg-muted/30">
                          <div className="text-center">
                            <GraduationCap className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                            <h4 className="font-semibold mb-1">Selecione um aluno</h4>
                            <p className="text-sm text-muted-foreground">Escolha um aluno Plus+ para criar a avaliação</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </TabsContent>

                {/* Chat com Pais Tab */}
                <TabsContent value="pais" className="mt-0">
                  <h3 className="font-semibold mb-4">Chat com Pais</h3>
                  <div className="grid md:grid-cols-3 gap-4 h-[400px]">
                    {/* Children List */}
                    <div className="md:col-span-1 space-y-2 overflow-y-auto">
                      <p className="text-sm text-muted-foreground mb-2">Selecione uma criança:</p>
                      {allChildren.map((child) => {
                        const unread = getUnreadCount(child.id);
                        return (
                          <div
                            key={child.id}
                            onClick={() => handleSelectChatChild(child.id)}
                            className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                              selectedChatChild === child.id ? "bg-primary/10 border-primary" : "hover:bg-muted/50"
                            }`}
                          >
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={child.photo} alt={child.name} />
                              <AvatarFallback className="bg-primary/10 text-primary text-xs">{child.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{child.name}</p>
                              {(chatMessages[child.id] || []).length > 0 && (
                                <p className="text-xs text-muted-foreground truncate">
                                  {(chatMessages[child.id] || []).slice(-1)[0]?.content}
                                </p>
                              )}
                            </div>
                            {unread > 0 && <Badge variant="destructive" className="h-5 px-1.5 text-xs">{unread}</Badge>}
                          </div>
                        );
                      })}
                    </div>

                    {/* Chat Area */}
                    <div className="md:col-span-2 border rounded-lg flex flex-col overflow-hidden">
                      {selectedChatChild ? (
                        <>
                          <div className="p-3 border-b bg-muted/30 flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={allChildren.find(c => c.id === selectedChatChild)?.photo} />
                              <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                {allChildren.find(c => c.id === selectedChatChild)?.name.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-sm">{allChildren.find(c => c.id === selectedChatChild)?.name}</p>
                              <p className="text-xs text-muted-foreground">Conversa com os pais</p>
                            </div>
                          </div>
                          <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            {(chatMessages[selectedChatChild] || []).length === 0 ? (
                              <div className="text-center text-muted-foreground py-8">
                                <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-30" />
                                <p className="text-sm">Nenhuma mensagem ainda</p>
                              </div>
                            ) : (
                              (chatMessages[selectedChatChild] || []).map((msg) => (
                                <div key={msg.id} className={`flex ${msg.isOwn ? "justify-end" : "justify-start"}`}>
                                  <div className={`max-w-[80%] rounded-lg px-3 py-2 ${msg.isOwn ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                                    {!msg.isOwn && <p className="text-xs font-medium mb-1 opacity-70">{msg.sender}</p>}
                                    <p className="text-sm">{msg.content}</p>
                                    <div className={`flex items-center gap-1 mt-1 ${msg.isOwn ? "justify-end" : ""}`}>
                                      <span className={`text-xs ${msg.isOwn ? "text-primary-foreground/70" : "text-muted-foreground"}`}>{msg.time}</span>
                                      {msg.isOwn && (
                                        <span className={msg.isRead ? "text-blue-400" : "text-primary-foreground/70"}>
                                          {msg.isRead ? <CheckCheck className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                          <div className="p-3 border-t bg-background">
                            <div className="flex gap-2">
                              <Input
                                placeholder="Digite sua mensagem..."
                                value={chatMessage}
                                onChange={(e) => setChatMessage(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handleSendParentMessage()}
                                className="flex-1"
                              />
                              <Button onClick={handleSendParentMessage} disabled={!chatMessage.trim()}>Enviar</Button>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="flex-1 flex items-center justify-center text-muted-foreground">
                          <div className="text-center">
                            <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-30" />
                            <h4 className="font-semibold mb-1">Selecione uma criança</h4>
                            <p className="text-sm">Escolha uma criança para ver as mensagens</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </TabsContent>

                {/* Chat Equipe Tab */}
                <TabsContent value="equipe" className="mt-0">
                  <h3 className="font-semibold mb-4">Chat da Equipe</h3>
                  <div className="space-y-4">
                    {/* Channel Selector */}
                    <div className="flex gap-2 flex-wrap">
                      <Button variant={selectedStaffChannel === "geral" ? "default" : "outline"} size="sm" onClick={() => handleStaffChannelChange("geral")}>
                        📢 Geral
                        {getStaffUnreadCount("geral") > 0 && <Badge variant="destructive" className="ml-2 h-5 px-1.5">{getStaffUnreadCount("geral")}</Badge>}
                      </Button>
                      <Button variant={selectedStaffChannel === "professoras" ? "default" : "outline"} size="sm" onClick={() => handleStaffChannelChange("professoras")}>
                        👩‍🏫 Professoras
                        {getStaffUnreadCount("professoras") > 0 && <Badge variant="destructive" className="ml-2 h-5 px-1.5">{getStaffUnreadCount("professoras")}</Badge>}
                      </Button>
                      <Button variant={selectedStaffChannel === "direcao" ? "default" : "outline"} size="sm" onClick={() => handleStaffChannelChange("direcao")}>
                        👔 Direção
                        {getStaffUnreadCount("direcao") > 0 && <Badge variant="destructive" className="ml-2 h-5 px-1.5">{getStaffUnreadCount("direcao")}</Badge>}
                      </Button>
                    </div>

                    {/* Messages */}
                    <ScrollArea className="h-[280px] border rounded-lg">
                      <div className="p-3 space-y-3">
                        {staffMessages[selectedStaffChannel]?.map((msg) => (
                          <div key={msg.id} className={`flex ${msg.isOwn ? "justify-end" : "justify-start"}`}>
                            <div className={`max-w-[80%] ${msg.isOwn ? "order-2" : ""}`}>
                              {!msg.isOwn && (
                                <div className="flex items-center gap-2 mb-1">
                                  <Avatar className="h-6 w-6">
                                    <AvatarFallback className="bg-primary/10 text-primary text-xs">{msg.sender.charAt(0)}</AvatarFallback>
                                  </Avatar>
                                  <span className="text-xs font-medium">{msg.sender}</span>
                                </div>
                              )}
                              <div className={`p-3 rounded-lg ${msg.isOwn ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                                <p className="text-sm">{msg.content}</p>
                              </div>
                              <div className={`flex items-center gap-1 mt-1 ${msg.isOwn ? "justify-end" : ""}`}>
                                <span className="text-[10px] text-muted-foreground">{msg.time}</span>
                                {msg.isOwn && (
                                  <span className={msg.isRead ? "text-blue-400" : "text-muted-foreground"}>
                                    {msg.isRead ? <CheckCheck className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>

                    {/* Input */}
                    <div className="flex gap-2">
                      <Input
                        placeholder="Digite sua mensagem para a equipe..."
                        value={staffChatMessage}
                        onChange={(e) => setStaffChatMessage(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSendStaffMessage()}
                        className="flex-1"
                      />
                      <Button onClick={handleSendStaffMessage} disabled={!staffChatMessage.trim()}>Enviar</Button>
                    </div>
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          </CardContent>
        </Card>

        {/* Mini Calendar + Quick Post Creator */}
        <div className="grid lg:grid-cols-2 gap-6 mt-6">
          <DemoMiniCalendar />
          <DemoQuickPostCreator userName="Pedagoga Lucia" userInitial="L" />
        </div>
      </main>
    </div>
  );
}
