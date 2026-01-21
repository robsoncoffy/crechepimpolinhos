import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Users,
  Baby,
  UserCheck,
  Clock,
  ChevronRight,
  TrendingUp,
  Calendar,
  MessageSquare,
  Home,
  Settings,
  FileText,
  Camera,
  Bell,
  Menu,
  LogOut,
  UtensilsCrossed,
  CalendarDays,
  Megaphone,
  CreditCard,
  BookOpen,
  ShoppingCart,
  Plus,
  Trash2,
  RefreshCw,
} from "lucide-react";
import logo from "@/assets/logo-pimpolinhos.png";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { useDemoShoppingList } from "./DemoShoppingListContext";

// Mock stats
const mockStats = {
  totalChildren: 45,
  totalTeachers: 8,
  pendingApprovals: 3,
  todayRecords: 38,
};

const sidebarLinks = [
  { icon: TrendingUp, label: "Dashboard", href: "#" },
  { icon: Clock, label: "Aprovações", href: "#", badge: 3 },
  { icon: Baby, label: "Crianças", href: "#" },
  { icon: Users, label: "Professores", href: "#" },
  { icon: Calendar, label: "Agenda Digital", href: "#" },
  { icon: MessageSquare, label: "Mensagens", href: "#", badge: 5 },
  { icon: BookOpen, label: "Crescimento", href: "#" },
  { icon: UtensilsCrossed, label: "Cardápio", href: "#" },
  { icon: Camera, label: "Galeria", href: "#" },
  { icon: CalendarDays, label: "Eventos", href: "#" },
  { icon: Megaphone, label: "Avisos", href: "#" },
  { icon: CreditCard, label: "Financeiro", href: "#" },
  { icon: UserCheck, label: "Chamada", href: "#" },
  { icon: Settings, label: "Configurações", href: "#" },
];

function Sidebar({ isMobile = false }: { isMobile?: boolean }) {
  return (
    <div className={`flex flex-col h-full ${isMobile ? "" : "border-r"}`}>
      {/* Logo */}
      <div className="p-4 border-b">
        <Link to="/" className="flex items-center gap-3">
          <img src={logo} alt="Pimpolinhos" className="h-10" />
          <span className="font-fredoka text-lg font-bold">Painel Admin</span>
        </Link>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 py-2">
        <nav className="px-2 space-y-1">
          {sidebarLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Button
                key={link.label}
                variant="ghost"
                className="w-full justify-start gap-2"
              >
                <Icon className="w-4 h-4" />
                {link.label}
                {link.badge && (
                  <Badge variant="destructive" className="ml-auto">
                    {link.badge}
                  </Badge>
                )}
              </Button>
            );
          })}
        </nav>
      </ScrollArea>

      {/* User */}
      <div className="p-4 border-t">
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarFallback className="bg-primary text-primary-foreground">A</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">Admin Demo</p>
            <p className="text-xs text-muted-foreground truncate">admin@demo.com</p>
          </div>
        </div>
        <div className="flex gap-2 mt-3">
          <Button variant="outline" size="sm" className="flex-1" asChild>
            <Link to="/">
              <Home className="w-4 h-4 mr-1" />
              Site
            </Link>
          </Button>
          <Button variant="outline" size="sm" className="flex-1">
            <LogOut className="w-4 h-4 mr-1" />
            Sair
          </Button>
        </div>
      </div>
    </div>
  );
}

