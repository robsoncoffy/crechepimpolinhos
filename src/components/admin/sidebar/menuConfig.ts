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
    roles: ["admin", "teacher", "pedagogue", "auxiliar"],
  },
  {
    icon: ClipboardCheck,
    label: "Chamada",
    href: "/painel/chamada",
    roles: ["admin", "teacher", "auxiliar"],
  },
  {
    icon: TrendingUp,
    label: "Crescimento",
    href: "/painel/crescimento",
    roles: ["admin", "teacher", "pedagogue"],
  },
  {
    icon: GraduationCap,
    label: "Avaliações Plus+",
    href: "/painel/avaliacoes",
    roles: ["admin", "pedagogue"],
  },
];

// Rotina Escolar
export const routineItems: MenuItem[] = [
  {
    icon: ClipboardList,
    label: "Agenda Digital",
    href: "/painel/agenda",
    roles: ["admin", "teacher", "auxiliar", "pedagogue"],
  },
  {
    icon: UtensilsCrossed,
    label: "Cardápio",
    href: "/painel/cardapio",
    roles: ["admin", "nutritionist", "cook"],
  },
  {
    icon: ShoppingCart,
    label: "Lista de Compras",
    href: "/painel/lista-compras",
    roles: ["admin", "cook", "nutritionist"],
  },
  {
    icon: CalendarDays,
    label: "Calendário",
    href: "/painel/calendario",
    roles: ["admin", "teacher", "pedagogue"],
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
    roles: ["admin", "teacher"],
  },
  {
    icon: Mail,
    label: "E-mails",
    href: "/painel/emails",
    roles: ["admin"],
  },
  {
    icon: Kanban,
    label: "Pipeline",
    href: "/painel/pipeline",
    roles: ["admin"],
  },
  {
    icon: Bell,
    label: "Notificações",
    href: "/painel/notificacoes",
    roles: ["admin"],
  },
];

// Cadastros
export const registrationItems: MenuItem[] = [
  {
    icon: UserCheck,
    label: "Aprovações",
    href: "/painel/aprovacoes",
    badge: true,
    roles: ["admin"],
  },
  {
    icon: Users,
    label: "Convites de Pais",
    href: "/painel/convites-pais",
    roles: ["admin"],
  },
  {
    icon: Ticket,
    label: "Convites Funcionário",
    href: "/painel/convites",
    roles: ["admin"],
  },
];

// Equipe & Financeiro
export const teamFinanceItems: MenuItem[] = [
  {
    icon: Users,
    label: "Professores",
    href: "/painel/professores",
    roles: ["admin"],
  },
  {
    icon: Briefcase,
    label: "Funcionários",
    href: "/painel/funcionarios",
    roles: ["admin"],
  },
  {
    icon: Clock,
    label: "Ponto Eletrônico",
    href: "/painel/ponto",
    roles: ["admin"],
  },
  {
    icon: CalendarOff,
    label: "Férias/Ausências",
    href: "/painel/ausencias",
    roles: ["admin"],
  },
  {
    icon: DollarSign,
    label: "Financeiro",
    href: "/painel/financeiro",
    roles: ["admin"],
  },
  {
    icon: Calculator,
    label: "Orçamentos",
    href: "/painel/orcamentos",
    roles: ["admin"],
  },
  {
    icon: FileSignature,
    label: "Contratos",
    href: "/painel/contratos",
    roles: ["admin"],
  },
  {
    icon: FileText,
    label: "Relatórios",
    href: "/painel/relatorios",
    roles: ["admin"],
  },
];

// Sistema
export const systemItems: MenuItem[] = [
  {
    icon: Settings,
    label: "Configurações",
    href: "/painel/config",
    roles: ["admin"],
  },
  {
    icon: User,
    label: "Perfis de Usuários",
    href: "/painel/perfis",
    roles: ["admin"],
  },
  {
    icon: Inbox,
    label: "Formulário Contato",
    href: "/painel/contatos",
    roles: ["admin"],
  },
  {
    icon: CarFront,
    label: "Histórico Retiradas",
    href: "/painel/historico-retiradas",
    roles: ["admin"],
  },
  {
    icon: Mail,
    label: "Logs de E-mail",
    href: "/painel/logs-email",
    roles: ["admin"],
  },
  {
    icon: Shield,
    label: "Logs de Auditoria",
    href: "/painel/logs-auditoria",
    roles: ["admin"],
  },
];

// Icons for footer
export { Home, LayoutDashboard };
