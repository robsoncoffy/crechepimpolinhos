import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  UtensilsCrossed,
  Home,
  Bell,
  Calendar,
  Save,
  Coffee,
  Cookie,
  Salad,
  Apple,
  Moon as MoonIcon,
  Plus,
  ChevronLeft,
  ChevronRight,
  Leaf,
  Edit,
  MessageSquare,
  Sparkles,
  Send,
} from "lucide-react";
import logo from "@/assets/logo-pimpolinhos.png";

const daysOfWeek = [
  { value: 0, label: "Segunda-feira" },
  { value: 1, label: "Terça-feira" },
  { value: 2, label: "Quarta-feira" },
  { value: 3, label: "Quinta-feira" },
  { value: 4, label: "Sexta-feira" },
];

const mealFields = [
  { key: "breakfast", label: "Café da Manhã", icon: Coffee },
  { key: "morningSnack", label: "Lanche da Manhã", icon: Cookie },
  { key: "lunch", label: "Almoço", icon: Salad },
  { key: "afternoonSnack", label: "Lanche da Tarde", icon: Apple },
  { key: "dinner", label: "Jantar", icon: MoonIcon },
];

// Mock weekly menu
const mockWeeklyMenu = {
  0: {
    breakfast: "Pão integral com queijo, frutas picadas e leite",
    morningSnack: "Biscoito de aveia com suco natural",
    lunch: "Arroz, feijão, frango grelhado, salada de alface e tomate",
    afternoonSnack: "Iogurte natural com mel e granola",
    dinner: "Sopa de legumes com macarrão",
    notes: "Opção sem glúten: substituir pão por tapioca",
  },
  1: {
    breakfast: "Mingau de aveia com banana",
    morningSnack: "Frutas variadas",
    lunch: "Arroz, lentilha, carne moída, purê de batata",
    afternoonSnack: "Bolo de cenoura sem cobertura",
    dinner: "Canja de galinha",
    notes: "",
  },
  2: {
    breakfast: "Vitamina de frutas com aveia",
    morningSnack: "Torrada com requeijão",
    lunch: "Macarrão com molho de carne e salada",
    afternoonSnack: "Gelatina com frutas",
    dinner: "Omelete com legumes",
    notes: "Dia vegetariano opcional disponível",
  },
  3: {
    breakfast: "Pão de queijo com suco",
    morningSnack: "Banana amassada com aveia",
    lunch: "Arroz, feijão, peixe assado, legumes",
    afternoonSnack: "Biscoito integral com leite",
    dinner: "Sopa de feijão com legumes",
    notes: "",
  },
  4: {
    breakfast: "Tapioca com queijo",
    morningSnack: "Salada de frutas",
    lunch: "Arroz, feijão, strogonoff de frango, batata palha",
    afternoonSnack: "Bolo de banana",
    dinner: "Purê de legumes com frango desfiado",
    notes: "Sexta especial - sobremesa: pudim",
  },
};

