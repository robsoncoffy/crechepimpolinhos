import { memo } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { LogOut, LayoutDashboard, Home } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { DashboardViewToggle } from "../DashboardViewToggle";
import { useDashboardView } from "@/hooks/useDashboardView";
import { SidebarMenuSection } from "./SidebarMenuSection";
import {
  studentItems,
  routineItems,
  communicationItems,
  registrationItems,
  teamFinanceItems,
  systemItems,
} from "./menuConfig";

function AdminSidebarComponent() {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, profile, roles } = useAuth();
  const { currentView, availableViews } = useDashboardView();
  const { state } = useSidebar();
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

  const roleLabel = getRoleLabel();
  const showHeaderToggle = availableViews.length > 1;
  const isDashboardActive = location.pathname === "/painel";

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      {/* Header */}
      <SidebarHeader className="border-b border-sidebar-border">
        <div
          className={cn(
            "flex items-center gap-3 px-2 py-3",
            isCollapsed && "justify-center"
          )}
        >
          <img
            alt="Pimpolinhos"
            className={cn(
              "transition-all duration-200 object-contain",
              isCollapsed ? "h-16 w-16" : "h-20"
            )}
            src="/lovable-uploads/eed7b86f-7ea7-4bb8-befc-3aefe00dce68.png"
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
          <div
            className={cn(
              "flex items-center gap-3 px-2 py-2",
              isCollapsed && "justify-center"
            )}
          >
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

        {/* Dashboard View Toggle */}
        {showHeaderToggle && (
          <SidebarGroup className="border-b border-sidebar-border pb-2 mb-2">
            <DashboardViewToggle isCollapsed={isCollapsed} />
          </SidebarGroup>
        )}

        {/* Dashboard - Isolated at top */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={isDashboardActive}
                  tooltip="Dashboard"
                >
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
        <SidebarMenuSection items={studentItems} label="Alunos" userRoles={roles} />
        <SidebarMenuSection items={routineItems} label="Rotina" userRoles={roles} />
        <SidebarMenuSection items={communicationItems} label="Comunicação" userRoles={roles} />
        <SidebarMenuSection items={registrationItems} label="Cadastros" userRoles={roles} />
        <SidebarMenuSection items={teamFinanceItems} label="Equipe & Financeiro" userRoles={roles} />
        <SidebarMenuSection items={systemItems} label="Sistema" userRoles={roles} />
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

// Memoize the entire sidebar to prevent unnecessary re-renders
export const AdminSidebar = memo(AdminSidebarComponent);
