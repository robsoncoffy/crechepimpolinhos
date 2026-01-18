import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import {
  Users,
  Baby,
  UserCheck,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  ClipboardList,
  Settings,
  TrendingUp,
  Home,
  UtensilsCrossed,
  Camera,
  CalendarDays,
  Ticket,
  ClipboardCheck,
  CreditCard,
  FileSignature,
  Megaphone,
  MessagesSquare,
} from "lucide-react";
import logo from "@/assets/logo-pimpolinhos.png";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { RoleViewSwitcher } from "./RoleViewSwitcher";

// Menu items with role restrictions
// roles: which roles can see this item (empty = all staff)
const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/painel", roles: [] },
  { icon: UserCheck, label: "Aprovações", href: "/painel/aprovacoes", badge: true, roles: ["admin"] },
  { icon: Users, label: "Professores", href: "/painel/professores", roles: ["admin"] },
  { icon: Baby, label: "Crianças", href: "/painel/criancas", roles: ["admin", "teacher", "pedagogue", "auxiliar"] },
  { icon: ClipboardCheck, label: "Chamada", href: "/painel/chamada", roles: ["admin", "teacher", "auxiliar"] },
  { icon: ClipboardList, label: "Agenda Digital", href: "/painel/agenda", roles: ["admin", "teacher", "auxiliar", "pedagogue"] },
  { icon: TrendingUp, label: "Crescimento", href: "/painel/crescimento", roles: ["admin", "teacher", "pedagogue"] },
  { icon: MessageSquare, label: "Mensagens Pais", href: "/painel/mensagens", roles: ["admin", "teacher", "auxiliar"] },
  { icon: MessagesSquare, label: "Chat Equipe", href: "/painel/chat-equipe", roles: [] },
  { icon: Megaphone, label: "Avisos", href: "/painel/avisos", roles: ["admin", "teacher"] },
  { icon: CreditCard, label: "Financeiro", href: "/painel/financeiro", roles: ["admin"] },
  { icon: FileSignature, label: "Contratos", href: "/painel/contratos", roles: ["admin"] },
  { icon: UtensilsCrossed, label: "Cardápio", href: "/painel/cardapio", roles: ["admin", "nutritionist", "cook"] },
  { icon: Camera, label: "Galeria", href: "/painel/galeria", roles: ["admin", "teacher"] },
  { icon: CalendarDays, label: "Eventos", href: "/painel/eventos", roles: ["admin", "teacher", "pedagogue"] },
];

const secondaryItems = [
  { icon: Users, label: "Convites de Pais", href: "/painel/convites-pais", roles: ["admin"] },
  { icon: Ticket, label: "Convites de Funcionário", href: "/painel/convites", roles: ["admin"] },
  { icon: Settings, label: "Configurações", href: "/painel/config", roles: ["admin"] },
];

export function AdminSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, profile, roles, isAdmin, isTeacher, isCook, isNutritionist, isPedagogue, isAuxiliar } = useAuth();
  const { state } = useSidebar();
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

  const filteredMenuItems = menuItems.filter(item => canSeeItem(item.roles));
  const filteredSecondaryItems = secondaryItems.filter(item => canSeeItem(item.roles));

  const roleLabel = getRoleLabel();

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      {/* Header */}
      <SidebarHeader className="border-b border-sidebar-border">
        <div className={cn(
          "flex items-center gap-3 px-2 py-3",
          isCollapsed && "justify-center"
        )}>
          <img 
            src={logo} 
            alt="Pimpolinhos" 
            className={cn(
              "transition-all duration-200",
              isCollapsed ? "h-8 w-8" : "h-10"
            )} 
          />
          {!isCollapsed && (
            <div className="flex flex-col">
              <span className="font-fredoka text-lg font-bold text-sidebar-foreground">
                Pimpolinhos
              </span>
              <span className="text-xs text-sidebar-foreground/70">
                Painel Administrativo
              </span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        {/* User Info */}
        <SidebarGroup className="pb-2">
          <div className={cn(
            "flex items-center gap-3 px-2 py-2",
            isCollapsed && "justify-center"
          )}>
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
                <span className="text-xs text-sidebar-foreground/70">
                  {roleLabel}
                </span>
              </div>
            )}
          </div>
        </SidebarGroup>

        {/* Role View Switcher - Only for admins */}
        {isAdmin && (
          <SidebarGroup className="border-b border-sidebar-border pb-4">
            <RoleViewSwitcher isCollapsed={isCollapsed} />
          </SidebarGroup>
        )}

        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/60">
            Menu Principal
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredMenuItems.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.label}
                    >
                      <Link to={item.href}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.label}</span>
                        {item.badge && !isCollapsed && (
                          <Badge 
                            variant="secondary" 
                            className="ml-auto bg-sidebar-foreground/20 text-sidebar-foreground text-xs px-1.5"
                          >
                            Novo
                          </Badge>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Secondary Navigation - Only show if there are items */}
        {filteredSecondaryItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-sidebar-foreground/60">
              Sistema
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {filteredSecondaryItems.map((item) => {
                  const isActive = location.pathname === item.href;
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        tooltip={item.label}
                      >
                        <Link to={item.href}>
                          <item.icon className="h-4 w-4" />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      {/* Footer */}
      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              tooltip="Voltar ao Site"
            >
              <Link to="/">
                <Home className="h-4 w-4" />
                <span>Voltar ao Site</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={handleLogout}
              tooltip="Sair"
              className="text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-destructive/20"
            >
              <LogOut className="h-4 w-4" />
              <span>Sair</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
