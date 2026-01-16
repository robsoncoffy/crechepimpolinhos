import { ReactNode, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  Users,
  Baby,
  UserCheck,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  ClipboardList,
  ChevronRight,
  Settings,
  TrendingUp,
} from "lucide-react";
import logo from "@/assets/logo-pimpolinhos.png";
import { cn } from "@/lib/utils";

interface AdminLayoutProps {
  children: ReactNode;
}

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/painel" },
  { icon: UserCheck, label: "Aprovações", href: "/painel/aprovacoes" },
  { icon: Users, label: "Professores", href: "/painel/professores" },
  { icon: Baby, label: "Crianças", href: "/painel/criancas" },
  { icon: ClipboardList, label: "Agenda", href: "/painel/agenda" },
  { icon: TrendingUp, label: "Crescimento", href: "/painel/crescimento" },
  { icon: MessageSquare, label: "Mensagens", href: "/painel/mensagens" },
  { icon: Settings, label: "Configurações", href: "/painel/config" },
];

function SidebarContent({ onItemClick }: { onItemClick?: () => void }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, profile } = useAuth();

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-6 border-b">
        <Link to="/" className="flex items-center gap-3">
          <img src={logo} alt="Pimpolinhos" className="h-10" />
          <span className="font-fredoka text-lg font-bold text-foreground">
            Pimpolinhos
          </span>
        </Link>
      </div>

      {/* User Info */}
      <div className="p-4 border-b bg-muted/30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="font-fredoka text-primary font-bold">
              {profile?.full_name?.charAt(0).toUpperCase() || "A"}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate">
              {profile?.full_name || "Administrador"}
            </p>
            <p className="text-xs text-muted-foreground">Administrador</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-1">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={onItemClick}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon className="w-5 h-5" />
                <span className="flex-1">{item.label}</span>
                {isActive && <ChevronRight className="w-4 h-4" />}
              </Link>
            );
          })}
        </nav>
      </ScrollArea>

      {/* Logout */}
      <div className="p-4 border-t">
        <Button
          variant="ghost"
          className="w-full justify-start text-muted-foreground hover:text-foreground"
          onClick={handleLogout}
        >
          <LogOut className="w-5 h-5 mr-3" />
          Sair
        </Button>
      </div>
    </div>
  );
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-50 lg:flex lg:w-64 lg:flex-col bg-card border-r shadow-sm">
        <SidebarContent />
      </aside>

      {/* Mobile Header */}
      <header className="lg:hidden sticky top-0 z-40 flex items-center gap-4 bg-card border-b px-4 py-3 shadow-sm">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="w-5 h-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-64">
            <SidebarContent onItemClick={() => setMobileOpen(false)} />
          </SheetContent>
        </Sheet>
        <img src={logo} alt="Pimpolinhos" className="h-8" />
      </header>

      {/* Main Content */}
      <main className="lg:pl-64">
        <div className="container py-6 lg:py-8">{children}</div>
      </main>
    </div>
  );
}
