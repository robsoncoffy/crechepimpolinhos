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

import { Megaphone } from "lucide-react";

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/painel" },
  { icon: UserCheck, label: "Aprovações", href: "/painel/aprovacoes", badge: true },
  { icon: Users, label: "Professores", href: "/painel/professores" },
  { icon: Baby, label: "Crianças", href: "/painel/criancas" },
  { icon: ClipboardCheck, label: "Chamada", href: "/painel/chamada" },
  { icon: ClipboardList, label: "Agenda Digital", href: "/painel/agenda" },
  { icon: TrendingUp, label: "Crescimento", href: "/painel/crescimento" },
  { icon: MessageSquare, label: "Mensagens", href: "/painel/mensagens" },
  { icon: Megaphone, label: "Avisos", href: "/painel/avisos" },
  { icon: UtensilsCrossed, label: "Cardápio", href: "/painel/cardapio" },
  { icon: Camera, label: "Galeria", href: "/painel/galeria" },
  { icon: CalendarDays, label: "Eventos", href: "/painel/eventos" },
];

const secondaryItems = [
  { icon: Users, label: "Convites de Pais", href: "/painel/convites-pais" },
  { icon: Ticket, label: "Convites de Funcionário", href: "/painel/convites" },
  { icon: Settings, label: "Configurações", href: "/painel/config" },
];

export function AdminSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, profile, isAdmin, isTeacher } = useAuth();
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  const roleLabel = isAdmin ? "Administrador" : isTeacher ? "Professor(a)" : "Usuário";

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
        <SidebarGroup className="border-b border-sidebar-border pb-4">
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

        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/60">
            Menu Principal
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
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

        {/* Secondary Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/60">
            Sistema
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {secondaryItems.map((item) => {
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
