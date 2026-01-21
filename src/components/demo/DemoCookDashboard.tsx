import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  UtensilsCrossed,
  Home,
  Bell,
  AlertTriangle,
  Baby,
  Milk,
  Search,
  Coffee,
  Cookie,
  Apple,
  Moon as MoonIcon,
  Salad,
  CheckCircle2,
  Clock,
  MessageSquare,
  Check,
  CheckCheck,
} from "lucide-react";
import logo from "@/assets/logo-pimpolinhos.png";
import { DemoMiniCalendar } from "./DemoMiniCalendar";

// Staff chat message interface
interface DemoMessage {
  id: string;
  content: string;
  isOwn: boolean;
  time: string;
  sender: string;
  isRead: boolean;
}

// Staff chat channel type
type StaffChannel = "geral" | "cozinha" | "direcao";

// Initial staff messages
const initialStaffMessages: Record<StaffChannel, DemoMessage[]> = {
  geral: [
    { id: "s1", content: "Bom dia, equipe! Lembrem-se do cardápio especial hoje! 🍳", sender: "Diretora Maria", isOwn: false, time: "07:30", isRead: true },
    { id: "s2", content: "Bom dia! Já estou preparando tudo!", sender: "Cozinheira Maria", isOwn: true, time: "07:35", isRead: true },
  ],
  cozinha: [
    { id: "c1", content: "Maria, temos leite Aptamil suficiente para hoje?", sender: "Nutricionista Paula", isOwn: false, time: "08:00", isRead: false },
    { id: "c2", content: "Sim! Chegou a entrega ontem, estamos abastecidos 👍", sender: "Cozinheira Maria", isOwn: true, time: "08:05", isRead: true },
  ],
  direcao: [
    { id: "d1", content: "Maria, por favor anote: a Sofia não pode comer nada com glúten hoje.", sender: "Diretora Maria", isOwn: false, time: "09:00", isRead: false },
  ],
};

// Mock children with dietary info
const mockChildren = [
  { 
    id: "1", 
    name: "Maria Silva", 
    class: "maternal", 
    shift: "integral",
    allergies: "Amendoim, Nozes",
    specialMilk: null,
    dietaryRestrictions: null,
    meals: { breakfast: true, morningSnack: false, lunch: false, afternoonSnack: false, dinner: false }
  },
  { 
    id: "2", 
    name: "João Pedro", 
    class: "maternal", 
    shift: "integral",
    allergies: null,
    specialMilk: "Aptamil HA",
    dietaryRestrictions: "Intolerância à lactose",
    meals: { breakfast: true, morningSnack: true, lunch: false, afternoonSnack: false, dinner: false }
  },
  { 
    id: "3", 
    name: "Ana Beatriz", 
    class: "bercario", 
    shift: "manha",
    allergies: "Ovo",
    specialMilk: "NAN Supreme",
    dietaryRestrictions: null,
    meals: { breakfast: false, morningSnack: false, lunch: false, afternoonSnack: false, dinner: false }
  },
  { 
    id: "4", 
    name: "Lucas Oliveira", 
    class: "jardim", 
    shift: "tarde",
    allergies: null,
    specialMilk: null,
    dietaryRestrictions: "Vegetariano",
    meals: { breakfast: false, morningSnack: false, lunch: false, afternoonSnack: false, dinner: false }
  },
  { 
    id: "5", 
    name: "Sofia Santos", 
    class: "maternal", 
    shift: "integral",
    allergies: "Glúten, Leite",
    specialMilk: "Leite de Aveia",
    dietaryRestrictions: "Celíaca",
    meals: { breakfast: true, morningSnack: true, lunch: true, afternoonSnack: false, dinner: false }
  },
  { 
    id: "6", 
    name: "Miguel Costa", 
    class: "bercario", 
    shift: "integral",
    allergies: null,
    specialMilk: "Enfamil Gentlease",
    dietaryRestrictions: null,
    meals: { breakfast: true, morningSnack: false, lunch: false, afternoonSnack: false, dinner: false }
  },
];

