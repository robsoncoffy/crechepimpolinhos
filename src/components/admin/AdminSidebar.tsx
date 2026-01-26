import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Users, User, Baby, UserCheck, LayoutDashboard, LogOut, MessageSquare, ClipboardList, Settings, TrendingUp, Home, UtensilsCrossed, CalendarDays, Ticket, ClipboardCheck, FileSignature, MessagesSquare, ClipboardPen, FileText, CalendarOff, DollarSign, Clock, Mail, Newspaper, Bell, Inbox, CarFront, Shield, ShoppingCart, GraduationCap, Briefcase, Cog, Calculator, Kanban } from "lucide-react";
import logo from "@/assets/logo-pimpolinhos.png";
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { DashboardViewToggle } from "./DashboardViewToggle";
import { Button } from "@/components/ui/button";
import { useDashboardView } from "@/hooks/useDashboardView";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Menu items organized by category with role restrictions
// roles: which roles can see this item (empty = all staff)

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

// Rotina Escolar (sem Feed - movido para Comunicação)
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
}];

// Comunicação
const communicationItems = [{
  icon: MessagesSquare,
  label: "Chat",
  href: "/painel/chat",
  roles: []
}, {
  icon: Newspaper,
  label: "Feed & Avisos",
  href: "/painel/feed",
  roles: ["admin", "teacher"]
}, {
  icon: Mail,
  label: "E-mails",
  href: "/painel/emails",
  roles: ["admin"]
}, {
  icon: Kanban,
  label: "Pipeline",
  href: "/painel/pipeline",
  roles: ["admin"]
}, {
  icon: Bell,
  label: "Notificações",
  href: "/painel/notificacoes",
  roles: ["admin"]
}];

// Cadastros
const registrationItems = [{
  icon: UserCheck,
  label: "Aprovações",
  href: "/painel/aprovacoes",
  badge: true,
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
}];

// Equipe & Financeiro (unificado)
const teamFinanceItems = [{
  icon: Users,
  label: "Professores",
  href: "/painel/professores",
  roles: ["admin"]
}, {
  icon: Briefcase,
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
  icon: DollarSign,
  label: "Financeiro",
  href: "/painel/financeiro",
  roles: ["admin"]
}, {
  icon: Calculator,
  label: "Orçamentos",
  href: "/painel/orcamentos",
  roles: ["admin"]
}, {
  icon: FileSignature,
  label: "Contratos",
  href: "/painel/contratos",
  roles: ["admin"]
}, {
  icon: FileText,
  label: "Relatórios",
  href: "/painel/relatorios",
  roles: ["admin"]
}];

// Sistema (unificado)
const systemItems = [{
  icon: Settings,
  label: "Configurações",
  href: "/painel/config",
  roles: ["admin"]
}, {
  icon: User,
  label: "Perfis de Usuários",
  href: "/painel/perfis",
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
  const { currentView, setView, availableViews } = useDashboardView();
  const {
    state
  } = useSidebar();
  const isCollapsed = state === "collapsed";


  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  // Determine role label based on current view
  const getRoleLabel = () => {
    const viewLabels: Record<string, string> = {
      admin: "Administrador",
      teacher: "Professor(a)",
      nutritionist: "Nutricionista",
      cook: "Cozinheira",
      pedagogue: "Pedagoga",
      auxiliar: "Auxiliar",
      parent: "Responsável",
    };
    return viewLabels[currentView] || "Funcionário";
  };

  // Filter menu items based on user roles
  const canSeeItem = (itemRoles: string[]) => {
    if (itemRoles.length === 0) return true; // Empty array = all staff can see
    return roles.some(role => itemRoles.includes(role));
  };

  // Filter each category
  const filteredStudents = studentItems.filter(item => canSeeItem(item.roles));
  const filteredRoutine = routineItems.filter(item => canSeeItem(item.roles));
  const filteredCommunication = communicationItems.filter(item => canSeeItem(item.roles));
  const filteredRegistrations = registrationItems.filter(item => canSeeItem(item.roles));
  const filteredTeamFinance = teamFinanceItems.filter(item => canSeeItem(item.roles));
  const filteredSystem = systemItems.filter(item => canSeeItem(item.roles));
  const roleLabel = getRoleLabel();

  // Show toggle in header for users with multiple views
  const showHeaderToggle = availableViews.length > 1;

  // Check if dashboard is active
  const isDashboardActive = location.pathname === "/painel";

  // Helper component for rendering menu sections
  const renderMenuSection = (items: typeof studentItems, label: string) => {
    if (items.length === 0) return null;
    return <SidebarGroup>
        <SidebarGroupLabel className="text-sidebar-foreground/60">
          {label}
        </SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {items.map(item => {
            const isActive = location.pathname === item.href || (location.pathname + location.search) === item.href;
            
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
            {!isCollapsed && (
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-semibold text-sidebar-foreground truncate">
                  {profile?.full_name || "Administrador"}
                </span>
                <span className="text-xs text-sidebar-foreground/70">{roleLabel}</span>
              </div>
            )}
          </div>
        </SidebarGroup>

        {/* Dashboard View Toggle - Always show for users with multiple views */}
        {showHeaderToggle && (
          <SidebarGroup className="border-b border-sidebar-border pb-2 mb-2">
            <DashboardViewToggle isCollapsed={isCollapsed} />
          </SidebarGroup>
        )}

        {/* Dashboard - Item isolado no topo */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isDashboardActive} tooltip="Dashboard">
                  <Link to="/painel">
                    <LayoutDashboard className="h-4 w-4" />
                    <span>Dashboard</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Categorized Navigation */}
        {renderMenuSection(filteredStudents, "Alunos")}
        {renderMenuSection(filteredRoutine, "Rotina")}
        {renderMenuSection(filteredCommunication, "Comunicação")}
        {renderMenuSection(filteredRegistrations, "Cadastros")}
        {renderMenuSection(filteredTeamFinance, "Equipe & Financeiro")}
        {renderMenuSection(filteredSystem, "Sistema")}
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
