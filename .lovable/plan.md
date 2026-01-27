
# Plano de Otimização Completa - Top 10 Gargalos de Performance

## Visão Geral

Este plano aborda sistematicamente os 10 principais gargalos de performance identificados na plataforma Pimpolinhos, priorizados por impacto e complexidade.

---

## Prioridade 1: Cache Global de Dados (Itens 5 e 9)

### Problema
Múltiplas páginas buscam os mesmos dados (children, profiles, roles) independentemente, gerando dezenas de chamadas duplicadas ao banco.

### Solução
Criar um contexto global `AppDataProvider` que centraliza os dados mais usados com React Query.

### Arquivos a criar
- `src/contexts/AppDataContext.tsx`

### Arquivos a modificar
- `src/pages/Dashboard.tsx` - Envolver com AppDataProvider
- `src/pages/admin/AdminChildren.tsx` - Usar dados do contexto
- `src/pages/admin/AdminAgenda.tsx` - Usar dados do contexto
- `src/components/admin/AdminSidebar.tsx` - Remover queries locais

### Código proposto
```typescript
// src/contexts/AppDataContext.tsx
const AppDataContext = createContext<AppDataContextType | undefined>(undefined);

export function AppDataProvider({ children }: { children: ReactNode }) {
  const { data: allChildren } = useQuery({
    queryKey: ['children'],
    queryFn: async () => {
      const { data } = await supabase.from('children').select('*').order('full_name');
      return data || [];
    },
    staleTime: 1000 * 60 * 5, // 5 minutos
  });

  const { data: allProfiles } = useQuery({
    queryKey: ['profiles-approved'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('*').eq('status', 'approved');
      return data || [];
    },
    staleTime: 1000 * 60 * 5,
  });

  // ... outros dados compartilhados
}
```

---

## Prioridade 2: Dividir AdminChildren.tsx (Item 1)

### Problema
Arquivo monolítico com 1187 linhas contendo formulários, tabelas, diálogos e lógica de negócio misturados.

### Solução
Extrair componentes e lógica em arquivos separados.

### Arquivos a criar
- `src/components/admin/children/ChildForm.tsx` - Formulário de cadastro/edição
- `src/components/admin/children/ChildTable.tsx` - Tabela de listagem
- `src/components/admin/children/LinkParentDialog.tsx` - Dialog de vincular responsável
- `src/components/admin/children/ChildStatsCards.tsx` - Cards de estatísticas
- `src/hooks/useChildren.ts` - Hook para gerenciar dados de crianças

### Arquivos a modificar
- `src/pages/admin/AdminChildren.tsx` - Reduzir para ~200 linhas, apenas orquestrando componentes

### Estrutura proposta
```text
src/
├── pages/admin/
│   └── AdminChildren.tsx (~200 linhas - orquestrador)
├── components/admin/children/
│   ├── ChildForm.tsx (~150 linhas)
│   ├── ChildTable.tsx (~200 linhas)
│   ├── LinkParentDialog.tsx (~120 linhas)
│   ├── ChildStatsCards.tsx (~80 linhas)
│   └── index.ts (exports)
└── hooks/
    └── useChildren.ts (~100 linhas - lógica de dados)
```

---

## Prioridade 3: Lazy Loading de Recharts em Tabs (Item 3)

### Problema
Componentes como `TodayOverviewWidget` e `WeeklyNutritionSummary` importam recharts imediatamente, mesmo quando suas tabs não estão visíveis.

### Solução
Criar wrapper de lazy loading para componentes de gráficos dentro de tabs.

### Arquivos a modificar
- `src/pages/admin/AdminMenu.tsx` - Lazy load de tabs com gráficos
- `src/pages/admin/AdminReports.tsx` - Lazy load de componentes de relatório
- `src/pages/admin/AdminTimeClock.tsx` - Lazy load de gráficos

### Padrão a implementar
```typescript
// Dentro de AdminMenu.tsx
const NutritionTabContent = lazy(() => import('@/components/admin/nutritionist/TodayOverviewWidget'));

<TabsContent value="nutrition">
  <Suspense fallback={<Skeleton className="h-64" />}>
    <NutritionTabContent {...props} />
  </Suspense>
</TabsContent>
```

---

## Prioridade 4: Otimizar AdminSidebar (Item 2)

### Problema
Importa 27 ícones do Lucide e renderiza todos em cada navegação.