const mealTypes = [
  { key: "breakfast", label: "Café da Manhã", icon: Coffee, time: "07:30" },
  { key: "morningSnack", label: "Lanche Manhã", icon: Cookie, time: "09:30" },
  { key: "lunch", label: "Almoço", icon: Salad, time: "11:30" },
  { key: "afternoonSnack", label: "Lanche Tarde", icon: Apple, time: "15:00" },
  { key: "dinner", label: "Jantar", icon: MoonIcon, time: "17:30" },
];

const classLabels: Record<string, string> = {
  bercario: "Berçário",
  maternal: "Maternal",
  jardim: "Jardim",
};

export function DemoCookDashboard() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("refeicoes");
  const [children, setChildren] = useState(mockChildren);
  const [selectedClass, setSelectedClass] = useState<string | null>(null);

  // Staff chat states
  const [selectedStaffChannel, setSelectedStaffChannel] = useState<StaffChannel>("geral");
  const [staffChatMessage, setStaffChatMessage] = useState("");
  const [staffMessages, setStaffMessages] = useState<Record<StaffChannel, DemoMessage[]>>(initialStaffMessages);

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
      sender: "Cozinheira Maria",
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

  const filteredChildren = children.filter((child) => {
    const matchesSearch = child.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesClass = !selectedClass || child.class === selectedClass;
    return matchesSearch && matchesClass;
  });

  const childrenWithAllergies = children.filter(c => c.allergies);
  const childrenWithSpecialMilk = children.filter(c => c.specialMilk);
  const childrenWithRestrictions = children.filter(c => c.dietaryRestrictions);

  const toggleMeal = (childId: string, mealKey: string) => {
    setChildren(prev => prev.map(child => {
      if (child.id === childId) {
        return {
          ...child,
          meals: {
            ...child.meals,
            [mealKey]: !child.meals[mealKey as keyof typeof child.meals]
          }
        };
      }
      return child;
    }));
  };

  const getCurrentMeal = () => {
    const now = new Date();
    const hour = now.getHours();
    if (hour < 9) return "breakfast";
    if (hour < 11) return "morningSnack";
    if (hour < 14) return "lunch";
    if (hour < 16) return "afternoonSnack";
    return "dinner";
  };

  const currentMeal = getCurrentMeal();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-orange-50/30 to-background relative">
      {/* Header */}
      <header className="bg-card/80 backdrop-blur-sm shadow-sm sticky top-0 z-40 border-b">
        <div className="container py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img src={logo} alt="Creche Pimpolinhos" className="h-10" />
            <span className="font-fredoka text-lg font-bold hidden sm:inline">
              Cozinha
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-orange-500 text-white font-semibold">
                  C
                </AvatarFallback>
              </Avatar>
              <span>Cozinheira Maria (Demo)</span>
            </div>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="w-5 h-5" />
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
          <h1 className="font-fredoka text-2xl sm:text-3xl font-bold">
            Painel da Cozinha 🍳
          </h1>
          <p className="text-muted-foreground">
            {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <Card className="border-l-4 border-l-orange-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-orange-500" />
                <div>
                  <p className="text-2xl font-fredoka font-bold">{childrenWithAllergies.length}</p>
                  <p className="text-xs text-muted-foreground">Com Alergias</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-pimpo-blue">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Milk className="w-5 h-5 text-pimpo-blue" />
                <div>
                  <p className="text-2xl font-fredoka font-bold">{childrenWithSpecialMilk.length}</p>
                  <p className="text-xs text-muted-foreground">Leite Especial</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-pimpo-green">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <UtensilsCrossed className="w-5 h-5 text-pimpo-green" />
                <div>
                  <p className="text-2xl font-fredoka font-bold">{childrenWithRestrictions.length}</p>
                  <p className="text-xs text-muted-foreground">Dietas Especiais</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-primary">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Baby className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-2xl font-fredoka font-bold">{children.length}</p>
                  <p className="text-xs text-muted-foreground">Total Crianças</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Tabs */}
        <Card className="shadow-lg">
          <CardContent className="p-0">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <div className="border-b bg-muted/30">
                <TabsList className="w-full h-auto p-0 bg-transparent rounded-none grid grid-cols-4">
                  <TabsTrigger value="refeicoes" className="rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500 data-[state=active]:bg-transparent py-3 gap-2">
                    <UtensilsCrossed className="w-4 h-4" />
                    <span className="hidden sm:inline">Refeições</span>
                    <span className="sm:hidden">Refeições</span>
                  </TabsTrigger>
                  <TabsTrigger value="alergias" className="rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500 data-[state=active]:bg-transparent py-3 gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="hidden sm:inline">Alergias</span>
                    <span className="sm:hidden">Alergias</span>
                  </TabsTrigger>
                  <TabsTrigger value="leites" className="rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500 data-[state=active]:bg-transparent py-3 gap-2">
                    <Milk className="w-4 h-4" />
                    <span className="hidden sm:inline">Leites</span>
                    <span className="sm:hidden">Leites</span>
                  </TabsTrigger>
                  <TabsTrigger value="equipe" className="rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500 data-[state=active]:bg-transparent py-3 gap-2">
                    <MessageSquare className="w-4 h-4" />
                    <span className="hidden sm:inline">Equipe</span>
                    <span className="sm:hidden">Chat</span>
                    {(getStaffUnreadCount("geral") + getStaffUnreadCount("cozinha") + getStaffUnreadCount("direcao")) > 0 && (
                      <Badge variant="destructive" className="h-4 min-w-[1rem] px-1 text-[10px]">
                        {getStaffUnreadCount("geral") + getStaffUnreadCount("cozinha") + getStaffUnreadCount("direcao")}
                      </Badge>
                    )}
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className="p-4">
                {/* Meal Tracking Tab */}
                <TabsContent value="refeicoes" className="mt-0">
                  <div className="flex flex-col sm:flex-row gap-3 mb-4">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar criança..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant={selectedClass === null ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedClass(null)}
                      >
                        Todas
                      </Button>
                      {["bercario", "maternal", "jardim"].map((cls) => (
                        <Button
                          key={cls}
                          variant={selectedClass === cls ? "default" : "outline"}
                          size="sm"
                          onClick={() => setSelectedClass(cls)}
                        >
                          {classLabels[cls]}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Current Meal Indicator */}
                  <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-orange-500" />
                      <span className="font-medium text-orange-700">
                        Refeição atual: {mealTypes.find(m => m.key === currentMeal)?.label}
                      </span>
                    </div>
                  </div>

                  <ScrollArea className="h-[400px]">
                    <div className="space-y-2">
                      {filteredChildren.map((child) => (
                        <div
                          key={child.id}
                          className={`p-3 rounded-lg border ${
                            child.allergies || child.dietaryRestrictions
                              ? "bg-orange-50/50 border-orange-200"
                              : "bg-muted/30"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback className="bg-primary/10 text-primary text-sm">
                                  {child.name.charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <span className="font-medium">{child.name}</span>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <Badge variant="outline" className="text-xs">
                                    {classLabels[child.class]}
                                  </Badge>
                                  {child.allergies && (
                                    <Badge variant="destructive" className="text-xs">
                                      <AlertTriangle className="w-3 h-3 mr-1" />
                                      Alergia
                                    </Badge>
                                  )}
                                  {child.specialMilk && (
                                    <Badge className="text-xs bg-pimpo-blue">
                                      <Milk className="w-3 h-3 mr-1" />
                                      Leite especial
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="grid grid-cols-5 gap-2">
                            {mealTypes.map((meal) => {
                              const MealIcon = meal.icon;
                              const isServed = child.meals[meal.key as keyof typeof child.meals];
                              const isCurrent = meal.key === currentMeal;
                              return (
                                <div
                                  key={meal.key}
                                  onClick={() => toggleMeal(child.id, meal.key)}
                                  className={`flex flex-col items-center p-2 rounded-lg cursor-pointer transition-all ${
                                    isServed
                                      ? "bg-pimpo-green/20 border-2 border-pimpo-green"
                                      : isCurrent
                                      ? "bg-orange-100 border-2 border-orange-300"
                                      : "bg-muted/50 border border-transparent hover:border-muted-foreground/20"
                                  }`}
                                >
                                  {isServed ? (
                                    <CheckCircle2 className="w-5 h-5 text-pimpo-green" />
                                  ) : (
                                    <MealIcon className={`w-5 h-5 ${isCurrent ? "text-orange-500" : "text-muted-foreground"}`} />
                                  )}
                                  <span className="text-[10px] mt-1 text-center">
                                    {meal.label.split(" ")[0]}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </TabsContent>

                {/* Allergies Tab */}
                <TabsContent value="alergias" className="mt-0">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-orange-500" />
                    Crianças com Alergias Alimentares
                  </h3>
                  <div className="space-y-3">
                    {childrenWithAllergies.map((child) => (
                      <Card key={child.id} className="border-l-4 border-l-orange-500">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10">
                                <AvatarFallback className="bg-orange-100 text-orange-700">
                                  {child.name.charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-semibold">{child.name}</p>
                                <Badge variant="outline" className="text-xs">
                                  {classLabels[child.class]}
                                </Badge>
                              </div>
                            </div>
                          </div>
                          <div className="mt-3 p-3 bg-orange-50 rounded-lg">
                            <p className="text-sm font-medium text-orange-700">⚠️ Alérgico(a) a:</p>
                            <p className="text-sm text-orange-900 font-semibold mt-1">
                              {child.allergies}
                            </p>
                          </div>
                          {child.dietaryRestrictions && (
                            <div className="mt-2 p-3 bg-yellow-50 rounded-lg">
                              <p className="text-sm font-medium text-yellow-700">📋 Restrição:</p>
                              <p className="text-sm text-yellow-900">{child.dietaryRestrictions}</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                    {childrenWithAllergies.length === 0 && (
                      <p className="text-center text-muted-foreground py-8">
                        Nenhuma criança com alergias registradas
                      </p>
                    )}
                  </div>
                </TabsContent>

                {/* Special Milk Tab */}
                <TabsContent value="leites" className="mt-0">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <Milk className="w-5 h-5 text-pimpo-blue" />
                    Crianças com Leite Especial
                  </h3>
                  <div className="space-y-3">
                    {childrenWithSpecialMilk.map((child) => (
                      <Card key={child.id} className="border-l-4 border-l-pimpo-blue">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10">
                                <AvatarFallback className="bg-pimpo-blue/20 text-pimpo-blue">
                                  {child.name.charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-semibold">{child.name}</p>
                                <Badge variant="outline" className="text-xs">
                                  {classLabels[child.class]}
                                </Badge>
                              </div>
                            </div>
                          </div>
                          <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                            <p className="text-sm font-medium text-blue-700">🍼 Leite:</p>
                            <p className="text-sm text-blue-900 font-semibold mt-1">
                              {child.specialMilk}
                            </p>
                          </div>
                          {child.dietaryRestrictions && (
                            <div className="mt-2 p-3 bg-yellow-50 rounded-lg">
                              <p className="text-sm font-medium text-yellow-700">📋 Motivo:</p>
                              <p className="text-sm text-yellow-900">{child.dietaryRestrictions}</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                    {childrenWithSpecialMilk.length === 0 && (
                      <p className="text-center text-muted-foreground py-8">
                        Nenhuma criança com leite especial registrado
                      </p>
                    )}
                  </div>
                </TabsContent>

                {/* Staff Chat Tab */}
                <TabsContent value="equipe" className="mt-0">
                  <h3 className="font-semibold mb-4">Chat da Equipe</h3>
                  <div className="space-y-4">
                    {/* Channel Selector */}
                    <div className="flex gap-2 flex-wrap">
                      <Button variant={selectedStaffChannel === "geral" ? "default" : "outline"} size="sm" onClick={() => handleStaffChannelChange("geral")}>
                        📢 Geral
                        {getStaffUnreadCount("geral") > 0 && <Badge variant="destructive" className="ml-2 h-5 px-1.5">{getStaffUnreadCount("geral")}</Badge>}
                      </Button>
                      <Button variant={selectedStaffChannel === "cozinha" ? "default" : "outline"} size="sm" onClick={() => handleStaffChannelChange("cozinha")}>
                        👩‍🍳 Cozinha
                        {getStaffUnreadCount("cozinha") > 0 && <Badge variant="destructive" className="ml-2 h-5 px-1.5">{getStaffUnreadCount("cozinha")}</Badge>}
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
                                  <span className={msg.isRead ? "text-pimpo-blue" : "text-muted-foreground"}>
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

        {/* Mini Calendar */}
        <DemoMiniCalendar />
      </main>
    </div>
  );
}
