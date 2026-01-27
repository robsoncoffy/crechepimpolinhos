
# Plano de Otimização de Performance - Fase 2

## Resumo das Otimizações Adicionais Identificadas

Após a implementação da Fase 1 (lazy loading, code splitting, otimização de fontes), ainda existem oportunidades significativas para deixar o site mais leve e fluido.

---

## 1. Lazy Loading de Recharts (Biblioteca Pesada)

### Problema
A biblioteca `recharts` (~400KB) está sendo importada sincronamente em vários componentes de relatórios e gráficos, mesmo que o usuário não acesse essas telas.

### Solução
Criar um wrapper lazy para componentes que usam recharts:
- `AdminReports.tsx`
- `AdminTimeClock.tsx`
- `FinancialReportsTab.tsx`
- `FinancialForecastTab.tsx`
- `GrowthChart.tsx`
- `WeeklyCashFlowTab.tsx`

**Impacto**: Redução de ~400KB no bundle inicial

---

## 2. Otimizar Ícones do Lucide React

### Problema
Muitas páginas importam múltiplos ícones do lucide-react de forma não otimizada. Por exemplo, `AdminSidebar.tsx` importa 27 ícones de uma vez.

### Solução
Os imports já estão corretos (named imports), mas podemos garantir que componentes que usam muitos ícones sejam lazy loaded. Além disso, verificar se há ícones não utilizados.

---

## 3. Prefetch de Rotas Críticas

### Problema
Quando o usuário faz login, o Dashboard demora para carregar porque precisa baixar os chunks.

### Solução
Adicionar prefetch inteligente nas rotas mais acessadas:
- Prefetch do Dashboard quando o usuário está na tela de Auth
- Prefetch de páginas filhas quando o usuário está no Dashboard

**Arquivo**: `src/pages/Auth.tsx` e `src/pages/Dashboard.tsx`

---

## 4. Otimizar Imagens com Dimensões Explícitas

### Problema
Algumas imagens não têm width/height definidos, causando Layout Shift (CLS).

### Solução
Adicionar dimensões explícitas em todas as imagens:
- `src/components/layout/Header.tsx` (logo já tem)
- `src/components/layout/Footer.tsx` (logo já tem)
- `src/pages/Home.tsx` (imagens do grid)

---

## 5. Debounce em Operações Pesadas

### Problema
Componentes como `GlobalSearch` e formulários de filtro podem disparar múltiplas queries rapidamente.

### Solução
Implementar debounce consistente (300-500ms) em:
- Busca global
- Filtros de tabelas
- Campos de pesquisa

---

## 6. Remover Animações Desnecessárias em Mobile

### Problema
Animações como `bounce-gentle`, `wiggle` e `float` consomem CPU em dispositivos móveis.

### Solução
Desabilitar animações pesadas em mobile via CSS:
```css
@media (prefers-reduced-motion: reduce) {
  .animate-bounce-gentle,
  .animate-wiggle,
  .animate-float {
    animation: none;
  }
}
```

---

## 7. Otimizar PWA Service Worker

### Problema
O service worker está configurado para cachear todos os arquivos, incluindo chunks que podem não ser usados.

### Solução
Refinar a estratégia de cache:
- Cache agressivo para assets estáticos (imagens, fontes)
- NetworkFirst para API calls
- StaleWhileRevalidate para chunks de JS

---

## 8. Lazy Loading de Componentes do Footer

### Problema
O Footer é carregado imediatamente, mesmo que o usuário não role até ele.

### Solução
Usar Intersection Observer para carregar o Footer apenas quando visível.

---

## Resumo das Alterações por Arquivo

| Arquivo | Alteração |
|---------|-----------|
| `src/pages/Auth.tsx` | Adicionar prefetch do Dashboard |
| `src/pages/Home.tsx` | Dimensões explícitas em imagens |
| `src/index.css` | Desabilitar animações com prefers-reduced-motion |
| `src/components/admin/GlobalSearch.tsx` | Verificar debounce |
| `vite.config.ts` | Adicionar recharts ao manual chunks |

---

## Impacto Esperado

| Métrica | Melhoria Estimada |
|---------|-------------------|
| Largest Contentful Paint (LCP) | -15-25% |
| Cumulative Layout Shift (CLS) | -50-70% |
| Time to Interactive (TTI) | -10-20% |
| Total Bundle Size | -300-500KB |

---

## Seção Técnica

### Arquivos que serão modificados:
1. `src/pages/Auth.tsx` - Prefetch do Dashboard
2. `src/pages/Home.tsx` - Dimensões explícitas em imagens
3. `src/index.css` - Respeitar prefers-reduced-motion
4. `vite.config.ts` - Adicionar recharts ao code splitting
5. `src/App.tsx` - Pequena melhoria na estrutura de fallback

### Código de Prefetch (Auth.tsx):
```typescript
// Prefetch Dashboard when user is on auth page
useEffect(() => {
  const prefetchDashboard = () => {
    import('./Dashboard');
  };
  // Delay prefetch to not compete with critical resources
  const timer = setTimeout(prefetchDashboard, 2000);
  return () => clearTimeout(timer);
}, []);
```

### Código de Reduced Motion (index.css):
```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

### Vite Config - Recharts Chunk:
```typescript
manualChunks: {
  // ... existing chunks
  'vendor-charts': ['recharts'],
}
```

### Considerações:
- Todas as alterações são retrocompatíveis
- Não afetam funcionalidade existente
- Respeitam preferências de acessibilidade do usuário
- Melhoram a experiência em dispositivos móveis e conexões lentas
