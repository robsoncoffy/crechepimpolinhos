import { ReactNode } from "react";
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
  "/painel/config": "Configurações",
};

export function AdminLayout({ children }: AdminLayoutProps) {
  const location = useLocation();
  const currentRoute = routeLabels[location.pathname] || "Painel";
  const isHome = location.pathname === "/painel";

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
          </header>

          {/* Main Content */}
          <main className="flex-1 p-4 lg:p-6 xl:p-8">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
