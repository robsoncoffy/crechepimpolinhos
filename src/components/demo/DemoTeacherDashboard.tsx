import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Users,
  Baby,
  Calendar,
  MessageSquare,
  Home,
  Bell,
  LogOut,
  CheckCircle2,
  Clock,
  Utensils,
  Moon,
  Activity,
  Edit,
  Save,
  X,
  Droplets,
  Smile,
  FileText,
  Pill,
  Car,
  AlertTriangle,
  UserCheck,
  Sparkles,
  Loader2,
  RefreshCw,
  Check,
  CheckCheck,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import logo from "@/assets/logo-pimpolinhos.png";
import { DemoQuickPostCreator } from "./DemoQuickPostCreator";
import { DemoWeatherHeader } from "./DemoWeatherHeader";

// Mock children for the class with photos and pickup notifications
const mockChildren = [
  { id: "1", name: "Maria Silva", class: "maternal", hasRecord: true, photo: "https://images.unsplash.com/photo-1595074475609-81c60c568046?w=100&h=100&fit=crop&crop=face", pickupNotification: null },
  { id: "2", name: "João Pedro", class: "maternal", hasRecord: true, photo: "https://images.unsplash.com/photo-1503919545889-aef636e10ad4?w=100&h=100&fit=crop&crop=face", pickupNotification: { type: "on_way", message: "Mãe está a caminho", time: "16:45" } },
  { id: "3", name: "Ana Beatriz", class: "maternal", hasRecord: false, photo: "https://images.unsplash.com/photo-1519457431-44ccd64a579b?w=100&h=100&fit=crop&crop=face", pickupNotification: null },
  { id: "4", name: "Lucas Oliveira", class: "maternal", hasRecord: false, photo: "https://images.unsplash.com/photo-1596215143922-eedeaba0d91c?w=100&h=100&fit=crop&crop=face", pickupNotification: { type: "delay", message: "Vai atrasar 20 minutos", delayMinutes: 20, time: "16:30" } },
  { id: "5", name: "Sofia Santos", class: "maternal", hasRecord: true, photo: "https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=100&h=100&fit=crop&crop=face", pickupNotification: { type: "other_person", message: "Avó Maria irá buscar", personName: "Avó Maria", time: "16:50" } },
  { id: "6", name: "Miguel Costa", class: "maternal", hasRecord: false, photo: "https://images.unsplash.com/photo-1545558014-8692077e9b5c?w=100&h=100&fit=crop&crop=face", pickupNotification: null },
];

// Helper to get pickup notification badge info
const getPickupBadgeInfo = (notification: typeof mockChildren[0]["pickupNotification"]) => {
  if (!notification) return null;
  
  switch (notification.type) {
    case "on_way":
      return { icon: Car, label: "A caminho", color: "bg-blue-100 text-blue-700 border-blue-300" };
    case "delay":
      return { icon: Clock, label: `Atraso ${notification.delayMinutes}min`, color: "bg-amber-100 text-amber-700 border-amber-300" };
    case "other_person":
      return { icon: UserCheck, label: notification.personName || "Outra pessoa", color: "bg-purple-100 text-purple-700 border-purple-300" };
    default:
      return null;
  }
};

// Message interface with read status
interface DemoMessage {
  id: string;
  content: string;
  isOwn: boolean;
  time: string;
  sender: string;
  isRead: boolean;
}

// Staff chat channel type
type StaffChannel = "geral" | "professoras" | "cozinha";

// Initial staff messages
const initialStaffMessages: Record<StaffChannel, DemoMessage[]> = {
  geral: [
    { id: "s1", content: "Bom dia, equipe! Reunião pedagógica amanhã às 14h. Não esqueçam! 📋", sender: "Diretora Maria", isOwn: false, time: "08:30", isRead: false },
    { id: "s2", content: "Ok, estarei presente!", sender: "Prof. Ana", isOwn: true, time: "08:35", isRead: true },
    { id: "s3", content: "Confirmado! 👍", sender: "Nutricionista Carla", isOwn: false, time: "08:40", isRead: false },
  ],
  professoras: [
    { id: "p1", content: "Meninas, alguém tem tinta guache verde sobrando?", sender: "Prof. Maria Clara", isOwn: false, time: "09:15", isRead: false },
    { id: "p2", content: "Tenho sim! Pode pegar na minha sala", sender: "Prof. Ana", isOwn: true, time: "09:20", isRead: true },
    { id: "p3", content: "Obrigada! Vou passar lá no intervalo 😊", sender: "Prof. Maria Clara", isOwn: false, time: "09:22", isRead: true },
  ],
  cozinha: [
    { id: "c1", content: "Cardápio de hoje: frango grelhado com purê de batata 🍗", sender: "Cozinheira Rosa", isOwn: false, time: "07:00", isRead: true },
    { id: "c2", content: "A Sofia Santos tem restrição a glúten, lembrar de preparar opção separada!", sender: "Nutricionista Carla", isOwn: false, time: "07:10", isRead: true },
    { id: "c3", content: "Entendido! Já separei uma porção sem glúten", sender: "Cozinheira Rosa", isOwn: false, time: "07:15", isRead: true },
  ],
};

