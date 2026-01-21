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
  Calendar,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  ShoppingCart,
  Plus,
  Trash2,
  Wand2,
} from "lucide-react";
import logo from "@/assets/logo-pimpolinhos.png";
import { DemoMiniCalendar } from "./DemoMiniCalendar";

// Shopping list item interface
interface ShoppingItem {
  id: string;
  name: string;
  quantity: string;
  checked: boolean;
}

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
    class: "maternal_1", 
    shift: "integral",
    allergies: "Amendoim, Nozes",
    specialMilk: null,
    dietaryRestrictions: null,
    meals: { breakfast: true, morningSnack: false, lunch: false, afternoonSnack: false, dinner: false }
  },
  { 
    id: "2", 
    name: "João Pedro", 
    class: "maternal_1", 
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
    class: "maternal_2", 
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
  { 
    id: "7", 
    name: "Helena Rocha", 
    class: "maternal_2", 
    shift: "integral",
    allergies: null,
    specialMilk: null,
    dietaryRestrictions: null,
    meals: { breakfast: false, morningSnack: false, lunch: false, afternoonSnack: false, dinner: false }
  },
  { 
    id: "8", 
    name: "Pedro Henrique", 
    class: "maternal_1", 
    shift: "manha",
    allergies: null,
    specialMilk: null,
    dietaryRestrictions: null,
    meals: { breakfast: false, morningSnack: false, lunch: false, afternoonSnack: false, dinner: false }
  },
  { 
    id: "9", 
    name: "Laura Mendes", 
    class: "jardim", 
    shift: "integral",
    allergies: "Camarão",
    specialMilk: null,
    dietaryRestrictions: null,
    meals: { breakfast: true, morningSnack: false, lunch: false, afternoonSnack: false, dinner: false }
  },
  { 
    id: "10", 
    name: "Theo Almeida", 
    class: "bercario", 
    shift: "integral",
    allergies: null,
    specialMilk: "NAN Comfort",
    dietaryRestrictions: null,
    meals: { breakfast: false, morningSnack: false, lunch: false, afternoonSnack: false, dinner: false }
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
  maternal_1: "Maternal I",
  maternal_2: "Maternal II",
  jardim: "Jardim",
};

const mealClassTabs = [
  { key: "todas", label: "Todas" },
  { key: "bercario", label: "Berçário" },
  { key: "maternal_1", label: "Maternal I" },
  { key: "maternal_2", label: "Maternal II" },
  { key: "jardim", label: "Jardim" },
];

// Mock weekly menu data
const mockWeeklyMenu = {
  bercario: {
    1: { breakfast: "Mingau de aveia com banana", morningSnack: "Fruta amassada (maçã)", lunch: "Papinha de frango com legumes", bottle: "Fórmula Aptamil", snack: "Iogurte natural", preDinner: "Suco de fruta", dinner: "Sopinha de legumes" },
    2: { breakfast: "Mingau de maisena", morningSnack: "Banana amassada", lunch: "Papinha de carne com batata", bottle: "Fórmula NAN", snack: "Fruta raspada", preDinner: "Vitamina de frutas", dinner: "Caldo de feijão com arroz" },
    3: { breakfast: "Mingau de arroz", morningSnack: "Pera amassada", lunch: "Papinha de peixe com cenoura", bottle: "Fórmula Aptamil", snack: "Biscoito de maisena", preDinner: "Suco natural", dinner: "Sopinha de legumes" },
    4: { breakfast: "Mingau de aveia", morningSnack: "Mamão amassado", lunch: "Papinha de frango com abóbora", bottle: "Fórmula NAN", snack: "Iogurte natural", preDinner: "Fruta amassada", dinner: "Caldo de legumes" },
    5: { breakfast: "Mingau de maisena com maçã", morningSnack: "Banana", lunch: "Papinha de carne com mandioquinha", bottle: "Fórmula Aptamil", snack: "Fruta raspada", preDinner: "Vitamina", dinner: "Sopinha de frango" },
  },
  maternal: {
    1: { breakfast: "Pão com manteiga e leite", morningSnack: "Fruta (maçã)", lunch: "Arroz, feijão, frango grelhado e salada", snack: "Biscoito integral e suco", dinner: "Macarrão com carne moída" },
    2: { breakfast: "Biscoito com leite", morningSnack: "Banana", lunch: "Arroz, feijão, carne assada e legumes", snack: "Iogurte com granola", dinner: "Sopa de legumes com frango" },
    3: { breakfast: "Pão de queijo e vitamina", morningSnack: "Uva", lunch: "Arroz, lentilha, peixe e salada", snack: "Fruta picada", dinner: "Polenta com molho" },
    4: { breakfast: "Tapioca com queijo", morningSnack: "Melão", lunch: "Arroz, feijão, bife e purê", snack: "Bolo de cenoura", dinner: "Risoto de frango" },
    5: { breakfast: "Pão integral com geleia", morningSnack: "Morango", lunch: "Macarrão à bolonhesa e salada", snack: "Cookies e leite", dinner: "Sopa de feijão" },
  },
};

const daysOfWeek = [
  { value: 1, label: "Segunda" },
  { value: 2, label: "Terça" },
  { value: 3, label: "Quarta" },
  { value: 4, label: "Quinta" },
  { value: 5, label: "Sexta" },
];

export function DemoCookDashboard() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("cardapio");
  const [children, setChildren] = useState(mockChildren);
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [selectedMealClass, setSelectedMealClass] = useState<string>("todas");
  const [menuType, setMenuType] = useState<"bercario" | "maternal">("bercario");
  const [selectedMenuDay, setSelectedMenuDay] = useState(() => {
    const today = new Date().getDay();
    return today === 0 || today === 6 ? 1 : today;
  });

  // Staff chat states
  const [selectedStaffChannel, setSelectedStaffChannel] = useState<StaffChannel>("geral");
  const [staffChatMessage, setStaffChatMessage] = useState("");
  const [staffMessages, setStaffMessages] = useState<Record<StaffChannel, DemoMessage[]>>(initialStaffMessages);
  const [isLoadingStaffSuggestions, setIsLoadingStaffSuggestions] = useState(false);
  const [staffSuggestions, setStaffSuggestions] = useState<string[]>([]);

  // Shopping list states
  const [shoppingList, setShoppingList] = useState<ShoppingItem[]>([
    { id: "1", name: "Leite Aptamil HA", quantity: "6 latas", checked: false },
    { id: "2", name: "Banana", quantity: "3 kg", checked: true },
    { id: "3", name: "Maçã", quantity: "2 kg", checked: false },
    { id: "4", name: "Aveia em flocos", quantity: "2 pacotes", checked: false },
    { id: "5", name: "Leite de aveia", quantity: "4 caixas", checked: false },
  ]);
  const [newShoppingItem, setNewShoppingItem] = useState("");
  const [newShoppingQuantity, setNewShoppingQuantity] = useState("");
  const [newShoppingUnit, setNewShoppingUnit] = useState("kg");
  const [isLoadingShoppingSuggestions, setIsLoadingShoppingSuggestions] = useState(false);
  const [shoppingSuggestions, setShoppingSuggestions] = useState<string[]>([]);

  // Unit options for shopping list
  const unitOptions = [
    { value: "kg", label: "Kg" },
    { value: "g", label: "Gramas" },
    { value: "un", label: "Unidades" },
    { value: "cx", label: "Caixas" },
    { value: "pct", label: "Pacotes" },
    { value: "lt", label: "Litros" },
    { value: "ml", label: "mL" },
    { value: "lata", label: "Latas" },
    { value: "dz", label: "Dúzias" },
    { value: "maço", label: "Maços" },
  ];

  // Generate staff chat AI suggestions
  const generateStaffSuggestions = () => {
    setIsLoadingStaffSuggestions(true);
    const lastMessages = staffMessages[selectedStaffChannel];
    const lastMessage = lastMessages[lastMessages.length - 1];
    
    setTimeout(() => {
      let suggestions: string[] = [];
      
      if (lastMessage && !lastMessage.isOwn) {
        const content = lastMessage.content.toLowerCase();
        if (content.includes("leite") || content.includes("aptamil")) {
          suggestions = [
            "Sim, temos estoque suficiente para a semana! 👍",
            "Preciso verificar o estoque, já confirmo.",
            "Acabou ontem, vou adicionar na lista de compras.",
          ];
        } else if (content.includes("glúten") || content.includes("alergia")) {
          suggestions = [
            "Anotado! Vou separar uma porção especial sem glúten.",
            "Entendido, já estou preparando opção alternativa.",
            "Ok, vou redobrar a atenção com os ingredientes!",
          ];
        } else if (content.includes("cardápio") || content.includes("menu")) {
          suggestions = [
            "O cardápio de hoje está pronto! Posso enviar foto?",
            "Vou verificar os ingredientes e já confirmo.",
            "Já estou preparando conforme o planejado!",
          ];
        } else {
          suggestions = [
            "Entendido, já vou providenciar! 👩‍🍳",
            "Ok, obrigada pelo aviso!",
            "Perfeito, pode deixar comigo!",
          ];
        }
      } else {
        suggestions = [
          "Bom dia, equipe! O café da manhã está pronto! ☕",
          "Alguém sabe se há alguma criança nova com restrição?",
          "Precisamos repor alguns ingredientes essa semana.",
        ];
      }
      
      setStaffSuggestions(suggestions);
      setIsLoadingStaffSuggestions(false);
    }, 800);
  };

  // Generate shopping list AI suggestions
  const generateShoppingSuggestions = () => {
    setIsLoadingShoppingSuggestions(true);
    
    setTimeout(() => {
      // Base suggestions on menu and children's needs
      const baseSuggestions = [
        "Frango desfiado - 3kg (para papinhas)",
        "Cenoura - 2kg",
        "Batata - 3kg",
        "Biscoito de maisena sem glúten - 4 pacotes",
        "Iogurte natural - 12 unidades",
        "Fórmula NAN Supreme - 4 latas",
        "Mamão - 2kg",
        "Feijão - 2kg",
      ];
      
      // Filter out items already in the list
      const existingNames = shoppingList.map(item => item.name.toLowerCase());
      const filtered = baseSuggestions.filter(
        s => !existingNames.some(name => s.toLowerCase().includes(name))
      ).slice(0, 4);
      
      setShoppingSuggestions(filtered);
      setIsLoadingShoppingSuggestions(false);
    }, 600);
  };

  const addShoppingItem = (itemText: string, fromSuggestion: boolean = false) => {
    if (!itemText.trim()) return;
    
    let newItem: ShoppingItem;
    
    if (fromSuggestion) {
      // From AI suggestion - parse the text
      const parts = itemText.split(" - ");
      newItem = {
        id: `item-${Date.now()}`,
        name: parts[0].trim(),
        quantity: parts[1]?.trim() || "1 un",
        checked: false,
      };
    } else {
      // From manual input - use the separate fields
      const qty = newShoppingQuantity.trim() || "1";
      newItem = {
        id: `item-${Date.now()}`,
        name: itemText.trim(),
        quantity: `${qty} ${newShoppingUnit}`,
        checked: false,
      };
    }
    
    setShoppingList(prev => [...prev, newItem]);
    setNewShoppingItem("");
    setNewShoppingQuantity("");
    setShoppingSuggestions(prev => prev.filter(s => s !== itemText));
  };

  const toggleShoppingItem = (id: string) => {
    setShoppingList(prev => prev.map(item => 
      item.id === id ? { ...item, checked: !item.checked } : item
    ));
  };

  const removeShoppingItem = (id: string) => {
    setShoppingList(prev => prev.filter(item => item.id !== id));
  };

  // Staff chat functions
  const handleStaffChannelChange = (channel: StaffChannel) => {
    setSelectedStaffChannel(channel);
    setStaffSuggestions([]);
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
    setStaffSuggestions([]);
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

  // Filtered children for meals tab (uses selectedMealClass)
  const filteredMealChildren = children.filter((child) => {
    const matchesSearch = child.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesClass = selectedMealClass === "todas" || child.class === selectedMealClass;
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

  // Mark all children in a class for the current meal
  const markAllMeals = (mealKey: string, markAsServed: boolean = true) => {
    setChildren(prev => prev.map(child => {
      // Only update children in the selected class (or all if "todas")
      if (selectedMealClass === "todas" || child.class === selectedMealClass) {
        return {
          ...child,
          meals: {
            ...child.meals,
            [mealKey]: markAsServed
          }
        };
      }
      return child;
    }));
  };

  // Check if all children in selected class have a meal marked
  const areAllMealsMarked = (mealKey: string) => {
    const classChildren = selectedMealClass === "todas" 
      ? children 
      : children.filter(c => c.class === selectedMealClass);
    return classChildren.length > 0 && classChildren.every(c => c.meals[mealKey as keyof typeof c.meals]);
  };

  // Get children count for a class
  const getClassChildrenCount = (classKey: string) => {
    if (classKey === "todas") return children.length;
    return children.filter(c => c.class === classKey).length;
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
                <TabsList className="w-full h-auto p-0 bg-transparent rounded-none grid grid-cols-5">
                  <TabsTrigger value="cardapio" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3 gap-2">
                    <Calendar className="w-4 h-4" />
                    <span className="hidden sm:inline">Cardápio</span>
                    <span className="sm:hidden">Menu</span>
                  </TabsTrigger>
                  <TabsTrigger value="refeicoes" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3 gap-2">
                    <UtensilsCrossed className="w-4 h-4" />
                    <span className="hidden sm:inline">Refeições</span>
                    <span className="sm:hidden">Refeições</span>
                  </TabsTrigger>
                  <TabsTrigger value="alergias" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3 gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="hidden sm:inline">Alergias</span>
                    <span className="sm:hidden">Alergias</span>
                  </TabsTrigger>
                  <TabsTrigger value="leites" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3 gap-2">
                    <Milk className="w-4 h-4" />
                    <span className="hidden sm:inline">Leites</span>
                    <span className="sm:hidden">Leites</span>
                  </TabsTrigger>
                  <TabsTrigger value="equipe" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3 gap-2">
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
                {/* Weekly Menu Tab */}
                <TabsContent value="cardapio" className="mt-0">
                  <div className="space-y-4">
                    {/* Menu Type Selector */}
                    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                      <div className="flex gap-2">
                        <Button
                          variant={menuType === "bercario" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setMenuType("bercario")}
                        >
                          <Baby className="w-4 h-4 mr-2" />
                          Berçário
                        </Button>
                        <Button
                          variant={menuType === "maternal" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setMenuType("maternal")}
                        >
                          <UtensilsCrossed className="w-4 h-4 mr-2" />
                          Maternal/Jardim
                        </Button>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setSelectedMenuDay(d => d > 1 ? d - 1 : 5)}
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <span className="font-medium min-w-[100px] text-center">
                          {daysOfWeek.find(d => d.value === selectedMenuDay)?.label}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setSelectedMenuDay(d => d < 5 ? d + 1 : 1)}
                        >
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Day Selector Pills */}
                    <div className="flex gap-2 overflow-x-auto pb-2">
                      {daysOfWeek.map((day) => (
                        <Button
                          key={day.value}
                          variant={selectedMenuDay === day.value ? "default" : "outline"}
                          size="sm"
                          onClick={() => setSelectedMenuDay(day.value)}
                          className="flex-shrink-0"
                        >
                          {day.label}
                        </Button>
                      ))}
                    </div>

                    {/* Menu Content */}
                    {menuType === "bercario" ? (
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        <Card className="border-l-4 border-l-amber-400">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm flex items-center gap-2">
                              <Coffee className="w-4 h-4 text-amber-500" />
                              Café da Manhã
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="text-sm text-muted-foreground">
                            {mockWeeklyMenu.bercario[selectedMenuDay as keyof typeof mockWeeklyMenu.bercario]?.breakfast || "—"}
                          </CardContent>
                        </Card>
                        <Card className="border-l-4 border-l-orange-400">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm flex items-center gap-2">
                              <Cookie className="w-4 h-4 text-orange-500" />
                              Lanche da Manhã
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="text-sm text-muted-foreground">
                            {mockWeeklyMenu.bercario[selectedMenuDay as keyof typeof mockWeeklyMenu.bercario]?.morningSnack || "—"}
                          </CardContent>
                        </Card>
                        <Card className="border-l-4 border-l-green-400">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm flex items-center gap-2">
                              <Salad className="w-4 h-4 text-green-500" />
                              Almoço
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="text-sm text-muted-foreground">
                            {mockWeeklyMenu.bercario[selectedMenuDay as keyof typeof mockWeeklyMenu.bercario]?.lunch || "—"}
                          </CardContent>
                        </Card>
                        <Card className="border-l-4 border-l-blue-400">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm flex items-center gap-2">
                              <Milk className="w-4 h-4 text-blue-500" />
                              Mamadeira
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="text-sm text-muted-foreground">
                            {mockWeeklyMenu.bercario[selectedMenuDay as keyof typeof mockWeeklyMenu.bercario]?.bottle || "—"}
                          </CardContent>
                        </Card>
                        <Card className="border-l-4 border-l-purple-400">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm flex items-center gap-2">
                              <Apple className="w-4 h-4 text-purple-500" />
                              Lanche da Tarde
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="text-sm text-muted-foreground">
                            {mockWeeklyMenu.bercario[selectedMenuDay as keyof typeof mockWeeklyMenu.bercario]?.snack || "—"}
                          </CardContent>
                        </Card>
                        <Card className="border-l-4 border-l-rose-400">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm flex items-center gap-2">
                              <Cookie className="w-4 h-4 text-rose-500" />
                              Pré-Janta
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="text-sm text-muted-foreground">
                            {mockWeeklyMenu.bercario[selectedMenuDay as keyof typeof mockWeeklyMenu.bercario]?.preDinner || "—"}
                          </CardContent>
                        </Card>
                        <Card className="border-l-4 border-l-indigo-400 sm:col-span-2 lg:col-span-1">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm flex items-center gap-2">
                              <MoonIcon className="w-4 h-4 text-indigo-500" />
                              Jantar/Mamadeira
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="text-sm text-muted-foreground">
                            {mockWeeklyMenu.bercario[selectedMenuDay as keyof typeof mockWeeklyMenu.bercario]?.dinner || "—"}
                          </CardContent>
                        </Card>
                      </div>
                    ) : (
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        <Card className="border-l-4 border-l-amber-400">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm flex items-center gap-2">
                              <Coffee className="w-4 h-4 text-amber-500" />
                              Café da Manhã
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="text-sm text-muted-foreground">
                            {mockWeeklyMenu.maternal[selectedMenuDay as keyof typeof mockWeeklyMenu.maternal]?.breakfast || "—"}
                          </CardContent>
                        </Card>
                        <Card className="border-l-4 border-l-orange-400">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm flex items-center gap-2">
                              <Cookie className="w-4 h-4 text-orange-500" />
                              Lanche da Manhã
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="text-sm text-muted-foreground">
                            {mockWeeklyMenu.maternal[selectedMenuDay as keyof typeof mockWeeklyMenu.maternal]?.morningSnack || "—"}
                          </CardContent>
                        </Card>
                        <Card className="border-l-4 border-l-green-400">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm flex items-center gap-2">
                              <Salad className="w-4 h-4 text-green-500" />
                              Almoço
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="text-sm text-muted-foreground">
                            {mockWeeklyMenu.maternal[selectedMenuDay as keyof typeof mockWeeklyMenu.maternal]?.lunch || "—"}
                          </CardContent>
                        </Card>
                        <Card className="border-l-4 border-l-purple-400">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm flex items-center gap-2">
                              <Apple className="w-4 h-4 text-purple-500" />
                              Lanche da Tarde
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="text-sm text-muted-foreground">
                            {mockWeeklyMenu.maternal[selectedMenuDay as keyof typeof mockWeeklyMenu.maternal]?.snack || "—"}
                          </CardContent>
                        </Card>
                        <Card className="border-l-4 border-l-indigo-400 sm:col-span-2 lg:col-span-2">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm flex items-center gap-2">
                              <MoonIcon className="w-4 h-4 text-indigo-500" />
                              Jantar
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="text-sm text-muted-foreground">
                            {mockWeeklyMenu.maternal[selectedMenuDay as keyof typeof mockWeeklyMenu.maternal]?.dinner || "—"}
                          </CardContent>
                        </Card>
                      </div>
                    )}

                    {/* Week Overview */}
                    <Card className="mt-6">
                      <CardHeader>
                        <CardTitle className="text-base">Visão Geral da Semana</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="border-b">
                                <th className="text-left p-2 font-medium">Refeição</th>
                                {daysOfWeek.map(day => (
                                  <th key={day.value} className="text-left p-2 font-medium">{day.label}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {menuType === "bercario" ? (
                                <>
                                  <tr className="border-b">
                                    <td className="p-2 font-medium text-amber-600">Café</td>
                                    {daysOfWeek.map(day => (
                                      <td key={day.value} className="p-2 text-muted-foreground">
                                        {mockWeeklyMenu.bercario[day.value as keyof typeof mockWeeklyMenu.bercario]?.breakfast?.slice(0, 20)}...
                                      </td>
                                    ))}
                                  </tr>
                                  <tr className="border-b">
                                    <td className="p-2 font-medium text-green-600">Almoço</td>
                                    {daysOfWeek.map(day => (
                                      <td key={day.value} className="p-2 text-muted-foreground">
                                        {mockWeeklyMenu.bercario[day.value as keyof typeof mockWeeklyMenu.bercario]?.lunch?.slice(0, 20)}...
                                      </td>
                                    ))}
                                  </tr>
                                  <tr>
                                    <td className="p-2 font-medium text-indigo-600">Jantar</td>
                                    {daysOfWeek.map(day => (
                                      <td key={day.value} className="p-2 text-muted-foreground">
                                        {mockWeeklyMenu.bercario[day.value as keyof typeof mockWeeklyMenu.bercario]?.dinner?.slice(0, 20)}...
                                      </td>
                                    ))}
                                  </tr>
                                </>
                              ) : (
                                <>
                                  <tr className="border-b">
                                    <td className="p-2 font-medium text-amber-600">Café</td>
                                    {daysOfWeek.map(day => (
                                      <td key={day.value} className="p-2 text-muted-foreground">
                                        {mockWeeklyMenu.maternal[day.value as keyof typeof mockWeeklyMenu.maternal]?.breakfast?.slice(0, 20)}...
                                      </td>
                                    ))}
                                  </tr>
                                  <tr className="border-b">
                                    <td className="p-2 font-medium text-green-600">Almoço</td>
                                    {daysOfWeek.map(day => (
                                      <td key={day.value} className="p-2 text-muted-foreground">
                                        {mockWeeklyMenu.maternal[day.value as keyof typeof mockWeeklyMenu.maternal]?.lunch?.slice(0, 20)}...
                                      </td>
                                    ))}
                                  </tr>
                                  <tr>
                                    <td className="p-2 font-medium text-indigo-600">Jantar</td>
                                    {daysOfWeek.map(day => (
                                      <td key={day.value} className="p-2 text-muted-foreground">
                                        {mockWeeklyMenu.maternal[day.value as keyof typeof mockWeeklyMenu.maternal]?.dinner?.slice(0, 20)}...
                                      </td>
                                    ))}
                                  </tr>
                                </>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                {/* Meal Tracking Tab */}
                <TabsContent value="refeicoes" className="mt-0">
                  {/* Class Sub-tabs */}
                  <div className="flex flex-wrap gap-2 mb-4 p-1 bg-muted/50 rounded-lg">
                    {mealClassTabs.map((tab) => (
                      <Button
                        key={tab.key}
                        variant={selectedMealClass === tab.key ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setSelectedMealClass(tab.key)}
                        className="relative"
                      >
                        {tab.label}
                        <Badge 
                          variant="secondary" 
                          className="ml-2 h-5 min-w-[1.25rem] px-1.5 text-[10px]"
                        >
                          {getClassChildrenCount(tab.key)}
                        </Badge>
                      </Button>
                    ))}
                  </div>

                  {/* Search */}
                  <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar criança..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9"
                    />
                  </div>

                  {/* Current Meal Indicator with Mark All */}
                  <div className="mb-4 p-3 bg-primary/5 border border-primary/20 rounded-lg">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-primary" />
                        <span className="font-medium text-primary">
                          Refeição atual: {mealTypes.find(m => m.key === currentMeal)?.label}
                        </span>
                      </div>
                      <Button 
                        size="sm"
                        variant={areAllMealsMarked(currentMeal) ? "outline" : "default"}
                        onClick={() => markAllMeals(currentMeal, !areAllMealsMarked(currentMeal))}
                        className="gap-2"
                      >
                        {areAllMealsMarked(currentMeal) ? (
                          <>
                            <CheckCircle2 className="w-4 h-4" />
                            Desmarcar Todas
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-4 h-4" />
                            Marcar Todas ({selectedMealClass === "todas" ? "Todas as turmas" : classLabels[selectedMealClass]})
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Meal Quick Actions */}
                  <div className="mb-4 grid grid-cols-5 gap-2">
                    {mealTypes.map((meal) => {
                      const MealIcon = meal.icon;
                      const allMarked = areAllMealsMarked(meal.key);
                      const isCurrent = meal.key === currentMeal;
                      return (
                        <div
                          key={meal.key}
                          onClick={() => markAllMeals(meal.key, !allMarked)}
                          className={`flex flex-col items-center p-2 rounded-lg cursor-pointer transition-all border-2 ${
                            allMarked
                              ? "bg-pimpo-green/20 border-pimpo-green"
                              : isCurrent
                              ? "bg-primary/10 border-primary"
                              : "bg-muted/30 border-transparent hover:border-muted-foreground/30"
                          }`}
                          title={`Marcar ${meal.label} para ${selectedMealClass === "todas" ? "todas as turmas" : classLabels[selectedMealClass]}`}
                        >
                          {allMarked ? (
                            <CheckCircle2 className="w-5 h-5 text-pimpo-green" />
                          ) : (
                            <MealIcon className={`w-5 h-5 ${isCurrent ? "text-primary" : "text-muted-foreground"}`} />
                          )}
                          <span className="text-[10px] mt-1 text-center font-medium">
                            {meal.label.split(" ")[0]}
                          </span>
                          <span className="text-[9px] text-muted-foreground">
                            Marcar todas
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  <ScrollArea className="h-[350px]">
                    <div className="space-y-2">
                      {filteredMealChildren.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <UtensilsCrossed className="w-12 h-12 mx-auto mb-2 opacity-30" />
                          <p>Nenhuma criança encontrada</p>
                        </div>
                      ) : (
                        filteredMealChildren.map((child) => (
                          <div
                            key={child.id}
                            className={`p-3 rounded-lg border ${
                              child.allergies || child.dietaryRestrictions
                                ? "bg-destructive/5 border-destructive/20"
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
                                        ? "bg-primary/10 border-2 border-primary/50"
                                        : "bg-muted/50 border border-transparent hover:border-muted-foreground/20"
                                    }`}
                                  >
                                    {isServed ? (
                                      <CheckCircle2 className="w-5 h-5 text-pimpo-green" />
                                    ) : (
                                      <MealIcon className={`w-5 h-5 ${isCurrent ? "text-primary" : "text-muted-foreground"}`} />
                                    )}
                                    <span className="text-[10px] mt-1 text-center">
                                      {meal.label.split(" ")[0]}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))
                      )}
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

                    {/* AI Suggestions */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Sparkles className="w-3 h-3" />
                          Sugestões de IA
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={generateStaffSuggestions}
                          disabled={isLoadingStaffSuggestions}
                          className="h-7 text-xs"
                        >
                          {isLoadingStaffSuggestions ? (
                            <>
                              <Sparkles className="w-3 h-3 mr-1 animate-pulse" />
                              Gerando...
                            </>
                          ) : (
                            <>
                              <Wand2 className="w-3 h-3 mr-1" />
                              Sugerir
                            </>
                          )}
                        </Button>
                      </div>
                      {staffSuggestions.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {staffSuggestions.map((suggestion, idx) => (
                            <Button
                              key={idx}
                              variant="outline"
                              size="sm"
                              className="h-auto py-1.5 px-3 text-xs text-left whitespace-normal"
                              onClick={() => setStaffChatMessage(suggestion)}
                            >
                              {suggestion}
                            </Button>
                          ))}
                        </div>
                      )}
                    </div>

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

        {/* Shopping List Widget */}
        <Card className="shadow-lg mt-6">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-primary" />
                Lista de Compras
              </div>
              <Badge variant="secondary">
                {shoppingList.filter(item => !item.checked).length} pendentes
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* AI Suggestions for Shopping */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  Sugestões baseadas no cardápio e restrições
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={generateShoppingSuggestions}
                  disabled={isLoadingShoppingSuggestions}
                  className="h-7 text-xs"
                >
                  {isLoadingShoppingSuggestions ? (
                    <>
                      <Sparkles className="w-3 h-3 mr-1 animate-pulse" />
                      Gerando...
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-3 h-3 mr-1" />
                      Sugerir itens
                    </>
                  )}
                </Button>
              </div>
              {shoppingSuggestions.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {shoppingSuggestions.map((suggestion, idx) => (
                    <Button
                      key={idx}
                      variant="outline"
                      size="sm"
                      className="h-auto py-1.5 px-3 text-xs gap-1"
                      onClick={() => addShoppingItem(suggestion, true)}
                    >
                      <Plus className="w-3 h-3" />
                      {suggestion}
                    </Button>
                  ))}
                </div>
              )}
            </div>

            {/* Add new item */}
            <div className="flex gap-2 flex-wrap sm:flex-nowrap">
              <Input
                placeholder="Nome do item"
                value={newShoppingItem}
                onChange={(e) => setNewShoppingItem(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addShoppingItem(newShoppingItem, false)}
                className="flex-1 min-w-[120px]"
              />
              <div className="flex gap-2">
                <Input
                  placeholder="Qtd"
                  type="number"
                  min="1"
                  value={newShoppingQuantity}
                  onChange={(e) => setNewShoppingQuantity(e.target.value)}
                  className="w-20"
                />
                <Select value={newShoppingUnit} onValueChange={setNewShoppingUnit}>
                  <SelectTrigger className="w-[100px]">
                    <SelectValue placeholder="Unidade" />
                  </SelectTrigger>
                  <SelectContent>
                    {unitOptions.map((unit) => (
                      <SelectItem key={unit.value} value={unit.value}>
                        {unit.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={() => addShoppingItem(newShoppingItem, false)} disabled={!newShoppingItem.trim()}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Shopping List */}
            <ScrollArea className="h-[250px]">
              <div className="space-y-2">
                {shoppingList.map((item) => (
                  <div
                    key={item.id}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      item.checked ? "bg-muted/50 opacity-60" : "bg-card"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={item.checked}
                        onCheckedChange={() => toggleShoppingItem(item.id)}
                      />
                      <div>
                        <p className={`text-sm font-medium ${item.checked ? "line-through" : ""}`}>
                          {item.name}
                        </p>
                        <p className="text-xs text-muted-foreground">{item.quantity}</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => removeShoppingItem(item.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* Summary */}
            <div className="flex justify-between text-sm pt-2 border-t">
              <span className="text-muted-foreground">
                Total: {shoppingList.length} itens
              </span>
              <span className="text-primary font-medium">
                Comprados: {shoppingList.filter(item => item.checked).length}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Mini Calendar */}
        <DemoMiniCalendar />
      </main>
    </div>
  );
}
