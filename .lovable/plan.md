

## Plano: Disparo de Fluxo GHL via Tag após Pré-Matrícula

### Objetivo
Quando um responsável completar a pré-matrícula no site, adicionar automaticamente uma tag especial ao contato no GoHighLevel para disparar um fluxo/chatbot de confirmação.

---

### Como Funciona

```text
┌─────────────────────────────┐
│ Formulário Pré-Matrícula    │
│ (Site Pimpolinhos)          │
└─────────────┬───────────────┘
              │ 1. Salva no banco
              ▼
┌─────────────────────────────┐
│ Edge Function               │
│ ghl-sync-contact            │
│ (já existente)              │
└─────────────┬───────────────┘
              │ 2. Cria/atualiza contato no GHL
              │    COM tag especial
              ▼
┌─────────────────────────────┐
│ GoHighLevel                 │
│ Trigger: "Tag Adicionada"   │
│ → Inicia Workflow/Chatbot   │
└─────────────────────────────┘
```

---

### Configuração no GHL (feita por você)

1. **Criar Workflow** no GHL com trigger "Contact Tag Added"
2. Selecionar a tag: `pre-matricula-completa`
3. Configurar as etapas do fluxo:
   - Enviar WhatsApp de confirmação
   - Aguardar resposta
   - Perguntar se tem dúvidas
   - etc.

---

### Alterações no Sistema

#### 1. Atualizar Edge Function `ghl-sync-contact`

**Mudança simples**: Adicionar a tag `pre-matricula-completa` às tags enviadas ao GHL durante a criação do contato.

```text
Antes (linha 159):
tags: ["pré-matrícula", "site", "novo-lead"]

Depois:
tags: ["pré-matrícula", "site", "novo-lead", "pre-matricula-completa"]
```

O GHL automaticamente dispara qualquer workflow configurado para essa tag.

#### 2. Atualizar Frontend `PreEnrollment.tsx`

**Chamar a sincronização** logo após salvar a pré-matrícula para garantir que o contato seja criado no GHL imediatamente.

```text
Fluxo atual:
1. INSERT pre_enrollments
2. Mostra tela de sucesso

Novo fluxo:
1. INSERT pre_enrollments (com .select('id').single())
2. Chamar ghl-sync-contact em background
3. Mostra tela de sucesso (sem aguardar resposta)
```

---

### Resumo das Entregas

| Arquivo | Ação |
|---------|------|
| `supabase/functions/ghl-sync-contact/index.ts` | Adicionar tag `pre-matricula-completa` |
| `src/pages/PreEnrollment.tsx` | Chamar sync após INSERT (fire-and-forget) |

---

### Configuração Necessária no GHL

Para que funcione, você precisa criar o workflow no GHL:

1. Acesse **Automation → Workflows** no GHL
2. Clique em **Create Workflow**
3. Em "Start Trigger", escolha **Contact Tag Added**
4. Selecione a tag: `pre-matricula-completa`
5. Adicione as ações desejadas (WhatsApp, aguardar, etc.)
6. Ative o workflow

---

### Vantagens desta Abordagem

- **Flexibilidade**: Você pode editar o fluxo no GHL sem alterar código
- **Simplicidade**: Apenas 1 tag adicional dispara tudo
- **Rastreabilidade**: A tag fica registrada no contato para histórico
- **Vagas Municipais**: Continuam sendo ignoradas (não são sincronizadas com GHL)