// Mock messages for parent chat with isRead status
const initialParentMessages: Record<string, DemoMessage[]> = {
  "1": [
    { id: "m1", content: "Bom dia, professora! A Maria tomou remédio hoje de manhã.", sender: "Mãe da Maria", isOwn: false, time: "08:15", isRead: true },
    { id: "m2", content: "Ok, obrigada por avisar! Vou ficar atenta.", sender: "Prof. Ana", isOwn: true, time: "08:20", isRead: true },
    { id: "m3", content: "Ela está mais animada hoje! ❤️", sender: "Prof. Ana", isOwn: true, time: "14:30", isRead: true },
  ],
  "2": [
    { id: "m4", content: "Professora, o João pode beber suco de laranja?", sender: "Pai do João", isOwn: false, time: "09:00", isRead: false },
    { id: "m5", content: "João está muito quieto hoje, está tudo bem em casa?", sender: "Pai do João", isOwn: false, time: "11:30", isRead: false },
  ],
  "3": [],
  "4": [
    { id: "m6", content: "Lucas vai precisar trocar a fralda com mais frequência hoje.", sender: "Mãe do Lucas", isOwn: false, time: "07:45", isRead: true },
    { id: "m7", content: "Entendido! Cuidarei disso. 👍", sender: "Prof. Ana", isOwn: true, time: "07:50", isRead: true },
  ],
  "5": [
    { id: "m8", content: "Sofia dormiu tarde ontem, pode ficar sonolenta.", sender: "Pai da Sofia", isOwn: false, time: "08:00", isRead: false },
  ],
  "6": [],
};

const mealOptions = [
  { value: "tudo", label: "Comeu tudo" },
  { value: "quase_tudo", label: "Quase tudo" },
  { value: "metade", label: "Metade" },
  { value: "pouco", label: "Pouco" },
  { value: "nao_aceitou", label: "Não aceitou" },
];

const evacuationOptions = [
  { value: "normal", label: "Normal" },
  { value: "pastosa", label: "Pastosa" },
  { value: "liquida", label: "Líquida" },
  { value: "nao", label: "Não evacuou" },
];

const moodOptions = [
  { value: "feliz", label: "😊 Feliz" },
  { value: "calmo", label: "😌 Calmo" },
  { value: "agitado", label: "😤 Agitado" },
  { value: "choroso", label: "😢 Choroso" },
  { value: "sonolento", label: "😴 Sonolento" },
];

