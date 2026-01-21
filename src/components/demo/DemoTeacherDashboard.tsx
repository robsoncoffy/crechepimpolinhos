import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
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
} from "lucide-react";
import logo from "@/assets/logo-pimpolinhos.png";

// Mock children for the class
const mockChildren = [
  { id: "1", name: "Maria Silva", class: "maternal", hasRecord: true },
  { id: "2", name: "João Pedro", class: "maternal", hasRecord: true },
  { id: "3", name: "Ana Beatriz", class: "maternal", hasRecord: false },
  { id: "4", name: "Lucas Oliveira", class: "maternal", hasRecord: false },
  { id: "5", name: "Sofia Santos", class: "maternal", hasRecord: true },
  { id: "6", name: "Miguel Costa", class: "maternal", hasRecord: false },
];

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
                <TabsList className="w-full h-auto p-0 bg-transparent rounded-none grid grid-cols-3">
                  <TabsTrigger value="agenda" className="rounded-none border-b-2 border-transparent data-[state=active]:border-pimpo-green data-[state=active]:bg-transparent py-3 gap-2">
                    <Calendar className="w-4 h-4" />
                    <span className="hidden sm:inline">Agenda</span>
                  </TabsTrigger>
                  <TabsTrigger value="chamada" className="rounded-none border-b-2 border-transparent data-[state=active]:border-pimpo-green data-[state=active]:bg-transparent py-3 gap-2">
                    <Users className="w-4 h-4" />
                    <span className="hidden sm:inline">Chamada</span>
                  </TabsTrigger>
                  <TabsTrigger value="mensagens" className="rounded-none border-b-2 border-transparent data-[state=active]:border-pimpo-green data-[state=active]:bg-transparent py-3 gap-2 relative">
                    <MessageSquare className="w-4 h-4" />
                    <span className="hidden sm:inline">Mensagens</span>
                    <Badge variant="destructive" className="absolute -top-1 right-2 sm:relative sm:top-0 sm:right-0">
                      3
                    </Badge>
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
                    {mockChildren.map((child) => (
                      <div
                        key={child.id}
                        onClick={() => setSelectedChild(child.id === selectedChild ? null : child.id)}
                        className={`p-3 rounded-lg border cursor-pointer transition-all ${
                          selectedChild === child.id 
                            ? "bg-pimpo-green/10 border-pimpo-green" 
                            : "hover:bg-muted/50"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="bg-primary/10 text-primary text-sm">
                                {child.name.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{child.name}</span>
                          </div>
                          {child.hasRecord ? (
                            <Badge variant="secondary" className="bg-pimpo-green/20 text-pimpo-green">
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Preenchida
                            </Badge>
                          ) : (
                            <Badge variant="outline">Pendente</Badge>
                          )}
                        </div>
                      </div>
                    ))}
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
                          <div className="flex flex-wrap gap-4">
                            <div className="flex items-center gap-2">
                              <Checkbox id="fever" disabled={!editMode} />
                              <label htmlFor="fever" className="text-sm">Teve febre</label>
                            </div>
                            <div className="flex items-center gap-2">
                              <Checkbox id="medicine" disabled={!editMode} />
                              <label htmlFor="medicine" className="text-sm">Tomou remédio</label>
                            </div>
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

                {/* Mensagens Tab */}
                <TabsContent value="mensagens" className="mt-0">
                  <h3 className="font-semibold mb-4">Central de Mensagens</h3>
                  <div className="space-y-3">
                    {[
                      { parent: "João Silva (pai da Maria)", message: "Maria está de parabéns!", time: "há 10 min", unread: true },
                      { parent: "Ana Oliveira (mãe do Lucas)", message: "Lucas pode sair mais cedo hoje?", time: "há 30 min", unread: true },
                      { parent: "Pedro Santos (pai da Sofia)", message: "Obrigado pelo relatório!", time: "há 2 horas", unread: false },
                    ].map((msg, i) => (
                      <div key={i} className={`p-4 rounded-lg border ${msg.unread ? "bg-pimpo-blue/5 border-pimpo-blue/30" : "bg-muted/30"}`}>
                        <div className="flex items-start justify-between mb-1">
                          <span className="font-medium text-sm">{msg.parent}</span>
                          <span className="text-xs text-muted-foreground">{msg.time}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">{msg.message}</p>
                        {msg.unread && (
                          <Badge variant="secondary" className="mt-2 bg-pimpo-blue/20 text-pimpo-blue">
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
