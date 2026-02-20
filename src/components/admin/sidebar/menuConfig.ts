import {
  Users,
  User,
  Baby,
  UserCheck,
  LayoutDashboard,
  MessageSquare,
  ClipboardList,
  Settings,
  TrendingUp,
  Home,
  UtensilsCrossed,
  CalendarDays,
  Ticket,
  ClipboardCheck,
  FileSignature,
  MessagesSquare,
  ClipboardPen,
  FileText,
  CalendarOff,
  DollarSign,
  Clock,
  Mail,
  Newspaper,
  Bell,
  Inbox,
  CarFront,
  Shield,
  ShoppingCart,
  GraduationCap,
  Briefcase,
  Calculator,
  Kanban,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface MenuItem {
  icon: LucideIcon;
  label: string;
  href: string;
  roles: string[];
  badge?: boolean;
}

// Gestão de Alunos
export const studentItems: MenuItem[] = [
  {
    icon: Baby,
    label: "Crianças",
    href: "/painel/criancas",
    roles: ["admin", "diretor", "teacher", "pedagogue", "auxiliar"],
  },
  {
    icon: ClipboardCheck,
    label: "Chamada",
    href: "/painel/chamada",
    roles: ["admin", "diretor", "teacher", "auxiliar"],
  },
  {
    icon: TrendingUp,
    label: "Crescimento",
    href: "/painel/crescimento",
    roles: ["admin", "diretor", "teacher", "pedagogue"],
  },
  {
    icon: GraduationCap,
    label: "Avaliações Plus+",
    href: "/painel/avaliacoes",
    roles: ["admin", "diretor", "pedagogue"],
  },
];

// Rotina Escolar
export const routineItems: MenuItem[] = [
  {
    icon: ClipboardList,
    label: "Agenda Digital",
    href: "/painel/agenda",
    roles: ["admin", "diretor", "teacher", "auxiliar", "pedagogue"],
  },
  {
    icon: UtensilsCrossed,
    label: "Cardápio",
    href: "/painel/cardapio",
    roles: ["admin", "diretor", "nutritionist", "cook"],
  },
  {
    icon: ShoppingCart,
    label: "Lista de Compras",
    href: "/painel/lista-compras",
    roles: ["admin", "diretor", "cook", "nutritionist"],
  },
  {
    icon: CalendarDays,
    label: "Calendário",
    href: "/painel/calendario",
    roles: ["admin", "diretor", "teacher", "pedagogue"],
  },
];

// Comunicação
export const communicationItems: MenuItem[] = [
  {
    icon: MessagesSquare,
    label: "Chat",
    href: "/painel/chat",
    roles: [],
  },
  {
    icon: Newspaper,
    label: "Feed & Avisos",
    href: "/painel/feed",
    roles: ["admin", "diretor", "teacher"],
  },
  {
    icon: Mail,
    label: "E-mails",
    href: "/painel/emails",
    roles: ["admin", "diretor"],
  },
  {
    icon: Kanban,
    label: "Pipeline",
    href: "/painel/pipeline",
    roles: ["admin", "diretor"],
  },
  {
    icon: Bell,
    label: "Notificações",
    href: "/painel/notificacoes",
    roles: ["admin", "diretor"],
  },
];

// Cadastros
export const registrationItems: MenuItem[] = [
  {
    icon: UserCheck,
    label: "Aprovações",
    href: "/painel/aprovacoes",
    badge: true,
    roles: ["admin", "diretor"],
  },
  {
    icon: Users,
    label: "Convites de Pais",
    href: "/painel/convites-pais",
    roles: ["admin", "diretor"],
  },
  {
    icon: Ticket,
    label: "Convites Funcionário",
    href: "/painel/convites",
    roles: ["admin", "diretor"],
  },
];

// Equipe & Financeiro
export const teamFinanceItems: MenuItem[] = [
  {
    icon: Users,
    label: "Professores",
    href: "/painel/professores",
    roles: ["admin", "diretor"],
  },
  {
    icon: Briefcase,
    label: "Funcionários",
    href: "/painel/funcionarios",
    roles: ["admin", "diretor"],
  },
  {
    icon: Clock,
    label: "Ponto Eletrônico",
    href: "/painel/ponto",
    roles: ["admin", "diretor"],
  },
  {
    icon: CalendarOff,
    label: "Férias/Ausências",
    href: "/painel/ausencias",
    roles: ["admin", "diretor"],
  },
  {
    icon: DollarSign,
    label: "Financeiro",
    href: "/painel/financeiro",
    roles: ["admin", "diretor"],
  },
  {
    icon: Calculator,
    label: "Orçamentos",
    href: "/painel/orcamentos",
    roles: ["admin", "diretor"],
  },
  {
    icon: FileSignature,
    label: "Contratos",
    href: "/painel/contratos",
    roles: ["admin", "diretor"],
  },
  {
    icon: FileText,
    label: "Relatórios",
    href: "/painel/relatorios",
    roles: ["admin", "diretor"],
  },
];

// Sistema
export const systemItems: MenuItem[] = [
  {
    icon: Settings,
    label: "Configurações",
    href: "/painel/config",
    roles: ["admin", "diretor"],
  },
  {
    icon: User,
    label: "Perfis de Usuários",
    href: "/painel/perfis",
    roles: ["admin", "diretor"],
  },
  {
    icon: Inbox,
    label: "Formulário Contato",
    href: "/painel/contatos",
    roles: ["admin", "diretor"],
  },
  {
    icon: CarFront,
    label: "Histórico Retiradas",
    href: "/painel/historico-retiradas",
    roles: ["admin", "diretor"],
  },
  {
    icon: Mail,
    label: "Logs de E-mail",
    href: "/painel/logs-email",
    roles: ["admin", "diretor"],
  },
  {
    icon: Shield,
    label: "Logs de Auditoria",
    href: "/painel/logs-auditoria",
    roles: ["admin", "diretor"],
  },
];

// Icons for footer
export { Home, LayoutDashboard };