export function DemoNutritionistDashboard() {
  const [selectedDay, setSelectedDay] = useState(new Date().getDay() - 1 >= 0 ? new Date().getDay() - 1 : 0);
  const [isEditing, setIsEditing] = useState(false);
  const [menu, setMenu] = useState(mockWeeklyMenu);
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [activeTab, setActiveTab] = useState("cardapio");
  const [chatMessage, setChatMessage] = useState("");

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

  const handleSave = () => {
    setIsEditing(false);
    // In a real app, save to database
  };

  const updateMeal = (day: number, field: string, value: string) => {
    setMenu(prev => ({
      ...prev,
      [day]: {
        ...prev[day as keyof typeof prev],
        [field]: value,
      }
    }));
  };

  const currentDayMenu = menu[selectedDay as keyof typeof menu];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-green-50/30 to-background relative">
      {/* Header */}
      <header className="bg-card/80 backdrop-blur-sm shadow-sm sticky top-0 z-40 border-b">
        <div className="container py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img src={logo} alt="Creche Pimpolinhos" className="h-10" />
            <span className="font-fredoka text-lg font-bold hidden sm:inline">
              Nutrição
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-pimpo-green text-white font-semibold">
                  N
                </AvatarFallback>
              </Avatar>
              <span>Dra. Carla (Demo)</span>
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
      <main className="container py-6 max-w-5xl">
        <div className="mb-6">
          <h1 className="font-fredoka text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <Leaf className="w-8 h-8 text-pimpo-green" />
            Painel da Nutricionista
          </h1>
          <p className="text-muted-foreground">
            Gerencie cardápios e responda dúvidas dos pais
          </p>
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="cardapio" className="gap-2">
              <UtensilsCrossed className="w-4 h-4" />
              Cardápio
            </TabsTrigger>
            <TabsTrigger value="chat" className="gap-2 relative">
              <MessageSquare className="w-4 h-4" />
              Chat com Pais
              <Badge variant="destructive" className="ml-1 h-5 px-1.5">2</Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="chat" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-pimpo-green" />
                  Dúvidas sobre Nutrição
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px] mb-4">
                  <div className="space-y-3">
                    <div className="flex justify-start">
                      <div className="bg-muted rounded-lg px-3 py-2 max-w-[80%]">
                        <p className="text-xs font-medium text-primary mb-1">Mãe do João</p>
                        <p className="text-sm">O João pode comer ovo? Ele tem 10 meses.</p>
                        <p className="text-xs text-muted-foreground mt-1">09:30</p>
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <div className="bg-pimpo-green text-white rounded-lg px-3 py-2 max-w-[80%]">
                        <p className="text-sm">Sim! A partir dos 9 meses o ovo pode ser introduzido. Comece com a gema bem cozida 🥚</p>
                        <p className="text-xs opacity-70 mt-1">09:45</p>
                      </div>
                    </div>
                    <div className="flex justify-start">
                      <div className="bg-muted rounded-lg px-3 py-2 max-w-[80%]">
                        <p className="text-xs font-medium text-primary mb-1">Pai da Maria</p>
                        <p className="text-sm">A Maria pode comer mel? Ela tem 1 ano e 2 meses.</p>
                        <p className="text-xs text-muted-foreground mt-1">10:15</p>
                      </div>
                    </div>
                  </div>
                </ScrollArea>

                {/* AI Suggestions */}
                <div className="mb-3 p-3 bg-pimpo-green/5 rounded-lg border border-pimpo-green/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4 text-pimpo-green" />
                    <span className="text-xs font-medium">Sugestões de resposta</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => setChatMessage("Sim, a partir de 1 ano o mel pode ser oferecido com segurança! 🍯")}>
                      Sim, após 1 ano é seguro 🍯
                    </Button>
                    <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => setChatMessage("Pode sim! O mel só é contraindicado antes de 1 ano devido ao risco de botulismo.")}>
                      Pode sim, sem riscos
                    </Button>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Input
                    placeholder="Digite sua resposta..."
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                  />
                  <Button className="bg-pimpo-green hover:bg-pimpo-green/90">
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="cardapio" className="mt-4">

        {/* Week Navigation */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <Button variant="outline" size="icon" onClick={handlePrevWeek}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <div className="text-center">
                <p className="font-semibold">
                  {weekStart.toLocaleDateString("pt-BR", { day: "numeric", month: "short" })} - {weekEnd.toLocaleDateString("pt-BR", { day: "numeric", month: "short" })}
                </p>
                <p className="text-sm text-muted-foreground">
                  {weekStart.getFullYear()}
                </p>
              </div>
              <Button variant="outline" size="icon" onClick={handleNextWeek}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Day Selector */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {daysOfWeek.map((day) => (
            <Button
              key={day.value}
              variant={selectedDay === day.value ? "default" : "outline"}
              onClick={() => setSelectedDay(day.value)}
              className={`flex-shrink-0 ${selectedDay === day.value ? "bg-pimpo-green hover:bg-pimpo-green/90" : ""}`}
            >
              {day.label}
            </Button>
          ))}
        </div>

        {/* Menu Editor */}
        <Card className="shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-pimpo-green" />
              {daysOfWeek[selectedDay].label}
            </CardTitle>
            <Button
              variant={isEditing ? "default" : "outline"}
              onClick={() => isEditing ? handleSave() : setIsEditing(true)}
              className={isEditing ? "bg-pimpo-green hover:bg-pimpo-green/90" : ""}
            >
              {isEditing ? (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Salvar
                </>
              ) : (
                <>
                  <Edit className="w-4 h-4 mr-2" />
                  Editar
                </>
              )}
            </Button>
          </CardHeader>
          <CardContent className="space-y-6">
            {mealFields.map((meal) => {
              const MealIcon = meal.icon;
              return (
                <div key={meal.key} className="space-y-2">
                  <Label className="flex items-center gap-2 text-base font-medium">
                    <MealIcon className="w-5 h-5 text-pimpo-green" />
                    {meal.label}
                  </Label>
                  {isEditing ? (
                    <Textarea
                      value={currentDayMenu[meal.key as keyof typeof currentDayMenu] || ""}
                      onChange={(e) => updateMeal(selectedDay, meal.key, e.target.value)}
                      placeholder={`Descreva o ${meal.label.toLowerCase()}...`}
                      rows={2}
                    />
                  ) : (
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-sm">
                        {currentDayMenu[meal.key as keyof typeof currentDayMenu] || (
                          <span className="text-muted-foreground italic">Não definido</span>
                        )}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Notes */}
            <div className="space-y-2 pt-4 border-t">
              <Label className="flex items-center gap-2 text-base font-medium">
                📝 Observações do Dia
              </Label>
              {isEditing ? (
                <Textarea
                  value={currentDayMenu.notes || ""}
                  onChange={(e) => updateMeal(selectedDay, "notes", e.target.value)}
                  placeholder="Opções especiais, substituições, alertas..."
                  rows={2}
                />
              ) : (
                currentDayMenu.notes && (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800">{currentDayMenu.notes}</p>
                  </div>
                )
              )}
            </div>
          </CardContent>
        </Card>

        {/* Week Overview */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg">Visão Geral da Semana</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              {daysOfWeek.map((day) => {
                const dayMenu = menu[day.value as keyof typeof menu];
                return (
                  <div
                    key={day.value}
                    onClick={() => setSelectedDay(day.value)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                      selectedDay === day.value
                        ? "bg-pimpo-green/10 border-pimpo-green"
                        : "hover:bg-muted/50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{day.label}</span>
                      {dayMenu.notes && (
                        <Badge variant="outline" className="text-xs">
                          📝 Obs
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                      Almoço: {dayMenu.lunch || "Não definido"}
                    </p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
