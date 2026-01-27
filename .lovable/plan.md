

# Plano de Otimização de Performance - Fase 3

## Resumo das Otimizações Identificadas

Após a implementação das Fases 1 e 2, ainda existem oportunidades para melhorar a performance.

---

## 1. Corrigir Warning de forwardRef

### Problema
O console mostra warning: "Function components cannot be given refs. Attempts to access this ref will fail." nos componentes `PageLoader` e `EmployeeRegistration`.

### Solução
Quando usamos `React.lazy()` com `Suspense`, o componente pode receber uma ref. Precisamos usar `forwardRef` no `PageLoader` ou mover o PageLoader para fora do App para evitar recriação.

### Impacto
Elimina warnings no console e melhora estabilidade do código.

---

## 2. Lazy Loading do Footer com Intersection Observer

### Problema
O Footer é carregado imediatamente em todas as páginas públicas, mesmo que o usuário não role até ele.

### Solução
Criar um componente `LazyFooter` que usa Intersection Observer para carregar o Footer apenas quando o usuário se aproxima do final da página.

---

## 3. Remover Animações Não Utilizadas do Tailwind

### Problema
O `tailwind.config.ts` define animações customizadas (`bounce-gentle`, `wiggle`, `float`) que não estão sendo usadas em nenhum componente.

### Solução
Remover as definições de keyframes e animations não utilizadas para reduzir o CSS final.

---

## 4. Otimizar Estratégia de Cache do PWA

### Problema
O service worker atual usa uma única estratégia para todos os assets. Podemos refinar para melhor performance.

### Solução
Adicionar estratégia `StaleWhileRevalidate` para chunks JS e `CacheFirst` para imagens e fontes.

---

## 5. React Router Future Flags

### Problema
O console mostra warnings sobre future flags do React Router v7 que devem ser habilitadas.

### Solução
Adicionar as flags `v7_startTransition` e `v7_relativeSplatPath` no BrowserRouter.

---

## 6. Lazy Loading dos Componentes de Gráficos

### Problema
Componentes que usam `recharts` (FinancialForecastTab, FinancialReportsTab, WeeklyCashFlowTab, GrowthChart) são importados sincronamente dentro de páginas já lazy-loaded, mas podemos otimizar ainda mais.

### Solução
Como esses componentes só são renderizados em tabs específicas, podemos criar wrappers lazy dentro das próprias páginas para carregar o recharts apenas quando necessário.

---

## 7. Prefetch de Rotas do Dashboard

### Problema
Quando o usuário está no Dashboard, navegar para subpáginas ainda requer download dos chunks.

### Solução
Implementar prefetch das rotas mais acessadas (criancas, agenda, cardapio) quando o Dashboard carrega.

---

## Resumo das Alterações por Arquivo

| Arquivo | Alteração |
|---------|-----------|
| `src/App.tsx` | Corrigir PageLoader e adicionar future flags |
| `src/components/layout/PublicLayout.tsx` | Lazy loading do Footer |
| `tailwind.config.ts` | Remover animações não utilizadas |
| `vite.config.ts` | Otimizar estratégia de cache PWA |

---

## Impacto Esperado

| Métrica | Melhoria Estimada |
|---------|-------------------|
| Warnings no Console | -100% (eliminados) |
| CSS Bundle Size | -5-10% |
| Footer Load Time | Delayed (melhor perceived perf) |
| Cache Hit Rate | +20-30% |

---

## Seção Técnica

### Arquivos que serão modificados:
1. `src/App.tsx` - Corrigir PageLoader e adicionar future flags do React Router
2. `src/components/layout/PublicLayout.tsx` - Lazy loading do Footer
3. `tailwind.config.ts` - Remover animações não utilizadas
4. `vite.config.ts` - Adicionar `StaleWhileRevalidate` para JS chunks

### Código PageLoader corrigido (App.tsx):
```typescript
// Move PageLoader outside to avoid recreating on each render
function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  );
}
```

### Código Future Flags (App.tsx):
```typescript
<BrowserRouter
  future={{
    v7_startTransition: true,
    v7_relativeSplatPath: true,
  }}
>
```

### Código Lazy Footer (PublicLayout.tsx):
```typescript
const LazyFooter = lazy(() => import("./Footer").then(m => ({ default: m.Footer })));

export function PublicLayout({ children }: PublicLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">{children}</main>
      <Suspense fallback={<div className="h-64 bg-primary" />}>
        <LazyFooter />
      </Suspense>
    </div>
  );
}
```

### Tailwind Config - Remover animações não usadas:
```typescript
keyframes: {
  "accordion-down": { ... },
  "accordion-up": { ... },
  // Remover bounce-gentle, wiggle, float
},
animation: {
  "accordion-down": "...",
  "accordion-up": "...",
  // Remover bounce-gentle, wiggle, float
},
```

### Vite Config - Cache Strategy:
```typescript
runtimeCaching: [
  {
    urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
    handler: "NetworkFirst",
    options: { cacheName: "supabase-api-cache", expiration: { maxEntries: 100, maxAgeSeconds: 3600 } },
  },
  {
    urlPattern: /\.(?:js|css)$/i,
    handler: "StaleWhileRevalidate",
    options: { cacheName: "static-resources", expiration: { maxEntries: 100, maxAgeSeconds: 86400 } },
  },
  {
    urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|woff|woff2)$/i,
    handler: "CacheFirst",
    options: { cacheName: "images-fonts", expiration: { maxEntries: 100, maxAgeSeconds: 2592000 } },
  },
],
```

### Considerações:
- Todas as alterações são retrocompatíveis
- O lazy loading do Footer não afeta SEO pois bots carregam a página completa
- As future flags preparam o projeto para React Router v7
- A remoção de animações não usadas é segura (confirmado via busca no código)

