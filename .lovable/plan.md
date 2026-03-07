
# Plano de Correções -- Auditoria Forense (Itens Aprovados)

## Resumo das Correções

Corrigir 5 falhas identificadas na auditoria, excluindo os 6 itens que o cliente optou por manter como estao.

---

## 1. Data Dinamica na Politica de Privacidade e Termos de Uso (Fraude Documental)

**Problema:** `PrivacyPolicy.tsx` (linha 16) e `TermsOfUse.tsx` (linha 17) usam `new Date().toLocaleDateString('pt-BR')`, gerando uma data diferente a cada acesso. Isso invalida a rastreabilidade exigida pela LGPD -- nao e possivel provar qual versao do documento o usuario aceitou.

**Correcao:** Substituir por data fixa hardcoded: `"09 de fevereiro de 2026"`.

**Arquivos:** `src/pages/PrivacyPolicy.tsx`, `src/pages/TermsOfUse.tsx`

---

## 2. `getPublicUrl()` em Bucket Privado (Documentos Inacessiveis)

**Problema:** Em `ChildRegistration.tsx` (linha 382-384), a funcao `uploadFile` usa `getPublicUrl()` no bucket `child-documents`, que e privado (`public: false`). As URLs geradas retornam erro 400, tornando fotos e certidoes de nascimento inacessiveis para o admin.

**Correcao:** Substituir `getPublicUrl()` por retorno direto do path do arquivo (ex: `photos/userId/timestamp.jpg`). O admin usara `createSignedUrl()` para visualizar. A funcao `uploadFile` passara a retornar apenas o path relativo.

**Arquivo:** `src/pages/ChildRegistration.tsx`

---

## 3. Politica de Privacidade Nao Menciona Compartilhamento com CRM (GHL)

**Problema:** A Politica de Privacidade afirma que a creche "nao compartilha dados pessoais com terceiros", mas o sistema sincroniza silenciosamente nome, email, telefone e CPF com o GoHighLevel (CRM externo) via `ghl-sync-contact`. Isso e uma violacao direta da LGPD Art. 7, I (consentimento) e configura declaracao falsa no documento legal.

**Correcao:** Adicionar item na secao "Compartilhamento de Dados" mencionando o uso de plataforma de gestao de relacionamento (CRM) para comunicacao e acompanhamento do processo de matricula, sob clausula de confidencialidade.

**Arquivo:** `src/pages/PrivacyPolicy.tsx`

---

## 4. Formulario de Contato Sem Feedback Claro de Protocolo

**Problema:** Apos enviar o formulario de contato (`Contact.tsx`), o usuario ve apenas um toast generico "Entraremos em contato em breve" que desaparece em segundos. Nao ha numero de protocolo, nao ha confirmacao persistente na tela. O usuario pode achar que o envio falhou.

**Correcao:** Apos o envio bem-sucedido, substituir o formulario por um card de confirmacao persistente (similar ao da pre-matricula) com:
- Icone de sucesso
- Mensagem clara de que a mensagem foi recebida
- Botao para enviar nova mensagem ou voltar ao inicio

**Arquivo:** `src/pages/Contact.tsx`

---

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

---

# Refatoração — Gestão de Equipe (AdminTeachers / AdminEmployees)

> Implementado e documentado em 19/02/2026

## Problema

`AdminTeachers` e `AdminEmployees` concentravam tabelas, modais de cadastro e lógica de dados diretamente nas páginas, criando arquivos monolíticos difíceis de manter. As chamadas ao banco usavam `useEffect` manual, gerando race conditions e gargalos de carregamento.

## Solução — Clean Architecture

### Extração de Componentes
- Tabelas e modais movidos para pastas de feature: `src/components/admin/teachers/` e `src/components/admin/employees/`
- Cada pasta contém: Table, CreateDialog, AssignDialog, EditDialog e types próprios

### Migração para TanStack Query
- `useEffect` + `useState` para fetching substituídos por `useQuery`
- Operações de criação, edição e remoção migradas para `useMutation`
- `invalidateQueries` garante atualização automática do cache após cada mutação

## Tabela de Arquivos Afetados

| Arquivo | Tipo de Mudança |
|---|---|
| `src/pages/admin/AdminTeachers.tsx` | Refatorado para consumir componentes da feature |
| `src/pages/admin/AdminEmployees.tsx` | Refatorado para consumir componentes da feature |
| `src/components/admin/teachers/` | Nova pasta de feature com tabelas e modais |
| `src/components/admin/employees/` | Nova pasta de feature com tabelas e modais |