export function DemoAdminDashboard() {
  // Shopping list from shared context
  const { shoppingList, addShoppingItem, toggleShoppingItem, removeShoppingItem, getPendingCount, getCompletedCount } = useDemoShoppingList();
  const [newShoppingItem, setNewShoppingItem] = useState("");
  const [newShoppingQuantity, setNewShoppingQuantity] = useState("");
  const [newShoppingUnit, setNewShoppingUnit] = useState("kg");

  const unitOptions = [
    { value: "kg", label: "Kg" },
    { value: "g", label: "Gramas" },
    { value: "un", label: "Unidades" },
    { value: "cx", label: "Caixas" },
    { value: "pct", label: "Pacotes" },
    { value: "lt", label: "Litros" },
    { value: "lata", label: "Latas" },
  ];

  const handleAddItem = () => {
    if (!newShoppingItem.trim()) return;
    const qty = newShoppingQuantity.trim() || "1";
    addShoppingItem(newShoppingItem.trim(), `${qty} ${newShoppingUnit}`, "admin");
    setNewShoppingItem("");
    setNewShoppingQuantity("");
  };

  const statCards = [
    {
      title: "Total de Crianças",
      value: mockStats.totalChildren,
      icon: Baby,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Professores Ativos",
      value: mockStats.totalTeachers,
      icon: Users,
      color: "text-pimpo-green",
      bgColor: "bg-pimpo-green/10",
    },
    {
      title: "Aprovações Pendentes",
      value: mockStats.pendingApprovals,
      icon: Clock,
      color: "text-pimpo-yellow",
      bgColor: "bg-pimpo-yellow/10",
      badge: "Novo",
    },
    {
      title: "Agendas Hoje",
      value: mockStats.todayRecords,
      icon: Calendar,
      color: "text-pimpo-red",
      bgColor: "bg-pimpo-red/10",
    },
  ];

  return (
    <div className="min-h-screen bg-background flex relative">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 bg-card">
        <Sidebar />
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Mobile Header */}
        <header className="lg:hidden bg-card border-b sticky top-0 z-40">
          <div className="flex items-center justify-between p-4">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-72">
                <VisuallyHidden>
                  <SheetTitle>Menu de navegação</SheetTitle>
                  <SheetDescription>Menu de navegação do painel administrativo</SheetDescription>
                </VisuallyHidden>
                <Sidebar isMobile />
              </SheetContent>
            </Sheet>
            <img src={logo} alt="Pimpolinhos" className="h-8" />
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center">
                8
              </span>
            </Button>
          </div>
        </header>

        {/* Desktop Header */}
        <header className="hidden lg:flex items-center justify-between p-4 border-b bg-card">
          <div>
            <h1 className="font-fredoka text-2xl font-bold">Dashboard</h1>
            <p className="text-sm text-muted-foreground">Visão geral da Creche Pimpolinhos</p>
          </div>
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center">
              8
            </span>
          </Button>
        </header>

        {/* Content */}
        <main className="flex-1 p-4 lg:p-6 space-y-6">
          {/* Stats Grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {statCards.map((stat) => (
              <Card key={stat.title} className="relative overflow-hidden hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </CardTitle>
                  <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                    <stat.icon className={`w-4 h-4 ${stat.color}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-end justify-between">
                    <div>
                      <div className="text-3xl font-fredoka font-bold">
                        {stat.value}
                      </div>
                      {stat.badge && (
                        <Badge variant="destructive" className="mt-1">
                          {stat.badge}
                        </Badge>
                      )}
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Quick Actions */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-primary" />
                  Ações Rápidas
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3">
                <Button variant="outline" className="w-full justify-between">
                  <span className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Aprovar Cadastros Pendentes
                  </span>
                  <Badge variant="destructive">{mockStats.pendingApprovals}</Badge>
                </Button>
                <Button variant="outline" className="w-full justify-start gap-2">
                  <Baby className="w-4 h-4" />
                  Cadastrar Nova Criança
                </Button>
                <Button variant="outline" className="w-full justify-start gap-2">
                  <Users className="w-4 h-4" />
                  Adicionar Professor
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-pimpo-green" />
                  Resumo do Dia
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <span className="text-sm text-muted-foreground">Data</span>
                    <span className="font-semibold">
                      {new Date().toLocaleDateString("pt-BR", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                      })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <span className="text-sm text-muted-foreground">
                      Agendas preenchidas
                    </span>
                    <span className="font-semibold">
                      {mockStats.todayRecords}/{mockStats.totalChildren}
                    </span>
                  </div>
                  <Button className="w-full mt-2">
                    Ir para Agenda Digital
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Shopping List and Recent Activity Grid */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Shopping List Widget */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="w-5 h-5 text-pimpo-green" />
                    Lista de Compras
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">
                      {getPendingCount()} pendentes
                    </Badge>
                    <Badge variant="outline" className="text-pimpo-green border-pimpo-green">
                      {getCompletedCount()} comprados
                    </Badge>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Add new item */}
                <div className="flex gap-2 flex-wrap sm:flex-nowrap">
                  <Input
                    placeholder="Nome do item"
                    value={newShoppingItem}
                    onChange={(e) => setNewShoppingItem(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddItem()}
                    className="flex-1 min-w-[100px]"
                  />
                  <div className="flex gap-2">
                    <Input
                      placeholder="Qtd"
                      type="number"
                      min="1"
                      value={newShoppingQuantity}
                      onChange={(e) => setNewShoppingQuantity(e.target.value)}
                      className="w-16"
                    />
                    <Select value={newShoppingUnit} onValueChange={setNewShoppingUnit}>
                      <SelectTrigger className="w-[80px]">
                        <SelectValue placeholder="Un" />
                      </SelectTrigger>
                      <SelectContent>
                        {unitOptions.map((unit) => (
                          <SelectItem key={unit.value} value={unit.value}>
                            {unit.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button onClick={handleAddItem} disabled={!newShoppingItem.trim()} size="icon">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Shopping List */}
                <ScrollArea className="h-[200px]">
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
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">{item.quantity}</span>
                              <Badge variant="outline" className="text-[10px] h-4 px-1">
                                {item.addedBy === "admin" ? "Admin" : "Cozinha"}
                              </Badge>
                            </div>
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
                  <span className="text-muted-foreground flex items-center gap-1">
                    <RefreshCw className="w-3 h-3" />
                    Sincronizado com cozinha
                  </span>
                  <span className="text-primary font-medium">
                    Total: {shoppingList.length} itens
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-pimpo-blue" />
                  Atividade Recente
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { action: "Nova pré-matrícula recebida", time: "há 5 min", type: "new" },
                    { action: "Agenda de Maria Silva atualizada", time: "há 15 min", type: "update" },
                    { action: "Professor João enviou mensagem", time: "há 30 min", type: "message" },
                    { action: "Pagamento confirmado - João Pedro", time: "há 1 hora", type: "payment" },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <span className="text-sm">{item.action}</span>
                      <span className="text-xs text-muted-foreground">{item.time}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