### Solução
1. Memoizar o componente da sidebar
2. Usar React.memo nos itens do menu
3. Mover definições de menu para fora do componente

### Arquivos a modificar
- `src/components/admin/AdminSidebar.tsx`

### Código proposto
```typescript
// Mover para fora do componente
const MENU_CONFIG = {
  studentItems: [...],
  routineItems: [...],
  // ...
} as const;

// Memoizar itens individuais
const MemoizedMenuItem = memo(function MenuItem({ item, isActive }: MenuItemProps) {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={isActive} tooltip={item.label}>
        <Link to={item.href}>
          <item.icon className="h-4 w-4" />
          <span>{item.label}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
});

// Memoizar a sidebar inteira
export const AdminSidebar = memo(function AdminSidebar() { ... });
```

---

## Prioridade 5: Consolidar Code Splitting (Item 4)

### Problema
45+ chunks separados geram muitas requisições HTTP.

### Solução
Agrupar páginas relacionadas em chunks maiores usando Vite.

### Arquivos a modificar
- `vite.config.ts`

### Configuração proposta
```typescript
manualChunks: {
  'vendor-react': ['react', 'react-dom', 'react-router-dom'],
  'vendor-query': ['@tanstack/react-query'],
  'vendor-ui': ['@radix-ui/react-dialog', ...],
  'vendor-charts': ['recharts'],
  // Agrupar páginas por categoria
  'admin-core': [
    './src/pages/admin/AdminDashboard.tsx',
    './src/pages/admin/AdminChildren.tsx',
    './src/pages/admin/AdminAgenda.tsx',
  ],
  'admin-finance': [
    './src/pages/admin/AdminPayments.tsx',
    './src/pages/admin/AdminReports.tsx',
    './src/pages/admin/AdminBudgets.tsx',
  ],
  'admin-comm': [
    './src/pages/admin/AdminChat.tsx',
    './src/pages/admin/AdminFeed.tsx',
    './src/pages/admin/AdminEmails.tsx',
  ],
}
```

---

## Prioridade 6: Otimizar Imports de date-fns (Item 7)

### Problema
Imports não tree-shaked podem incluir a biblioteca inteira.

### Solução
Usar imports específicos de subpaths.

### Arquivos a modificar (busca e substituição global)
- Todos os arquivos que usam date-fns

### Padrão a implementar
```typescript
// ❌ Evitar
import { format, addDays } from "date-fns";

// ✅ Preferir
import format from "date-fns/format";
import addDays from "date-fns/addDays";
```

Nota: Com a versão atual do date-fns (v3), os imports já são tree-shakeable por padrão. Verificar se há imports excessivos.

---

## Prioridade 7: Extrair Formulários Grandes (Item 8)

### Problema
Formulários enormes em AdminChildren, AdminAgenda e AdminConfig estão inline.

### Solução
Criar componentes de formulário separados e lazy-loadable.

### Arquivos a criar
- `src/components/admin/forms/AgendaFormDialog.tsx` - Extraído de AdminAgenda
- `src/components/admin/forms/ConfigForm.tsx` - Extraído de AdminConfig

### Arquivos a modificar
- `src/pages/admin/AdminAgenda.tsx` - Usar AgendaFormDialog lazy
- `src/pages/admin/AdminConfig.tsx` - Usar ConfigForm lazy

---

## Prioridade 8: Lazy Loading de Imagens (Item 10)

### Problema
Galeria e avatares carregam imagens imediatamente.

### Solução
Criar componente de imagem otimizada com IntersectionObserver.

### Arquivos a criar
- `src/components/ui/lazy-image.tsx`

### Arquivos a modificar
- `src/pages/admin/AdminGallery.tsx`
- `src/components/parent/PhotoGalleryTab.tsx`

### Código proposto
```typescript
// src/components/ui/lazy-image.tsx
export function LazyImage({ src, alt, className, ...props }: LazyImageProps) {
  const [isVisible, setIsVisible] = useState(false);
  const imgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '100px' }
    );

    if (imgRef.current) observer.observe(imgRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={imgRef} className={className}>
      {isVisible ? (
        <img src={src} alt={alt} loading="lazy" {...props} />
      ) : (
        <Skeleton className="w-full h-full" />
      )}
    </div>
  );
}
```

---

## Prioridade 9: Reduzir Dependência de Radix UI (Item 6)

### Problema
Múltiplos primitivos Radix carregam em cada página.

