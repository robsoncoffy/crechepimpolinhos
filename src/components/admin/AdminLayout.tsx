import { ReactNode, useState } from "react";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AdminSidebar } from "./AdminSidebar";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { useLocation } from "react-router-dom";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { GlobalSearch } from "./GlobalSearch";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";

interface AdminLayoutProps {
  children: ReactNode;
}

const routeLabels: Record<string, string> = {
  "/painel": "Dashboard",
  "/painel/aprovacoes": "Aprovações",
  "/painel/professores": "Professores",
  "/painel/criancas": "Crianças",
  "/painel/agenda": "Agenda Digital",
  "/painel/crescimento": "Crescimento",
  "/painel/mensagens": "Mensagens",
  "/painel/cardapio": "Cardápio",
  "/painel/galeria": "Galeria",
  "/painel/eventos": "Eventos",
  "/painel/convites": "Convites de Funcionário",
  "/painel/config": "Configurações",
  "/painel/relatorios": "Relatórios",
  "/painel/ausencias": "Férias/Ausências",
  "/painel/financeiro": "Financeiro",
  "/painel/ponto": "Ponto Eletrônico",
};

export function AdminLayout({ children }: AdminLayoutProps) {
  const location = useLocation();
  const currentRoute = routeLabels[location.pathname] || "Painel";
  const isHome = location.pathname === "/painel";
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AdminSidebar />
        <SidebarInset className="flex-1">
          {/* Header */}
          <header className="flex h-14 lg:h-16 shrink-0 items-center gap-2 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 lg:px-6 sticky top-0 z-30">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href="/painel">
                    Painel
                  </BreadcrumbLink>
                </BreadcrumbItem>
                {!isHome && (
                  <>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      <BreadcrumbPage>{currentRoute}</BreadcrumbPage>
                    </BreadcrumbItem>
                  </>
                )}
              </BreadcrumbList>
            </Breadcrumb>
            
            {/* Search Button + Notification Bell */}
            <div className="ml-auto flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setSearchOpen(true)} 
                className="gap-2 hidden sm:flex"
              >
                <Search className="w-4 h-4" />
                <span className="hidden md:inline">Buscar...</span>
                <kbd className="hidden lg:inline pointer-events-none text-xs bg-muted px-1.5 py-0.5 rounded">⌘K</kbd>
              </Button>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setSearchOpen(true)} 
                className="sm:hidden"
              >
                <Search className="w-4 h-4" />
              </Button>
              <NotificationBell />
            </div>
          </header>
          
          {/* Global Search */}
          <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />

          {/* Main Content */}
          <main className="flex-1 p-4 lg:p-6 xl:p-8 overflow-x-hidden">
            <div className="w-full max-w-full">
              {children}
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