---

# Refatoração Completa — Dashboards, Back-Office, Agenda e Push Notifications

> Implementado e documentado em 20/02/2026

## Escopo Total das Mudanças

### 1. Dashboards Principais

#### CookDashboard
- Removidas `as any` type assertions inseguras
- `useMutation` com **Optimistic Updates**: UI atualiza imediatamente sem loading blocks, com rollback automático em caso de erro

#### PedagogueDashboard
- Arquivo monolítico (>1100 linhas) fragmentado em `WeeklyPlanningTab` e `EvaluationsTab`
- Pending calculations agora consultam o banco diretamente (evita cruzamento de arrays no client com N+1 implícito)
- Client-side pagination: máximo de 10 cards por página nas avaliações "Plus"

#### TeacherDashboard
- **Correção crítica de segurança:** flag `enabled` mal configurada no TanStack Query permitia buscar dados da escola inteira para professoras sem turma alocada — corrigido com validação explícita
- Removido `refetchInterval` de 60s (causava flood na API)
- Substituído por **Supabase Realtime** (`postgres_changes`) com cleanup correto no `useEffect`
- UI extraída para `TeacherAgendaTab`, `TeacherClassTab`, `TeacherAllergiesTab`

#### AuxiliarDashboard
- `lazy()` + `Suspense` implementados na aba "Equipe", padronizando com os demais dashboards
- Supabase Realtime adicionado para contagem de mensagens não lidas

---

### 2. Back-Office — Clean Architecture (AdminTeachers / AdminEmployees)

- `EmployeeTable`, `TeacherTable` e `CreateTeacherDialog` extraídos para pastas de feature: `src/components/admin/teachers/` e `src/components/admin/employees/`
- Lógicas soltas de request (useEffect manual) migradas para mutations do TanStack Query com cache invalidation automático

---

### 3. Agenda Diária (AdminAgenda + ParentAgendaView)

#### Admin — `src/pages/admin/AdminAgenda.tsx`
- Migração para `useQuery` + `useMutation` com invalidação de cache automática
- Modais de refeições, humor e observações extraídos para componentes dedicados

#### Pais — `src/components/parent/ParentAgendaView.tsx`
- `supabase.channel()` com `postgres_changes` escutando `daily_records` filtrado por `child_id`
- Updates da escola refletem instantaneamente sem reload
- Canal desregistrado no cleanup do `useEffect` para evitar memory leaks

---

### 4. Push Notifications — Triggers em Momentos-Chave

Integração da Edge Function `send-push-notification` nos seguintes eventos:

| Evento | Destinatário |
|---|---|
| Nova mensagem no Chat da escola | Pais vinculados |
| Agenda diária salva e finalizada (mutate no AdminAgenda) | Pais da criança |
| Nova imagem no Mural Escolar (por turma) | Pais da turma |
| Novo Aviso criado no dashboard | Pais relevantes |

---

## Tabela de Arquivos Afetados

| Arquivo | Tipo de Mudança |
|---|---|
| `src/pages/admin/CookDashboard.tsx` | Optimistic Updates + remoção de type assertions |
| `src/pages/admin/PedagogueDashboard.tsx` | Fragmentado + DB queries + pagination |
| `src/pages/admin/TeacherDashboard.tsx` | Segurança corrigida + Realtime + extração de UI |
| `src/pages/admin/AuxiliarDashboard.tsx` | Lazy loading + Realtime |
| `src/pages/admin/AdminTeachers.tsx` | Clean Architecture + TanStack Query |
| `src/pages/admin/AdminEmployees.tsx` | Clean Architecture + TanStack Query |
| `src/pages/admin/AdminAgenda.tsx` | TanStack + modais extraídos + push trigger |
| `src/components/parent/ParentAgendaView.tsx` | Supabase Realtime adicionado |
| `src/components/teacher/TeacherAgendaTab.tsx` | Novo componente extraído |
| `src/components/teacher/TeacherClassTab.tsx` | Novo componente extraído |
| `src/components/teacher/TeacherAllergiesTab.tsx` | Novo componente extraído |
| `src/components/admin/pedagogue/WeeklyPlanningTab.tsx` | Novo componente extraído |
| `src/components/admin/pedagogue/EvaluationsTab.tsx` | Novo componente extraído |
| `src/components/admin/teachers/` | Pasta de feature com tabelas e modais |
| `src/components/admin/employees/` | Pasta de feature com tabelas e modais |
