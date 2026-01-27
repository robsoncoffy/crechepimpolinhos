
# Plano de Otimização de Performance - Creche Pimpolinhos

## Diagnóstico: Por que o site está pesado?

Após analisar o código, identifiquei vários fatores que contribuem para a lentidão:

### 1. Carregamento de Fontes (Render Blocking)
O arquivo `index.css` importa fontes do Google Fonts de forma síncrona, bloqueando a renderização:
```css
@import url('https://fonts.googleapis.com/css2?family=Fredoka:...&family=Nunito:...&display=swap');
```
Isso atrasa significativamente o First Contentful Paint (FCP).

### 2. Bundle Inicial Grande
O arquivo `Dashboard.tsx` importa sincronamente mais de 40 páginas administrativas, mesmo que o usuário só acesse uma delas. Isso aumenta o tempo de carregamento inicial.

### 3. Imagens Não Otimizadas
A página Home carrega várias imagens grandes simultaneamente (hero, teacher, crafts, playground, etc.) sem lazy loading adequado.

### 4. Componentes Não Lazificados
Widgets do dashboard (Weather, Attendance, etc.) são importados sincronamente mesmo antes de serem visíveis.

### 5. Preload Incorreto
O `index.html` tenta fazer preload de um asset do src que não existe em produção:
```html
<link rel="preload" href="/src/assets/hero-children.jpg" ...>
```

---

## Plano de Correções

### Etapa 1: Otimizar Carregamento de Fontes
**Arquivo:** `index.html`

Mover as fontes para o head do HTML com `preconnect` e `font-display: swap`:
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@400;500;600;700&family=Nunito:wght@400;500;600;700&display=swap" rel="stylesheet">
```

**Arquivo:** `src/index.css`
Remover o `@import` de fontes (movido para HTML).

### Etapa 2: Lazy Loading das Páginas do Dashboard
**Arquivo:** `src/pages/Dashboard.tsx`

Converter todos os imports síncronos para lazy imports:
```typescript
const AdminDashboard = lazy(() => import("./admin/AdminDashboard"));
const AdminChildren = lazy(() => import("./admin/AdminChildren"));
// ... demais páginas
```

Adicionar Suspense com fallback leve em cada rota.

### Etapa 3: Otimizar Imagens da Home
**Arquivo:** `src/pages/Home.tsx`

Adicionar `loading="lazy"` em todas as imagens exceto a hero:
```tsx
<img src={teacherImage} loading="lazy" ... />
<img src={craftsImage} loading="lazy" ... />
```

### Etapa 4: Lazy Loading de Widgets do Dashboard
**Arquivo:** `src/pages/admin/AdminDashboard.tsx`

Converter widgets pesados para lazy loading:
```typescript
const WeatherWidget = lazy(() => import("@/components/admin/WeatherWidget"));
const TodayAttendanceWidget = lazy(() => import("@/components/admin/TodayAttendanceWidget"));
```

### Etapa 5: Corrigir Preload no HTML
**Arquivo:** `index.html`

Remover o preload quebrado:
```html
<!-- Remover esta linha -->
<link rel="preload" href="/src/assets/hero-children.jpg" ...>
```

### Etapa 6: Adicionar Code Splitting por Rota
**Arquivo:** `vite.config.ts`

Configurar manual chunks para melhor separação:
```typescript
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        'vendor-react': ['react', 'react-dom', 'react-router-dom'],
        'vendor-ui': ['@radix-ui/react-dialog', '@radix-ui/react-select', ...],
        'vendor-query': ['@tanstack/react-query'],
      }
    }
  }
}
```

### Etapa 7: Otimizar CSS com PurgeCSS Implícito
O Tailwind já faz isso, mas podemos garantir que animações pesadas sejam otimizadas.

---

## Resumo das Mudanças

| Arquivo | Alteração |
|---------|-----------|
| `index.html` | Mover fontes para head, remover preload quebrado |
| `src/index.css` | Remover @import de fontes |
| `src/pages/Dashboard.tsx` | Lazy load de todas as páginas admin |
| `src/pages/Home.tsx` | Adicionar loading="lazy" nas imagens |
| `src/pages/admin/AdminDashboard.tsx` | Lazy load dos widgets |
| `vite.config.ts` | Configurar manual chunks para code splitting |

---

## Impacto Esperado

- **First Contentful Paint (FCP)**: Redução de 40-60%
- **Largest Contentful Paint (LCP)**: Redução de 30-50%
- **Time to Interactive (TTI)**: Redução significativa no dashboard
- **Bundle Size Inicial**: Redução de 50-70% (lazy loading)

---

## Seção Técnica

### Arquivos que serão modificados:
1. `index.html` - Otimização de fontes e remoção de preload quebrado
2. `src/index.css` - Remoção do @import de fontes
3. `src/pages/Dashboard.tsx` - Lazy loading de 45+ páginas
4. `src/pages/Home.tsx` - Lazy loading de imagens
5. `src/pages/admin/AdminDashboard.tsx` - Lazy loading de widgets
6. `vite.config.ts` - Code splitting configuração

### Dependências:
- Nenhuma nova dependência necessária

### Considerações:
- O lazy loading pode causar um breve flash de loading em navegações, mas a experiência geral será muito mais fluida
- As fontes aparecerão um pouco depois do texto, mas o texto ficará legível imediatamente (FOUT aceitável)
- O PWA continuará funcionando normalmente

### Compatibilidade:
- Todas as alterações são compatíveis com o React 18 e Vite
- O service worker do PWA irá cachear os chunks lazy automaticamente após a primeira visita