### Solução
Verificar uso real e substituir componentes simples por HTML nativo.

### Avaliação
- Dialog, Select, Tabs, Tooltip: Manter (funcionalidade complexa)
- Separator: Substituir por `<hr />` ou div com border
- Label: Substituir por `<label>` nativo

### Arquivos a modificar
- Componentes que usam apenas Separator/Label

---

## Prioridade 10: Agrupar Dashboards por Cargo (Item 4 complementar)

### Problema
Cada dashboard (Teacher, Cook, Nutritionist, etc.) é um chunk separado com código repetido.

### Solução
Criar componente base reutilizável e especializar apenas widgets específicos.

### Arquivos a criar
- `src/components/admin/dashboards/BaseDashboard.tsx`
- `src/components/admin/dashboards/DashboardWidgetRegistry.tsx`

### Arquivos a modificar
- `src/pages/admin/TeacherDashboard.tsx`
- `src/pages/admin/CookDashboard.tsx`
- `src/pages/admin/NutritionistDashboard.tsx`
- `src/pages/admin/PedagogueDashboard.tsx`
- `src/pages/admin/AuxiliarDashboard.tsx`

---

## Resumo de Impacto Esperado

| Otimização | Redução Bundle | Melhoria LCP | Redução Requests |
|------------|----------------|--------------|------------------|
| Cache Global | - | -30% | -50% |
| Dividir AdminChildren | -50KB | -15% | - |
| Lazy Recharts em Tabs | -400KB | -20% | - |
| Memoizar Sidebar | - | -10% | - |
| Consolidar Chunks | - | - | -40% |
| Otimizar date-fns | -20KB | - | - |
| Extrair Formulários | -30KB | -10% | - |
| Lazy Images | - | -25% | -30% |
| Simplificar Radix | -15KB | - | - |
| Base Dashboard | -40KB | - | - |

**Total Estimado**: ~555KB a menos no bundle, 40-60% de melhoria no LCP, 50% menos requisições à API.

---

## Ordem de Implementação Recomendada

```text
Fase 1 (Alto Impacto, Baixa Complexidade):
├── 1. Cache Global (AppDataContext)
├── 2. Memoizar AdminSidebar
└── 3. Lazy Images Component

Fase 2 (Alto Impacto, Média Complexidade):
├── 4. Dividir AdminChildren em componentes
├── 5. Lazy loading de Recharts em Tabs
└── 6. Consolidar code splitting no Vite

Fase 3 (Médio Impacto, Alta Complexidade):
├── 7. Extrair formulários grandes
├── 8. Base Dashboard reutilizável
└── 9. Otimizar imports date-fns

Fase 4 (Refinamento):
└── 10. Simplificar uso de Radix
```

---

## Seção Técnica

### Arquivos que serão criados:
1. `src/contexts/AppDataContext.tsx` - Cache global de dados
2. `src/components/admin/children/ChildForm.tsx` - Formulário extraído
3. `src/components/admin/children/ChildTable.tsx` - Tabela extraída
4. `src/components/admin/children/LinkParentDialog.tsx` - Dialog extraído
5. `src/components/admin/children/ChildStatsCards.tsx` - Cards extraídos
6. `src/hooks/useChildren.ts` - Hook de dados
7. `src/components/ui/lazy-image.tsx` - Imagem otimizada
8. `src/components/admin/forms/AgendaFormDialog.tsx` - Formulário extraído
9. `src/components/admin/dashboards/BaseDashboard.tsx` - Dashboard base

### Arquivos que serão modificados:
1. `src/pages/Dashboard.tsx` - Adicionar AppDataProvider
2. `src/pages/admin/AdminChildren.tsx` - Refatorar para ~200 linhas
3. `src/pages/admin/AdminAgenda.tsx` - Extrair formulário
4. `src/pages/admin/AdminMenu.tsx` - Lazy load de tabs
5. `src/components/admin/AdminSidebar.tsx` - Memoização
6. `vite.config.ts` - Novos manual chunks
7. `src/pages/admin/AdminGallery.tsx` - Usar LazyImage
8. Dashboards específicos - Usar BaseDashboard

### Dependências:
- Nenhuma nova dependência necessária

### Considerações:
- Implementar em fases para evitar regressões
- Testar cada fase antes de prosseguir
- Manter compatibilidade com PWA e cache existente
- Monitorar métricas de performance após cada fase