// Demo Quick Reply Suggestions Component
function DemoQuickReplySuggestions({ 
  messages, 
  childName, 
  onSelect 
}: { 
  messages: Array<{ isOwn: boolean; content: string }>; 
  childName: string;
  onSelect: (suggestion: string) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [lastProcessedMessage, setLastProcessedMessage] = useState<string | null>(null);

  // Get last parent message
  const lastParentMessage = [...messages].reverse().find(m => !m.isOwn);
  const lastMessage = messages[messages.length - 1];
  const shouldShow = lastParentMessage && !lastMessage?.isOwn;
  
  const generateSuggestions = (content: string): string[] => {
    const lowerContent = content.toLowerCase();
    
    if (lowerContent.includes("suco") || lowerContent.includes("pode") || lowerContent.includes("laranja")) {
      return [
        `Sim, ${childName} pode tomar suco! 🍊`,
        `Vou verificar a ficha de alergias e confirmo!`,
        `Claro! Daremos suco natural para ele(a). 😊`,
      ];
    } else if (lowerContent.includes("quieto") || lowerContent.includes("bem") || lowerContent.includes("casa")) {
      return [
        `${childName} está bem! Só um pouco sonolento hoje. 😊`,
        `Vou ficar de olho e te atualizo mais tarde!`,
        `Está tudo bem! Ele(a) brincou normalmente. ❤️`,
      ];
    } else if (lowerContent.includes("remédio") || lowerContent.includes("medicamento")) {
      return [
        `Anotado! Vou ficar atenta ao horário. 💊`,
        `Obrigada por avisar! Cuidarei disso.`,
        `Tudo certo, vou acompanhar durante o dia.`,
      ];
    } else if (lowerContent.includes("fralda") || lowerContent.includes("trocar")) {
      return [
        `Entendido! Vou verificar com mais frequência. 👍`,
        `Pode deixar, cuidarei disso!`,
        `Ok! Ficarei atenta às trocas hoje.`,
      ];
    } else if (lowerContent.includes("dormiu") || lowerContent.includes("sono")) {
      return [
        `Vou deixar ${childName} descansar mais se precisar. 😴`,
        `Entendido! Vou observar e deixar sonequinha extra.`,
        `Ok! Se precisar de um cochilo, eu aviso. 💤`,
      ];
    } else {
      return [
        `Obrigada por avisar! Vou ficar atenta. 😊`,
        `Entendido! Qualquer coisa te aviso.`,
        `${childName} está ótimo(a) hoje! ❤️`,
      ];
    }
  };

  // Auto-fetch suggestions when last parent message changes
  useEffect(() => {
    if (!shouldShow || !lastParentMessage) {
      setSuggestions([]);
      return;
    }
    
    // Only fetch if the message changed
    if (lastParentMessage.content !== lastProcessedMessage) {
      setLoading(true);
      setSuggestions([]);
      
      // Simulate AI call delay
      const timer = setTimeout(() => {
        const newSuggestions = generateSuggestions(lastParentMessage.content);
        setSuggestions(newSuggestions);
        setLastProcessedMessage(lastParentMessage.content);
        setLoading(false);
      }, 800);
      
      return () => clearTimeout(timer);
    }
  }, [lastParentMessage?.content, shouldShow, childName]);

  const handleRefresh = () => {
    if (!lastParentMessage) return;
    setLoading(true);
    setSuggestions([]);
    
    setTimeout(() => {
      const newSuggestions = generateSuggestions(lastParentMessage.content);
      setSuggestions(newSuggestions);
      setLoading(false);
    }, 800);
  };

  if (!shouldShow) {
    return null;
  }

  return (
    <div className="px-3 py-2 border-t bg-muted/30">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="w-4 h-4 text-primary" />
        <span className="text-xs font-medium text-muted-foreground">Sugestões de resposta</span>
        {!loading && suggestions.length > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            className="h-6 w-6 p-0 ml-auto"
          >
            <RefreshCw className="w-3 h-3" />
          </Button>
        )}
      </div>
      
      {loading ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground py-1">
          <Loader2 className="w-3 h-3 animate-spin" />
          Gerando sugestões...
        </div>
      ) : suggestions.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              type="button"
              onClick={() => {
                onSelect(suggestion);
                setSuggestions([]);
              }}
              className="text-xs px-3 py-1.5 bg-background border rounded-full hover:bg-accent transition-colors text-left"
            >
              {suggestion}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function DemoTeacherDashboard() {
  const [activeTab, setActiveTab] = useState("agenda");
  const [selectedChild, setSelectedChild] = useState<string | null>(null);
  const [selectedChatChild, setSelectedChatChild] = useState<string | null>(null);
  const [chatMessage, setChatMessage] = useState("");
  const [chatMessages, setChatMessages] = useState<Record<string, DemoMessage[]>>(initialParentMessages);
  const [editMode, setEditMode] = useState(false);
  const [tookMedicine, setTookMedicine] = useState(false);
  
  // Staff chat states
  const [selectedStaffChannel, setSelectedStaffChannel] = useState<StaffChannel>("geral");
  const [staffChatMessage, setStaffChatMessage] = useState("");
  const [staffMessages, setStaffMessages] = useState<Record<StaffChannel, DemoMessage[]>>(initialStaffMessages);

  // Mark messages as read when selecting a child
  const handleSelectChatChild = (childId: string) => {
    setSelectedChatChild(childId);
    // Mark all messages from that child as read
    setChatMessages((prev) => ({
      ...prev,
      [childId]: (prev[childId] || []).map((msg) => 
        msg.isOwn ? msg : { ...msg, isRead: true }
      ),
    }));
  };

  const handleSendMessage = () => {
    if (!chatMessage.trim() || !selectedChatChild) return;
    
    const newMessage: DemoMessage = {
      id: `new-${Date.now()}`,
      content: chatMessage,
      sender: "Prof. Ana",
      isOwn: true,
      time: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      isRead: false, // Will be marked as read when parent views
    };
    
    setChatMessages((prev) => ({
      ...prev,
      [selectedChatChild]: [...(prev[selectedChatChild] || []), newMessage],
    }));
    setChatMessage("");
  };

  // Count only unread messages (not own and not read)
  const getUnreadCount = (childId: string) => {
    return (chatMessages[childId] || []).filter((m) => !m.isOwn && !m.isRead).length;
  };

  // Staff chat functions
  const handleStaffChannelChange = (channel: StaffChannel) => {
    setSelectedStaffChannel(channel);
    // Mark all messages in that channel as read
    setStaffMessages((prev) => ({
      ...prev,
      [channel]: prev[channel].map((msg) => 
        msg.isOwn ? msg : { ...msg, isRead: true }
      ),
    }));
  };

  const handleSendStaffMessage = () => {
    if (!staffChatMessage.trim()) return;
    
    const newMessage: DemoMessage = {
      id: `staff-${Date.now()}`,
      content: staffChatMessage,
      sender: "Prof. Ana",
      isOwn: true,
      time: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      isRead: false,
    };
    
    setStaffMessages((prev) => ({
      ...prev,
      [selectedStaffChannel]: [...prev[selectedStaffChannel], newMessage],
    }));
    setStaffChatMessage("");
    
    // Simulate read receipt after 2 seconds
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

  const completedCount = mockChildren.filter((c) => c.hasRecord).length;
  const totalCount = mockChildren.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-pimpo-green-light/20 to-background relative">
      {/* Header */}
      <header className="bg-card/80 backdrop-blur-sm shadow-sm sticky top-0 z-40 border-b">
        <div className="container py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img src={logo} alt="Creche Pimpolinhos" className="h-10" />
            <span className="font-fredoka text-lg font-bold hidden sm:inline">
              Portal do Professor
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-pimpo-green text-white font-semibold">
                  P
                </AvatarFallback>
              </Avatar>
              <span>Prof. Ana (Demo)</span>
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
        {/* Header with Weather */}
        <div className="flex flex-col lg:flex-row lg:items-start gap-4 mb-6">
          <div className="shrink-0">
            <h1 className="font-fredoka text-2xl sm:text-3xl font-bold">
              Olá, Professora Ana! 👋
            </h1>
            <p className="text-muted-foreground">
              Turma Maternal • {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
            </p>
          </div>
          
          {/* Weather Widget */}
          <div className="flex-1 min-w-0">
            <DemoWeatherHeader />
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <Card>
            <CardContent className="p-4 text-center">
              <Baby className="w-5 h-5 mx-auto text-primary mb-1" />
              <p className="text-2xl font-fredoka font-bold">{totalCount}</p>
              <p className="text-xs text-muted-foreground">Alunos</p>
            </CardContent>
          </Card>
          <Card className="bg-pimpo-green/10">
            <CardContent className="p-4 text-center">
              <CheckCircle2 className="w-5 h-5 mx-auto text-pimpo-green mb-1" />
              <p className="text-2xl font-fredoka font-bold text-pimpo-green">{completedCount}</p>
              <p className="text-xs text-muted-foreground">Agendas prontas</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Clock className="w-5 h-5 mx-auto text-pimpo-yellow mb-1" />
              <p className="text-2xl font-fredoka font-bold">{totalCount - completedCount}</p>
              <p className="text-xs text-muted-foreground">Pendentes</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <MessageSquare className="w-5 h-5 mx-auto text-pimpo-blue mb-1" />
              <p className="text-2xl font-fredoka font-bold">3</p>
              <p className="text-xs text-muted-foreground">Mensagens</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Tabs */}
        <Card className="shadow-lg">
          <CardContent className="p-0">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <div className="border-b bg-muted/30">
                <TabsList className="w-full h-auto p-0 bg-transparent rounded-none grid grid-cols-5">
                  <TabsTrigger value="agenda" className="rounded-none border-b-2 border-transparent data-[state=active]:border-pimpo-green data-[state=active]:bg-transparent py-3 gap-2">
                    <Calendar className="w-4 h-4" />
                    <span className="hidden sm:inline">Agenda</span>
                  </TabsTrigger>
                  <TabsTrigger value="chamada" className="rounded-none border-b-2 border-transparent data-[state=active]:border-pimpo-green data-[state=active]:bg-transparent py-3 gap-2">
                    <Users className="w-4 h-4" />
                    <span className="hidden sm:inline">Turma</span>
                  </TabsTrigger>
                  <TabsTrigger value="pais" className="rounded-none border-b-2 border-transparent data-[state=active]:border-pimpo-green data-[state=active]:bg-transparent py-3 gap-2 relative">
                    <MessageSquare className="w-4 h-4" />
                    <span className="hidden sm:inline">Pais</span>
                    <Badge variant="destructive" className="absolute -top-1 right-2 sm:relative sm:top-0 sm:right-0 h-5 px-1.5">
                      3
                    </Badge>
                  </TabsTrigger>
                  <TabsTrigger value="alergias" className="rounded-none border-b-2 border-transparent data-[state=active]:border-pimpo-green data-[state=active]:bg-transparent py-3 gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="hidden sm:inline">Alergias</span>
                  </TabsTrigger>
                  <TabsTrigger value="equipe" className="rounded-none border-b-2 border-transparent data-[state=active]:border-pimpo-green data-[state=active]:bg-transparent py-3 gap-2">
                    <Users className="w-4 h-4" />
                    <span className="hidden sm:inline">Equipe</span>
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className="p-4">
                {/* Agenda Tab */}
                <TabsContent value="agenda" className="mt-0">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold">Agenda Digital</h3>
                    <Badge variant="outline">
                      {completedCount}/{totalCount} preenchidas
                    </Badge>
                  </div>

                  {/* Children List */}
                  <div className="space-y-2 mb-4">
                    {mockChildren.map((child) => {
                      const pickupBadge = getPickupBadgeInfo(child.pickupNotification);
                      
                      return (
                        <div
                          key={child.id}
                          onClick={() => setSelectedChild(child.id === selectedChild ? null : child.id)}
                          className={`p-3 rounded-lg border cursor-pointer transition-all ${
                            selectedChild === child.id 
                              ? "bg-pimpo-green/10 border-pimpo-green" 
                              : child.pickupNotification 
                                ? "bg-gradient-to-r from-background to-blue-50/50 border-blue-200"
                                : "hover:bg-muted/50"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="relative">
                                <Avatar className="h-10 w-10 ring-2 ring-primary/20">
                                  <AvatarImage src={child.photo} alt={child.name} className="object-cover" />
                                  <AvatarFallback className="bg-primary/10 text-primary text-sm">
                                    {child.name.charAt(0)}
                                  </AvatarFallback>
                                </Avatar>
                                {child.pickupNotification && (
                                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center animate-pulse">
                                    <Bell className="w-2.5 h-2.5 text-white" />
                                  </span>
                                )}
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className="font-medium truncate">{child.name}</span>
                                {pickupBadge && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border w-fit ${pickupBadge.color}`}>
                                        <pickupBadge.icon className="w-3 h-3" />
                                        {pickupBadge.label}
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p className="font-medium">{child.pickupNotification?.message}</p>
                                      <p className="text-xs text-muted-foreground">Notificado às {child.pickupNotification?.time}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {child.hasRecord ? (
                                <Badge variant="secondary" className="bg-pimpo-green/20 text-pimpo-green">
                                  <CheckCircle2 className="w-3 h-3 mr-1" />
                                  <span className="hidden sm:inline">Preenchida</span>
                                </Badge>
                              ) : (
                                <Badge variant="outline">Pendente</Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Selected Child Form */}
                  {selectedChild && (
                    <Card className="border-2 border-pimpo-green/50 mt-4">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">
                            Registro de {mockChildren.find(c => c.id === selectedChild)?.name}
                          </CardTitle>
                          <div className="flex gap-2">
                            {editMode ? (
                              <>
                                <Button size="sm" variant="outline" onClick={() => setEditMode(false)}>
                                  <X className="w-4 h-4 mr-1" />
                                  Cancelar
                                </Button>
                                <Button size="sm" onClick={() => setEditMode(false)}>
                                  <Save className="w-4 h-4 mr-1" />
                                  Salvar
                                </Button>
                              </>
                            ) : (
                              <Button size="sm" variant="outline" onClick={() => setEditMode(true)}>
                                <Edit className="w-4 h-4 mr-1" />
                                Editar
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Meals */}
                        <div>
                          <h4 className="font-medium flex items-center gap-2 mb-3">
                            <Utensils className="w-4 h-4 text-pimpo-green" />
                            Refeições
                          </h4>
                          <div className="grid sm:grid-cols-2 gap-3">
                            {["Café da manhã", "Almoço", "Lanche", "Jantar"].map((meal) => (
                              <div key={meal} className="space-y-1">
                                <label className="text-sm text-muted-foreground">{meal}</label>
                                <Select defaultValue="tudo" disabled={!editMode}>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {mealOptions.map((opt) => (
                                      <SelectItem key={opt.value} value={opt.value}>
                                        {opt.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Sleep */}
                        <div>
                          <h4 className="font-medium flex items-center gap-2 mb-3">
                            <Moon className="w-4 h-4 text-pimpo-blue" />
                            Sono
                          </h4>
                          <div className="flex gap-4">
                            <div className="flex items-center gap-2">
                              <Checkbox id="sleep-morning" disabled={!editMode} />
                              <label htmlFor="sleep-morning" className="text-sm">Dormiu pela manhã</label>
                            </div>
                            <div className="flex items-center gap-2">
                              <Checkbox id="sleep-afternoon" disabled={!editMode} defaultChecked />
                              <label htmlFor="sleep-afternoon" className="text-sm">Dormiu à tarde</label>
                            </div>
                          </div>
                        </div>

                        {/* Hygiene */}
                        <div>
                          <h4 className="font-medium flex items-center gap-2 mb-3">
                            <Droplets className="w-4 h-4 text-pimpo-blue" />
                            Higiene
                          </h4>
                          <div className="grid sm:grid-cols-2 gap-3">
                            <div className="flex items-center gap-2">
                              <Checkbox id="urinated" disabled={!editMode} defaultChecked />
                              <label htmlFor="urinated" className="text-sm">Fez xixi</label>
                            </div>
                            <div className="space-y-1">
                              <label className="text-sm text-muted-foreground">Qtd. Evacuações</label>
                              <Select defaultValue="1" disabled={!editMode}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {[0, 1, 2, 3, 4, 5].map((count) => (
                                    <SelectItem key={count} value={count.toString()}>
                                      {count === 0 ? "Não evacuou" : count === 1 ? "1 vez" : `${count} vezes`}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1">
                              <label className="text-sm text-muted-foreground">Tipo Evacuação</label>
                              <Select defaultValue="normal" disabled={!editMode}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {evacuationOptions.map((opt) => (
                                    <SelectItem key={opt.value} value={opt.value}>
                                      {opt.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </div>

                        {/* Health */}
                        <div>
                          <h4 className="font-medium flex items-center gap-2 mb-3">
                            <Activity className="w-4 h-4 text-pimpo-red" />
                            Saúde
                          </h4>
                          <div className="space-y-3">
                            <div className="flex flex-wrap gap-4">
                              <div className="flex items-center gap-2">
                                <Checkbox id="fever" disabled={!editMode} />
                                <label htmlFor="fever" className="text-sm">Teve febre</label>
                              </div>
                              <div className="flex items-center gap-2">
                                <Checkbox 
                                  id="medicine" 
                                  disabled={!editMode} 
                                  checked={tookMedicine}
                                  onCheckedChange={(checked) => setTookMedicine(checked === true)}
                                />
                                <label htmlFor="medicine" className="text-sm">Tomou remédio</label>
                              </div>
                            </div>
                            {tookMedicine && (
                              <div className="space-y-1">
                                <label className="text-sm text-muted-foreground flex items-center gap-1">
                                  <Pill className="w-3 h-3" />
                                  Descrição do remédio
                                </label>
                                <Input 
                                  placeholder="Ex: Dipirona 10ml às 10h, Paracetamol 5ml às 14h..."
                                  disabled={!editMode}
                                  className="max-w-md"
                                />
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Mood */}
                        <div>
                          <h4 className="font-medium flex items-center gap-2 mb-3">
                            <Smile className="w-4 h-4 text-pimpo-yellow" />
                            Humor do Dia
                          </h4>
                          <Select defaultValue="feliz" disabled={!editMode}>
                            <SelectTrigger className="w-full sm:w-64">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {moodOptions.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* School Note */}
                        <div>
                          <h4 className="font-medium flex items-center gap-2 mb-3">
                            <FileText className="w-4 h-4 text-pimpo-green" />
                            Bilhetinho da Escola
                          </h4>
                          <Textarea 
                            placeholder="Como foi o dia da criança? Escreva um recadinho para os pais..."
                            className="min-h-[100px]"
                            disabled={!editMode}
                            defaultValue="Hoje a Maria participou das atividades de pintura com muita animação! Brincou bastante no parquinho e interagiu muito bem com os coleguinhas. Um dia muito especial! 🎨"
                          />
                        </div>

                        {/* End Day Button */}
                        <div className="pt-4 border-t">
                          <Button 
                            className="w-full bg-pimpo-green hover:bg-pimpo-green/90 text-white gap-2"
                            size="lg"
                            onClick={() => {
                              setEditMode(false);
                              alert('Dia encerrado! O bilhetinho foi enviado para os pais.');
                            }}
                          >
                            <CheckCircle2 className="w-5 h-5" />
                            Encerrar o Dia
                          </Button>
                          <p className="text-xs text-muted-foreground text-center mt-2">
                            Ao encerrar, o bilhetinho será enviado automaticamente para os pais
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                {/* Chamada Tab */}
                <TabsContent value="chamada" className="mt-0">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold">Chamada do Dia</h3>
                    <Badge variant="outline">{totalCount} alunos</Badge>
                  </div>
                  <div className="space-y-2">
                    {mockChildren.map((child, i) => (
                      <div key={child.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-primary/10 text-primary text-sm">
                              {child.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{child.name}</span>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant={i % 3 !== 2 ? "default" : "outline"} className={i % 3 !== 2 ? "bg-pimpo-green hover:bg-pimpo-green/90" : ""}>
                            Presente
                          </Button>
                          <Button size="sm" variant={i % 3 === 2 ? "destructive" : "outline"}>
                            Falta
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>

                {/* Chat com Pais Tab */}
                <TabsContent value="pais" className="mt-0">
                  <h3 className="font-semibold mb-4">Chat com Pais</h3>
                  <div className="grid md:grid-cols-3 gap-4 h-[400px]">
                    {/* Children List */}
                    <div className="md:col-span-1 space-y-2 overflow-y-auto">
                      <p className="text-sm text-muted-foreground mb-2">Selecione uma criança:</p>
                      {mockChildren.map((child) => {
                        const unread = getUnreadCount(child.id);
                        return (
                          <div
                            key={child.id}
                            onClick={() => handleSelectChatChild(child.id)}
                            className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                              selectedChatChild === child.id 
                                ? "bg-primary/10 border-primary" 
                                : "hover:bg-muted/50"
                            }`}
                          >
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={child.photo} alt={child.name} />
                              <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                {child.name.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{child.name}</p>
                              {(chatMessages[child.id] || []).length > 0 && (
                                <p className="text-xs text-muted-foreground truncate">
                                  {(chatMessages[child.id] || []).slice(-1)[0]?.content}
                                </p>
                              )}
                            </div>
                            {unread > 0 && (
                              <Badge variant="destructive" className="h-5 px-1.5 text-xs">{unread}</Badge>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    
                    {/* Chat Area */}
                    <div className="md:col-span-2 border rounded-lg flex flex-col overflow-hidden">
                      {selectedChatChild ? (
                        <>
                          {/* Chat Header */}
                          <div className="p-3 border-b bg-muted/30 flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={mockChildren.find(c => c.id === selectedChatChild)?.photo} />
                              <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                {mockChildren.find(c => c.id === selectedChatChild)?.name.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-sm">{mockChildren.find(c => c.id === selectedChatChild)?.name}</p>
                              <p className="text-xs text-muted-foreground">Conversa com os pais</p>
                            </div>
                          </div>
                          
                          {/* Messages */}
                          <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            {(chatMessages[selectedChatChild] || []).length === 0 ? (
                              <div className="text-center text-muted-foreground py-8">
                                <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-30" />
                                <p className="text-sm">Nenhuma mensagem ainda</p>
                              </div>
                            ) : (
                              (chatMessages[selectedChatChild] || []).map((msg) => (
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
                                      <p className="text-xs font-medium mb-1 opacity-70">{msg.sender}</p>
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
                              ))
                            )}
                          </div>
                          
                          {/* AI Quick Suggestions */}
                          <DemoQuickReplySuggestions
                            messages={chatMessages[selectedChatChild] || []}
                            childName={mockChildren.find(c => c.id === selectedChatChild)?.name.split(" ")[0] || ""}
                            onSelect={(suggestion) => {
                              setChatMessage("");
                              const newMessage: DemoMessage = {
                                id: `new-${Date.now()}`,
                                content: suggestion,
                                sender: "Prof. Ana",
                                isOwn: true,
                                time: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
                                isRead: false,
                              };
                              setChatMessages((prev) => ({
                                ...prev,
                                [selectedChatChild]: [...(prev[selectedChatChild] || []), newMessage],
                              }));
                            }}
                          />
                          
                          {/* Input */}
                          <div className="p-3 border-t bg-background">
                            <div className="flex gap-2">
                              <Input
                                placeholder="Digite sua mensagem..."
                                value={chatMessage}
                                onChange={(e) => setChatMessage(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                                className="flex-1"
                              />
                              <Button onClick={handleSendMessage} disabled={!chatMessage.trim()}>
                                Enviar
                              </Button>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="flex-1 flex items-center justify-center text-muted-foreground">
                          <div className="text-center">
                            <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-30" />
                            <h4 className="font-semibold mb-1">Selecione uma criança</h4>
                            <p className="text-sm">Escolha uma criança para ver as mensagens dos pais</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </TabsContent>

                {/* Alergias Tab */}
                <TabsContent value="alergias" className="mt-0">
                  <h3 className="font-semibold flex items-center gap-2 mb-4">
                    <AlertTriangle className="w-5 h-5 text-destructive" />
                    Alergias e Restrições Alimentares
                  </h3>
                  <div className="grid sm:grid-cols-2 gap-4">
                    {[
                      { name: "Lucas Oliveira", allergies: "Amendoim, Leite", restrictions: "Sem glúten" },
                      { name: "Sofia Santos", allergies: "Frutos do mar", restrictions: null },
                    ].map((child, i) => (
                      <Card key={i} className="border-destructive/30 bg-destructive/5">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="bg-destructive/10 text-destructive">
                                {child.name.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            {child.name}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          <div>
                            <p className="text-xs font-medium text-destructive">Alergias:</p>
                            <p className="text-sm">{child.allergies}</p>
                          </div>
                          {child.restrictions && (
                            <div>
                              <p className="text-xs font-medium text-amber-600">Restrições:</p>
                              <p className="text-sm">{child.restrictions}</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>

                {/* Chat Equipe Tab */}
                <TabsContent value="equipe" className="mt-0">
                  <h3 className="font-semibold mb-4">Chat da Equipe</h3>
                  <div className="space-y-4">
                    {/* Channel Selector */}
                    <div className="flex gap-2 flex-wrap">
                      <Button 
                        variant={selectedStaffChannel === "geral" ? "default" : "outline"} 
                        size="sm"
                        onClick={() => handleStaffChannelChange("geral")}
                      >
                        📢 Geral
                        {getStaffUnreadCount("geral") > 0 && (
                          <Badge variant="destructive" className="ml-2 h-5 px-1.5">
                            {getStaffUnreadCount("geral")}
                          </Badge>
                        )}
                      </Button>
                      <Button 
                        variant={selectedStaffChannel === "professoras" ? "default" : "outline"} 
                        size="sm"
                        onClick={() => handleStaffChannelChange("professoras")}
                      >
                        👩‍🏫 Professoras
                        {getStaffUnreadCount("professoras") > 0 && (
                          <Badge variant="destructive" className="ml-2 h-5 px-1.5">
                            {getStaffUnreadCount("professoras")}
                          </Badge>
                        )}
                      </Button>
                      <Button 
                        variant={selectedStaffChannel === "cozinha" ? "default" : "outline"} 
                        size="sm"
                        onClick={() => handleStaffChannelChange("cozinha")}
                      >
                        🍽️ Cozinha
                        {getStaffUnreadCount("cozinha") > 0 && (
                          <Badge variant="destructive" className="ml-2 h-5 px-1.5">
                            {getStaffUnreadCount("cozinha")}
                          </Badge>
                        )}
                      </Button>
                    </div>

                    {/* Messages */}
                    <ScrollArea className="h-[280px] border rounded-lg">
                      <div className="p-3 space-y-3">
                        {staffMessages[selectedStaffChannel]?.map((msg) => (
                          <div 
                            key={msg.id} 
                            className={`flex ${msg.isOwn ? "justify-end" : "justify-start"}`}
                          >
                            <div className={`max-w-[80%] ${msg.isOwn ? "order-2" : ""}`}>
                              {!msg.isOwn && (
                                <div className="flex items-center gap-2 mb-1">
                                  <Avatar className="h-6 w-6">
                                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                      {msg.sender.charAt(0)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="text-xs font-medium">{msg.sender}</span>
                                </div>
                              )}
                              <div className={`p-3 rounded-lg ${
                                msg.isOwn 
                                  ? "bg-primary text-primary-foreground" 
                                  : "bg-muted"
                              }`}>
                                <p className="text-sm">{msg.content}</p>
                              </div>
                              <div className={`flex items-center gap-1 mt-1 ${msg.isOwn ? "justify-end" : ""}`}>
                                <span className="text-[10px] text-muted-foreground">{msg.time}</span>
                                {msg.isOwn && (
                                  <span className={msg.isRead ? "text-pimpo-blue" : "text-muted-foreground"}>
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
                      <Button onClick={handleSendStaffMessage} disabled={!staffChatMessage.trim()}>
                        Enviar
                      </Button>
                    </div>
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          </CardContent>
        </Card>

        {/* Quick Post Creator */}
        <DemoQuickPostCreator userName="Prof. Ana" userInitial="P" defaultClassType="maternal" />
      </main>
    </div>
  );
}
