import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Users, User, Baby, UserCheck, LayoutDashboard, LogOut, MessageSquare, ClipboardList, Settings, TrendingUp, Home, UtensilsCrossed, Camera, CalendarDays, Ticket, ClipboardCheck, FileSignature, Megaphone, MessagesSquare, ClipboardPen, FileText, CalendarOff, DollarSign, Clock, Mail, Newspaper, Bell, Inbox, CarFront, Shield, ShoppingCart } from "lucide-react";
import logo from "@/assets/logo-pimpolinhos.png";
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { RoleViewSwitcher } from "./RoleViewSwitcher";

// Menu items organized by category with role restrictions
// roles: which roles can see this item (empty = all staff)

import { GraduationCap } from "lucide-react";

// Dashboard
const dashboardItems = [{
  icon: LayoutDashboard,
  label: "Dashboard",
  href: "/painel",
  roles: []
}];

// Gestão de Alunos
const studentItems = [{
  icon: Baby,
  label: "Crianças",
  href: "/painel/criancas",
  roles: ["admin", "teacher", "pedagogue", "auxiliar"]
}, {
  icon: ClipboardCheck,
  label: "Chamada",
  href: "/painel/chamada",
  roles: ["admin", "teacher", "auxiliar"]
}, {
  icon: TrendingUp,
  label: "Crescimento",
  href: "/painel/crescimento",
  roles: ["admin", "teacher", "pedagogue"]
}, {
  icon: GraduationCap,
  label: "Avaliações Plus+",
  href: "/painel/avaliacoes",
  roles: ["admin", "pedagogue"]
}];

// Rotina Escolar
const routineItems = [{
  icon: ClipboardList,
  label: "Agenda Digital",
  href: "/painel/agenda",
  roles: ["admin", "teacher", "auxiliar", "pedagogue"]
}, {
  icon: UtensilsCrossed,
  label: "Cardápio",
  href: "/painel/cardapio",
  roles: ["admin", "nutritionist", "cook"]
}, {
  icon: ShoppingCart,
  label: "Lista de Compras",
  href: "/painel/lista-compras",
  roles: ["admin", "cook", "nutritionist"]
}, {
  icon: CalendarDays,
  label: "Eventos",
  href: "/painel/eventos",
  roles: ["admin", "teacher", "pedagogue"]
}, {
  icon: Camera,
  label: "Galeria",
  href: "/painel/galeria",
  roles: ["admin", "teacher"]
}, {
  icon: Newspaper,
  label: "Feed da Escola",
  href: "/painel/feed",
  roles: ["admin", "teacher"]
}];

// Comunicação
const communicationItems = [{
  icon: MessageSquare,
  label: "Mensagens Pais",
  href: "/painel/mensagens",
  roles: ["admin", "nutritionist"]
}, {
  icon: MessagesSquare,
  label: "Chat Equipe",
  href: "/painel/chat-equipe",
  roles: []
}, {
  icon: Megaphone,
  label: "Avisos",
  href: "/painel/avisos",
  roles: ["admin", "teacher"]
}, {
  icon: Mail,
  label: "E-mails",
  href: "/painel/emails",
  roles: ["admin"]
}, {
  icon: Bell,
  label: "Notificações",
  href: "/painel/notificacoes",
  roles: ["admin"]
}];

// Administrativo
const adminItems = [{
  icon: UserCheck,
  label: "Aprovações",
  href: "/painel/aprovacoes",
  badge: true,
  roles: ["admin"]
}, {
  icon: Users,
  label: "Professores",
  href: "/painel/professores",
  roles: ["admin"]
}, {
  icon: FileSignature,
  label: "Contratos",
  href: "/painel/contratos",
  roles: ["admin"]
}, {
  icon: ClipboardPen,
  label: "Pré-Matrículas",
  href: "/painel/pre-matriculas",
  roles: ["admin"]
}, {
  icon: User,
  label: "Perfis de Usuários",
  href: "/painel/perfis",
  roles: ["admin"]
}, {
  icon: Users,
  label: "Convites de Pais",
  href: "/painel/convites-pais",
  roles: ["admin"]
}, {
  icon: Ticket,
  label: "Convites Funcionário",
  href: "/painel/convites",
  roles: ["admin"]
}, {
  icon: Inbox,
  label: "Formulário Contato",
  href: "/painel/contatos",
  roles: ["admin"]
}, {
  icon: CarFront,
  label: "Histórico Retiradas",
  href: "/painel/historico-retiradas",
  roles: ["admin"]
}];

// Financeiro & RH
const financeHrItems = [{
  icon: DollarSign,
  label: "Financeiro",
  href: "/painel/financeiro",
  roles: ["admin"]
}, {
  icon: Users,
  label: "Funcionários",
  href: "/painel/funcionarios",
  roles: ["admin"]
}, {
  icon: Clock,
  label: "Ponto Eletrônico",
  href: "/painel/ponto",
  roles: ["admin"]
}, {
  icon: CalendarOff,
  label: "Férias/Ausências",
  href: "/painel/ausencias",
  roles: ["admin"]
}, {
  icon: FileText,
  label: "Relatórios",
  href: "/painel/relatorios",
  roles: ["admin"]
}];

