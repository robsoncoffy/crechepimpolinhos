
# Correção: Visibilidade de Cardápios e Retenção de Dados

## Problema Identificado

Os pais atualmente veem **todos** os cardápios (berçário + maternal) ao invés de ver apenas o cardápio relevante para a turma do seu filho. A cozinheira já vê corretamente filtrado.

## Correções Necessárias

### 1. Corrigir WeeklyMenuTab para Pais

**Arquivo**: `src/components/parent/WeeklyMenuTab.tsx`

**Mudanças**:
- Adicionar prop `childClassType` para receber a turma do filho
- Mapear `class_type` para `menu_type`:
  - `bercario` → busca menus de berçário (todos os tipos: 0-6m, 6-12m, 12-24m)
  - `maternal` / `jardim` → busca menu `maternal`
- Filtrar a query do Supabase por `menu_type`

**Arquivo**: `src/pages/parent/ParentDashboard.tsx`

**Mudanças**:
- Passar `childClassType={selectedChild.class_type}` para o componente `WeeklyMenuTab`

### 2. Política de Retenção de 5 Anos

**Arquivo**: `src/hooks/useSystemSettings.ts` (já existe)

Adicionar configuração `menu_retention_years` com valor padrão `5`.

**Arquivo**: Nova seção de documentação/configuração no Admin

Criar uma nota visível para administradores sobre a política de retenção de dados, indicando que os cardápios são mantidos por pelo menos 5 anos para conformidade regulatória.

### 3. Índice para Performance de Consultas Históricas

**Migration SQL**:
```sql
CREATE INDEX IF NOT EXISTS idx_weekly_menus_created_at 
ON public.weekly_menus(created_at);
```

Isso garante que consultas por data de criação (para auditorias de 5 anos) sejam rápidas.

---

## Detalhes Técnicos

### Mapeamento de Tipos

| class_type (Criança) | menu_type (Cardápio) |
|----------------------|----------------------|
| `bercario` | `bercario_0_6`, `bercario_6_12`, `bercario_12_24` |
| `maternal` | `maternal` |
| `jardim` | `maternal` |

### Lógica de Filtro no WeeklyMenuTab

```typescript
// Determinar menu_type baseado na turma
const getMenuTypeFilter = (classType: string): string[] => {
  if (classType === 'bercario') {
    return ['bercario', 'bercario_0_6', 'bercario_6_12', 'bercario_12_24'];
  }
  return ['maternal'];
};

// Na query
.in('menu_type', getMenuTypeFilter(childClassType))
```

### Políticas RLS (Já Configuradas Corretamente)

- `SELECT`: Todos usuários autenticados podem ler
- `INSERT/UPDATE/DELETE`: Apenas staff (nutricionista, admin)

### Arquivos a Modificar

1. `src/components/parent/WeeklyMenuTab.tsx` - Adicionar filtro por menu_type
2. `src/pages/parent/ParentDashboard.tsx` - Passar class_type como prop
3. Nova migration SQL - Adicionar índice para created_at

### Verificação de Retenção

Os dados de cardápio já são retidos indefinidamente (sem deleção automática). A tabela possui:
- `created_at` timestamp para rastreamento
- `updated_at` timestamp para auditoria de modificações

Não há nenhum job ou trigger que delete cardápios antigos, garantindo a retenção mínima de 5 anos.
