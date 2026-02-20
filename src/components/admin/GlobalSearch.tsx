import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { supabase } from "@/integrations/supabase/client";
import { 
  Baby, 
  Users, 
  User, 
  LayoutDashboard, 
  ClipboardList, 
  MessageSquare, 
  Camera, 
  CalendarDays,
  Settings,
  FileText,
  CalendarOff,
  TrendingUp,
  UtensilsCrossed,
  Loader2,
} from "lucide-react";
import { classTypeLabels } from "@/lib/constants";

interface GlobalSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface SearchResult {
  id: string;
  name: string;
  type: "child" | "parent" | "staff" | "page";
  subtitle?: string;
  href: string;
}

const PAGES = [
  { name: "Dashboard", href: "/painel", icon: LayoutDashboard },
  { name: "Crianças", href: "/painel/criancas", icon: Baby },
  { name: "Professores", href: "/painel/professores", icon: Users },
  { name: "Agenda Digital", href: "/painel/agenda", icon: ClipboardList },
  { name: "Mensagens", href: "/painel/mensagens", icon: MessageSquare },
  { name: "Galeria", href: "/painel/galeria", icon: Camera },
  { name: "Eventos", href: "/painel/eventos", icon: CalendarDays },
  { name: "Cardápio", href: "/painel/cardapio", icon: UtensilsCrossed },
  { name: "Crescimento", href: "/painel/crescimento", icon: TrendingUp },
  { name: "Relatórios", href: "/painel/relatorios", icon: FileText },
  { name: "Férias e Ausências", href: "/painel/ausencias", icon: CalendarOff },
  { name: "Configurações", href: "/painel/config", icon: Settings },
];

export function GlobalSearch({ open, onOpenChange }: GlobalSearchProps) {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [children, setChildren] = useState<SearchResult[]>([]);
  const [profiles, setProfiles] = useState<SearchResult[]>([]);

  // Keyboard shortcut
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [open, onOpenChange]);

  // Search with debounce
  useEffect(() => {
    if (!search || search.length < 2) {
      setChildren([]);
      setProfiles([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        // Search children
        const { data: childrenData } = await supabase
          .from("children")
          .select("id, full_name, class_type")
          .ilike("full_name", `%${search}%`)
          .limit(5);

        if (childrenData) {
          setChildren((childrenData as unknown as Array<{ id: string; full_name: string; class_type: string }>).map(c => ({
            id: c.id,
            name: c.full_name,
            type: "child" as const,
            subtitle: classTypeLabels[c.class_type as keyof typeof classTypeLabels] || c.class_type,
            href: `/painel/criancas?id=${c.id}`,
          })));
        }

        // Search profiles
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .eq("status", "approved")
          .ilike("full_name", `%${search}%`)
          .limit(5);

        if (profilesData) {
          setProfiles((profilesData as unknown as Array<{ user_id: string; full_name: string | null }>).map(p => ({
            id: p.user_id,
            name: p.full_name || "Sem nome",
            type: "staff" as const,
            href: `/painel/perfis?id=${p.user_id}`,
          })));
        }
      } catch (error) {
        console.error("Search error:", error);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [search]);

  const handleSelect = useCallback((href: string) => {
    onOpenChange(false);
    setSearch("");
    navigate(href);
  }, [navigate, onOpenChange]);

  // Filter pages by search
  const filteredPages = PAGES.filter(page => 
    page.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput 
        placeholder="Buscar crianças, perfis ou páginas..." 
        value={search}
        onValueChange={setSearch}
      />
      <CommandList>
        {loading && (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        )}

        <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>

        {/* Pages */}
        {filteredPages.length > 0 && (
          <CommandGroup heading="Páginas">
            {filteredPages.map((page) => (
              <CommandItem
                key={page.href}
                value={page.name}
                onSelect={() => handleSelect(page.href)}
                className="cursor-pointer"
              >
                <page.icon className="mr-2 h-4 w-4 text-muted-foreground" />
                <span>{page.name}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {/* Children */}
        {children.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Crianças">
              {children.map((child) => (
                <CommandItem
                  key={child.id}
                  value={child.name}
                  onSelect={() => handleSelect(child.href)}
                  className="cursor-pointer"
                >
                  <Baby className="mr-2 h-4 w-4 text-muted-foreground" />
                  <div className="flex flex-col">
                    <span>{child.name}</span>
                    {child.subtitle && (
                      <span className="text-xs text-muted-foreground">{child.subtitle}</span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {/* Profiles */}
        {profiles.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Usuários">
              {profiles.map((profile) => (
                <CommandItem
                  key={profile.id}
                  value={profile.name}
                  onSelect={() => handleSelect(profile.href)}
                  className="cursor-pointer"
                >
                  <User className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span>{profile.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}