// Configurações e Sistema
const settingsItems = [{
  icon: Settings,
  label: "Configurações",
  href: "/painel/config",
  roles: ["admin"]
}, {
  icon: Mail,
  label: "Logs de E-mail",
  href: "/painel/logs-email",
  roles: ["admin"]
}, {
  icon: Shield,
  label: "Logs de Auditoria",
  href: "/painel/logs-auditoria",
  roles: ["admin"]
}];
export function AdminSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    signOut,
    profile,
    roles,
    isAdmin,
    isTeacher,
    isCook,
    isNutritionist,
    isPedagogue,
    isAuxiliar
  } = useAuth();
  const {
    state
  } = useSidebar();
  const isCollapsed = state === "collapsed";
  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  // Determine role label
  const getRoleLabel = () => {
    if (isAdmin) return "Administrador";
    if (isTeacher) return "Professor(a)";
    if (isNutritionist) return "Nutricionista";
    if (isCook) return "Cozinheira";
    if (isPedagogue) return "Pedagoga";
    if (isAuxiliar) return "Auxiliar";
    return "Funcionário";
  };

  // Filter menu items based on user roles
  const canSeeItem = (itemRoles: string[]) => {
    if (itemRoles.length === 0) return true; // Empty array = all staff can see
    return roles.some(role => itemRoles.includes(role));
  };

  // Filter each category
  const filteredDashboard = dashboardItems.filter(item => canSeeItem(item.roles));
  const filteredStudents = studentItems.filter(item => canSeeItem(item.roles));
  const filteredRoutine = routineItems.filter(item => canSeeItem(item.roles));
  const filteredCommunication = communicationItems.filter(item => canSeeItem(item.roles));
  const filteredAdmin = adminItems.filter(item => canSeeItem(item.roles));
  const filteredFinanceHr = financeHrItems.filter(item => canSeeItem(item.roles));
  const filteredSettings = settingsItems.filter(item => canSeeItem(item.roles));
  const roleLabel = getRoleLabel();

  // Helper component for rendering menu sections
  const renderMenuSection = (items: typeof dashboardItems, label: string) => {
    if (items.length === 0) return null;
    return <SidebarGroup>
        <SidebarGroupLabel className="text-sidebar-foreground/60">
          {label}
        </SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {items.map(item => {
            const isActive = location.pathname === item.href;
            return <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild isActive={isActive} tooltip={item.label}>
                    <Link to={item.href}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.label}</span>
                      {"badge" in item && item.badge && !isCollapsed && <Badge variant="secondary" className="ml-auto bg-sidebar-foreground/20 text-sidebar-foreground text-xs px-1.5">
                          Novo
                        </Badge>}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>;
          })}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>;
  };
  return <Sidebar collapsible="icon" className="border-r-0">
      {/* Header */}
      <SidebarHeader className="border-b border-sidebar-border">
        <div className={cn("flex items-center gap-3 px-2 py-3", isCollapsed && "justify-center")}>
          <img alt="Pimpolinhos" className={cn("transition-all duration-200 object-contain", isCollapsed ? "h-16 w-16" : "h-20")} src="/lovable-uploads/eed7b86f-7ea7-4bb8-befc-3aefe00dce68.png" />
          {!isCollapsed && <div className="flex flex-col">
              <span className="font-fredoka text-lg font-bold text-sidebar-foreground">
                Pimpolinhos
              </span>
              <span className="text-xs text-sidebar-foreground/70">
                Painel Administrativo
              </span>
            </div>}
        </div>
      </SidebarHeader>

      <SidebarContent>
        {/* User Info */}
        <SidebarGroup className="pb-2">
          <div className={cn("flex items-center gap-3 px-2 py-2", isCollapsed && "justify-center")}>
            <Avatar className="h-9 w-9 ring-2 ring-sidebar-foreground/20">
              <AvatarImage src={profile?.avatar_url || undefined} />
              <AvatarFallback className="bg-sidebar-accent text-sidebar-accent-foreground font-fredoka">
                {profile?.full_name?.charAt(0).toUpperCase() || "A"}
              </AvatarFallback>
            </Avatar>
            {!isCollapsed && <div className="flex flex-col min-w-0">
                <span className="text-sm font-semibold text-sidebar-foreground truncate">
                  {profile?.full_name || "Administrador"}
                </span>
                <span className="text-xs text-sidebar-foreground/70">
                  {roleLabel}
                </span>
              </div>}
          </div>
        </SidebarGroup>

        {/* Categorized Navigation */}
        {renderMenuSection(filteredDashboard, "Início")}
        {renderMenuSection(filteredStudents, "Gestão de Alunos")}
        {renderMenuSection(filteredRoutine, "Rotina Escolar")}
        {renderMenuSection(filteredCommunication, "Comunicação")}
        {renderMenuSection(filteredAdmin, "Administrativo")}
        {renderMenuSection(filteredFinanceHr, "Financeiro & RH")}
        {renderMenuSection(filteredSettings, "Configurações")}
        
        {/* Role View Switcher - Only for Admins */}
        {isAdmin && (
          <SidebarGroup className="border-t border-sidebar-border mt-2 pt-2">
            <RoleViewSwitcher isCollapsed={isCollapsed} />
          </SidebarGroup>
        )}
      </SidebarContent>

      {/* Footer */}
      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Voltar ao Site">
              <Link to="/">
                <Home className="h-4 w-4" />
                <span>Voltar ao Site</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleLogout} tooltip="Sair" className="text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-destructive/20">
              <LogOut className="h-4 w-4" />
              <span>Sair</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>;
}