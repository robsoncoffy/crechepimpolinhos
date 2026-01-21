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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  UtensilsCrossed,
  Home,
  Bell,
  Save,
  Coffee,
  Cookie,
  Soup,
  Apple,
  Moon as MoonIcon,
  ChevronLeft,
  ChevronRight,
  Leaf,
  MessageSquare,
  Sparkles,
  Send,
  Loader2,
  Baby,
  Users,
  Copy,
  Clock,
  Milk,
  Check,
} from "lucide-react";
import logo from "@/assets/logo-pimpolinhos.png";
import { DemoQuickPostCreator } from "./DemoQuickPostCreator";
import { DemoMiniCalendar } from "./DemoMiniCalendar";
import { toast } from "sonner";
import { format, startOfWeek, addWeeks, subWeeks, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";

const dayNames = ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira'];

interface MenuItem {
  day_of_week: number;
  breakfast: string;
  breakfast_time: string;
  morning_snack: string;
  morning_snack_time: string;
  lunch: string;
  lunch_time: string;
  bottle: string;
  bottle_time: string;
  snack: string;
  snack_time: string;
  pre_dinner: string;
  pre_dinner_time: string;
  dinner: string;
  dinner_time: string;
  notes: string;
}

const emptyMenuItem = (dayOfWeek: number, menuType: 'bercario' | 'maternal'): MenuItem => ({
  day_of_week: dayOfWeek,
  breakfast: '',
  breakfast_time: menuType === 'bercario' ? '07:30' : '08:00',
  morning_snack: '',
  morning_snack_time: '09:30',
  lunch: '',
  lunch_time: menuType === 'bercario' ? '11:00' : '11:30',
  bottle: '',
  bottle_time: '13:00',
  snack: '',
  snack_time: menuType === 'bercario' ? '15:00' : '15:30',
  pre_dinner: '',
  pre_dinner_time: '16:30',
  dinner: '',
  dinner_time: menuType === 'bercario' ? '17:30' : '18:00',
  notes: '',
});

// Mock data for demo
const mockBercarioMenu: MenuItem[] = [
  {
    day_of_week: 1,
    breakfast: "Mingau de aveia com banana",
    breakfast_time: "07:30",
    morning_snack: "Frutas amassadas (maçã/pêra)",
    morning_snack_time: "09:30",
    lunch: "Papinha de legumes com frango",
    lunch_time: "11:00",
    bottle: "Fórmula infantil",
    bottle_time: "13:00",
    snack: "Iogurte natural",
    snack_time: "15:00",
    pre_dinner: "Papa de frutas",
    pre_dinner_time: "16:30",
    dinner: "Sopa de legumes",
    dinner_time: "17:30",
    notes: "Verificar leites especiais para Pedro e Maria",
  },
  {
    day_of_week: 2,
    breakfast: "Papa de mamão com aveia",
    breakfast_time: "07:30",
    morning_snack: "Banana amassada",
    morning_snack_time: "09:30",
    lunch: "Purê de batata com carne moída",
    lunch_time: "11:00",
    bottle: "Fórmula infantil",
    bottle_time: "13:00",
    snack: "Biscoito de maisena",
    snack_time: "15:00",
    pre_dinner: "Papa de maçã",
    pre_dinner_time: "16:30",
    dinner: "Canja de galinha",
    dinner_time: "17:30",
    notes: "",
  },
  ...([3, 4, 5].map(d => emptyMenuItem(d, 'bercario'))),
];

const mockMaternalMenu: MenuItem[] = [
  {
    day_of_week: 1,
    breakfast: "Pão integral com queijo, frutas picadas e leite",
    breakfast_time: "08:00",
    morning_snack: "Biscoito de aveia com suco natural",
    morning_snack_time: "09:30",
    lunch: "Arroz, feijão, frango grelhado, salada de alface e tomate",
    lunch_time: "11:30",
    bottle: "",
    bottle_time: "13:00",
    snack: "Iogurte natural com mel e granola",
    snack_time: "15:30",
    pre_dinner: "",
    pre_dinner_time: "16:30",
    dinner: "Sopa de legumes com macarrão",
    dinner_time: "18:00",
    notes: "Opção sem glúten: substituir pão por tapioca",
  },
  {
    day_of_week: 2,
    breakfast: "Vitamina de frutas com aveia",
    breakfast_time: "08:00",
    morning_snack: "Torrada com requeijão",
    morning_snack_time: "09:30",
    lunch: "Arroz, lentilha, carne moída, purê de batata",
    lunch_time: "11:30",
    bottle: "",
    bottle_time: "13:00",
    snack: "Bolo de cenoura sem cobertura",
    snack_time: "15:30",
    pre_dinner: "",
    pre_dinner_time: "16:30",
    dinner: "Omelete com legumes",
    dinner_time: "18:00",
    notes: "Dia vegetariano opcional disponível",
  },
  ...([3, 4, 5].map(d => emptyMenuItem(d, 'maternal'))),
];

// AI suggestions mock
const aiSuggestions: Record<string, string[]> = {
  breakfast: [
    "Mingau de aveia com banana",
    "Papa de mamão com granola",
    "Vitamina de frutas com aveia",
    "Pão integral com queijo cottage",
  ],
  morning_snack: [
    "Frutas picadas (maçã, pêra, banana)",
    "Biscoito de aveia caseiro",
    "Iogurte natural com mel",
    "Torrada integral com requeijão",
  ],
  lunch: [
    "Arroz, feijão, frango grelhado e legumes",
    "Macarrão integral com molho de tomate natural",
    "Purê de batata com carne moída e salada",
    "Risoto de legumes com frango desfiado",
  ],
  bottle: [
    "Fórmula infantil adequada à idade",
    "Leite materno",
    "Fórmula hipoalergênica (se indicado)",
  ],
  snack: [
    "Iogurte natural com frutas",
    "Bolo de banana sem açúcar",
    "Frutas variadas",
    "Biscoito integral",
  ],
  pre_dinner: [
    "Papa de frutas",
    "Vitamina de frutas",
    "Frutas amassadas",
  ],
  dinner: [
    "Sopa de legumes com macarrão",
    "Canja de galinha",
    "Purê de legumes com frango",
    "Omelete com legumes",
  ],
};

// Demo AI suggestion component
function DemoMealSuggestions({ 
  mealType, 
  onSelect 
}: { 
  mealType: string; 
  onSelect: (suggestion: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [ingredient, setIngredient] = useState("");

  const fetchSuggestions = async () => {
    setLoading(true);
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800));
    setSuggestions(aiSuggestions[mealType] || aiSuggestions.lunch);
    setLoading(false);
  };

  const handleSelect = (suggestion: string) => {
    onSelect(suggestion);
    setOpen(false);
    setSuggestions([]);
    setIngredient("");
  };

  return (
    <Popover open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) {
        setSuggestions([]);
        setIngredient("");
      }
    }}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs text-muted-foreground hover:text-primary"
        >
          <Sparkles className="w-3.5 h-3.5 mr-1" />
          IA
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-3" sideOffset={4}>
        <div className="space-y-3">
          <form onSubmit={(e) => {
            e.preventDefault();
            fetchSuggestions();
          }} className="flex gap-2">
            <Input
              placeholder="Digite um ingrediente (opcional)"
              value={ingredient}
              onChange={(e) => setIngredient(e.target.value)}
              className="h-8 text-sm"
            />
            <Button
              type="submit"
              size="sm"
              variant="secondary"
              disabled={loading}
              className="h-8 px-2"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </form>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={fetchSuggestions}
            disabled={loading}
            className="w-full text-xs"
          >
            {loading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 mr-1" />
            )}
            {suggestions.length > 0 ? "Novas sugestões" : "Gerar sugestões automáticas"}
          </Button>

          {suggestions.length > 0 && (
            <div className="space-y-1 pt-2 border-t">
              <p className="text-xs text-muted-foreground pb-1">
                Clique para usar:
              </p>
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleSelect(suggestion)}
                  className="w-full text-left text-sm px-3 py-2 rounded-md hover:bg-accent transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function DemoNutritionistDashboard() {
  const [weekStart, setWeekStart] = useState(() => 
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const [activeMenuTab, setActiveMenuTab] = useState<'bercario' | 'maternal'>('bercario');
  const [bercarioItems, setBercarioItems] = useState<MenuItem[]>(mockBercarioMenu);
  const [maternalItems, setMaternalItems] = useState<MenuItem[]>(mockMaternalMenu);
  const [saving, setSaving] = useState(false);
  const [copying, setCopying] = useState(false);
  const [activeTab, setActiveTab] = useState("cardapio");
  const [chatMessage, setChatMessage] = useState("");

  const weekStartStr = format(weekStart, 'yyyy-MM-dd');
  const weekEndStr = format(addDays(weekStart, 4), 'yyyy-MM-dd');

  const goToPreviousWeek = () => setWeekStart(subWeeks(weekStart, 1));
  const goToNextWeek = () => setWeekStart(addWeeks(weekStart, 1));

  const updateMenuItem = (menuType: 'bercario' | 'maternal', dayOfWeek: number, field: keyof MenuItem, value: string) => {
    const setItems = menuType === 'bercario' ? setBercarioItems : setMaternalItems;
    setItems(prev => 
      prev.map(item => 
        item.day_of_week === dayOfWeek 
          ? { ...item, [field]: value }
          : item
      )
    );
  };

  const handleSave = async () => {
    setSaving(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setSaving(false);
    toast.success('Cardápio salvo com sucesso! (Demo)');
  };

  const copyFromPreviousWeek = async () => {
    setCopying(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    setCopying(false);
    toast.success('Cardápio da semana anterior copiado! (Demo)');
  };

  const currentMenuItems = activeMenuTab === 'bercario' ? bercarioItems : maternalItems;
  const tabColor = activeMenuTab === 'bercario' ? 'pimpo-blue' : 'pimpo-green';

  const MealField = ({ 
    icon, 
    label, 
    value, 
    timeValue, 
    field, 
    timeField, 
    placeholder,
    menuType,
    dayOfWeek,
    iconColor = "text-muted-foreground"
  }: {
    icon: React.ReactNode;
    label: string;
    value: string;
    timeValue: string;
    field: keyof MenuItem;
    timeField: keyof MenuItem;
    placeholder: string;
    menuType: 'bercario' | 'maternal';
    dayOfWeek: number;
    iconColor?: string;
  }) => {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-2 text-sm">
            {icon}
            {label}
          </Label>
          <DemoMealSuggestions
            mealType={field as string}
            onSelect={(suggestion) => updateMenuItem(menuType, dayOfWeek, field, suggestion)}
          />
        </div>
        <div className="flex gap-2">
          <Input
            value={value}
            onChange={(e) => updateMenuItem(menuType, dayOfWeek, field, e.target.value)}
            placeholder={placeholder}
            className="flex-1"
          />
          <div className="relative">
            <Clock className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              type="time"
              value={timeValue}
              onChange={(e) => updateMenuItem(menuType, dayOfWeek, timeField, e.target.value)}
              className="w-24 pl-7 text-sm"
            />
          </div>
        </div>
      </div>
    );
  };

  const renderMenuForm = (items: MenuItem[], menuType: 'bercario' | 'maternal') => (
    <div className="grid gap-6">
      {items.map((item) => {
        const dayDate = addDays(weekStart, item.day_of_week - 1);
        const hasContent = item.breakfast || item.lunch || item.snack || item.dinner || 
                          item.morning_snack || item.bottle || item.pre_dinner;

        return (
          <Card 
            key={item.day_of_week}
            className={`transition-all ${
              hasContent 
                ? menuType === 'bercario' 
                  ? 'border-pimpo-blue/30 bg-pimpo-blue/5' 
                  : 'border-pimpo-green/30 bg-pimpo-green/5'
                : ''
            }`}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  {dayNames[item.day_of_week - 1]}
                  <span className="text-sm font-normal text-muted-foreground">
                    ({format(dayDate, 'd/MM')})
                  </span>
                </CardTitle>
                {hasContent && (
                  <Check className={`w-5 h-5 ${menuType === 'bercario' ? 'text-pimpo-blue' : 'text-pimpo-green'}`} />
                )}
              </div>
            </CardHeader>
            <CardContent className="grid gap-4">
              <MealField
                icon={<Coffee className="w-4 h-4 text-amber-600" />}
                label="Café da Manhã"
                value={item.breakfast}
                timeValue={item.breakfast_time}
                field="breakfast"
                timeField="breakfast_time"
                placeholder="Descreva o café da manhã..."
                menuType={menuType}
                dayOfWeek={item.day_of_week}
                iconColor="text-amber-600"
              />
              
              <MealField
                icon={<Cookie className="w-4 h-4 text-orange-500" />}
                label="Lanche da Manhã"
                value={item.morning_snack}
                timeValue={item.morning_snack_time}
                field="morning_snack"
                timeField="morning_snack_time"
                placeholder="Descreva o lanche da manhã..."
                menuType={menuType}
                dayOfWeek={item.day_of_week}
                iconColor="text-orange-500"
              />
              
              <MealField
                icon={<Soup className="w-4 h-4 text-red-500" />}
                label="Almoço"
                value={item.lunch}
                timeValue={item.lunch_time}
                field="lunch"
                timeField="lunch_time"
                placeholder="Descreva o almoço..."
                menuType={menuType}
                dayOfWeek={item.day_of_week}
                iconColor="text-red-500"
              />
              
              {menuType === 'bercario' && (
                <MealField
                  icon={<Milk className="w-4 h-4 text-blue-400" />}
                  label="Mamadeira"
                  value={item.bottle}
                  timeValue={item.bottle_time}
                  field="bottle"
                  timeField="bottle_time"
                  placeholder="Fórmula/Leite..."
                  menuType={menuType}
                  dayOfWeek={item.day_of_week}
                  iconColor="text-blue-400"
                />
              )}
              
              <MealField
                icon={<Apple className="w-4 h-4 text-green-500" />}
                label="Lanche da Tarde"
                value={item.snack}
                timeValue={item.snack_time}
                field="snack"
                timeField="snack_time"
                placeholder="Descreva o lanche da tarde..."
                menuType={menuType}
                dayOfWeek={item.day_of_week}
                iconColor="text-green-500"
              />
              
              {menuType === 'bercario' && (
                <MealField
                  icon={<Cookie className="w-4 h-4 text-purple-500" />}
                  label="Pré-Janta"
                  value={item.pre_dinner}
                  timeValue={item.pre_dinner_time}
                  field="pre_dinner"
                  timeField="pre_dinner_time"
                  placeholder="Papa de frutas, vitamina..."
                  menuType={menuType}
                  dayOfWeek={item.day_of_week}
                  iconColor="text-purple-500"
                />
              )}
              
              <MealField
                icon={<MoonIcon className="w-4 h-4 text-indigo-500" />}
                label="Jantar"
                value={item.dinner}
                timeValue={item.dinner_time}
                field="dinner"
                timeField="dinner_time"
                placeholder="Descreva o jantar..."
                menuType={menuType}
                dayOfWeek={item.day_of_week}
                iconColor="text-indigo-500"
              />
              
              <div className="space-y-2">
                <Label className="text-sm">Observações</Label>
                <Textarea
                  value={item.notes}
                  onChange={(e) => updateMenuItem(menuType, item.day_of_week, 'notes', e.target.value)}
                  placeholder="Notas especiais, substituições, alertas de alergia..."
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );

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

          <TabsContent value="cardapio" className="mt-4 space-y-6">
            {/* Actions Bar */}
            <div className="flex flex-wrap gap-3 justify-between items-center">
              <Button
                onClick={handleSave}
                disabled={saving}
                className={`${activeMenuTab === 'bercario' ? 'bg-pimpo-blue hover:bg-pimpo-blue/90' : 'bg-pimpo-green hover:bg-pimpo-green/90'}`}
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Salvar Cardápio
              </Button>
              
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" disabled={copying}>
                    {copying ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Copy className="w-4 h-4 mr-2" />
                    )}
                    Copiar da Semana Anterior
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Copiar cardápio?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Isso irá substituir o cardápio atual pelos itens da semana anterior.
                      Você ainda precisará salvar as alterações depois.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={copyFromPreviousWeek}>
                      Copiar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>

            {/* Week Navigation */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <Button variant="outline" size="icon" onClick={goToPreviousWeek}>
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <div className="text-center">
                    <p className="font-semibold">
                      {format(weekStart, "d 'de' MMM", { locale: ptBR })} - {format(addDays(weekStart, 4), "d 'de' MMM", { locale: ptBR })}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {format(weekStart, 'yyyy')}
                    </p>
                  </div>
                  <Button variant="outline" size="icon" onClick={goToNextWeek}>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Menu Type Tabs */}
            <Tabs value={activeMenuTab} onValueChange={(v) => setActiveMenuTab(v as 'bercario' | 'maternal')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="bercario" className="gap-2">
                  <Baby className="w-4 h-4" />
                  Berçário
                </TabsTrigger>
                <TabsTrigger value="maternal" className="gap-2">
                  <Users className="w-4 h-4" />
                  Maternal / Jardim
                </TabsTrigger>
              </TabsList>

              <TabsContent value="bercario" className="mt-4">
                {renderMenuForm(bercarioItems, 'bercario')}
              </TabsContent>

              <TabsContent value="maternal" className="mt-4">
                {renderMenuForm(maternalItems, 'maternal')}
              </TabsContent>
            </Tabs>
          </TabsContent>
        </Tabs>

        {/* Mini Calendar + Quick Post Creator */}
        <div className="grid lg:grid-cols-2 gap-6 mt-6">
          <DemoMiniCalendar />
          <DemoQuickPostCreator userName="Nutricionista Carla" userInitial="N" />
        </div>
      </main>
    </div>
  );
}
