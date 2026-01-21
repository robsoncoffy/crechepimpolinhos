import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
} from "lucide-react";
import { Input } from "@/components/ui/input";
import logo from "@/assets/logo-pimpolinhos.png";

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

export function DemoTeacherDashboard() {
  const [activeTab, setActiveTab] = useState("agenda");
  const [selectedChild, setSelectedChild] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [tookMedicine, setTookMedicine] = useState(false);

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
        <div className="mb-6">
          <h1 className="font-fredoka text-2xl sm:text-3xl font-bold">
            Olá, Professora Ana! 👋
          </h1>
          <p className="text-muted-foreground">
            Turma Maternal • {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
          </p>
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
                  <div className="grid md:grid-cols-3 gap-4">
                    {/* Children List */}
                    <div className="md:col-span-1 space-y-2">
                      <p className="text-sm text-muted-foreground mb-2">Selecione uma criança:</p>
                      {mockChildren.map((child) => (
                        <div
                          key={child.id}
                          className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer"
                        >
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={child.photo} alt={child.name} />
                            <AvatarFallback className="bg-primary/10 text-primary text-xs">
                              {child.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{child.name}</p>
                          </div>
                          {child.id === "2" && (
                            <Badge variant="destructive" className="h-5 px-1.5 text-xs">2</Badge>
                          )}
                        </div>
                      ))}
                    </div>
                    
                    {/* Chat Area */}
                    <div className="md:col-span-2 border rounded-lg p-4 min-h-[300px] flex flex-col">
                      <div className="text-center text-muted-foreground py-12">
                        <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-30" />
                        <h4 className="font-semibold mb-1">Selecione uma criança</h4>
                        <p className="text-sm">Escolha uma criança para ver as mensagens dos pais</p>
                      </div>
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
                  <div className="space-y-3">
                    {[
                      { sender: "Diretora Maria", message: "Reunião pedagógica amanhã às 14h", time: "há 10 min", unread: true },
                      { sender: "Nutricionista Ana", message: "Cardápio atualizado para a semana", time: "há 1 hora", unread: false },
                      { sender: "Coordenadora Lucia", message: "Fotos do evento disponíveis na galeria", time: "há 2 horas", unread: false },
                    ].map((msg, i) => (
                      <div key={i} className={`p-4 rounded-lg border ${msg.unread ? "bg-primary/5 border-primary/30" : "bg-muted/30"}`}>
                        <div className="flex items-start justify-between mb-1">
                          <span className="font-medium text-sm">{msg.sender}</span>
                          <span className="text-xs text-muted-foreground">{msg.time}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">{msg.message}</p>
                        {msg.unread && (
                          <Badge variant="secondary" className="mt-2 bg-primary/20 text-primary">
                            Nova mensagem
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
