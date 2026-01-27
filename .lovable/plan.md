
# Plano: Badges de Situacao do Lead no Chat

## Objetivo
Exibir badges coloridos ao lado do nome de cada lead no Chat de Leads, mostrando sua situacao atual no pipeline de vendas (ex: "Novo Lead", "Aguardando Contato", "Ganho", "Perdido").

---

## Analise Tecnica

### Fonte de Dados
Os dados necessarios vem de duas APIs do GoHighLevel:
- **Conversations API**: Retorna `contactId` para cada conversa
- **Opportunities API**: Retorna oportunidades com `contact.id` e `pipelineStageId`

Para exibir o badge, precisamos cruzar o `contactId` da conversa com o `contact.id` das oportunidades.

### Desafio
A API de conversas nao retorna a situacao da oportunidade diretamente. Precisaremos:
1. Buscar as oportunidades em paralelo ao carregar conversas
2. Criar um mapeamento `contactId` -> `stageName` / `status`

---

## Arquitetura da Solucao

```text
+---------------------+       +----------------------+
| fetchConversations  |       | fetchOpportunities   |
| (contactId list)    |       | (pipeline/stage)     |
+---------------------+       +----------------------+
          |                            |
          v                            v
   +------+----------------------------+------+
   |     Mapear contactId -> stageInfo        |
   +------------------------------------------+
                      |
                      v
            +-------------------+
            | Renderizar Badge  |
            | no Card de Chat   |
            +-------------------+
```

---

## Implementacao

### 1. Edge Function (ghl-conversations/index.ts)
Adicionar nova action `opportunitiesByContact` que retorna oportunidades indexadas por `contactId`:

```text
Action: opportunitiesMap
Retorno: {
  opportunitiesMap: {
    [contactId]: {
      stageName: "Aguardando Contato",
      status: "open" | "won" | "lost" | "abandoned",
      pipelineName: "Pipeline Principal"
    }
  }
}
```

Alternativamente, buscar todas as oportunidades na action "list" existente e incluir o mapeamento na resposta.

### 2. Frontend (GhlConversationsTab.tsx)
Adicionar estados e logica:

**Novos estados:**
- `opportunitiesMap: Record<string, OpportunityInfo>` - Mapa de contactId para info da oportunidade

**Novo fetch:**
- Chamar `opportunities` action junto com `list`
- Buscar pipelines para mapear `pipelineStageId` -> `stageName`

**Renderizacao:**
- No card de cada conversa, verificar se existe `opportunitiesMap[conv.contactId]`
- Se existir, exibir Badge com nome da etapa e cor baseada no status

### 3. Mapeamento de Cores

| Status      | Cor do Badge                          |
|-------------|---------------------------------------|
| open        | Azul (`bg-blue-100 text-blue-800`)    |
| won         | Verde (`bg-green-100 text-green-800`) |
| lost        | Vermelho (`bg-red-100 text-red-800`)  |
| abandoned   | Cinza (`bg-gray-100 text-gray-800`)   |

Para etapas especificas (stageName), usar cores dinamicas ou manter azul padrao para "open".

---

## Arquivos a Modificar

### supabase/functions/ghl-conversations/index.ts
- Modificar action "list" para buscar oportunidades em paralelo
- Incluir `opportunitiesMap` na resposta com mapeamento contactId -> stage info
- Buscar pipelines para traduzir pipelineStageId em nomes

### src/components/admin/GhlConversationsTab.tsx
- Adicionar interface `OpportunityInfo`
- Processar `opportunitiesMap` retornado pela API
- Renderizar Badge ao lado do nome do contato no card
- Exibir nome da etapa e aplicar cor baseada no status

---

## Interface do Usuario

### Antes (apenas nome)
```text
+--------------------------------------+
| [Avatar] Maria Silva          14:30  |
|          📱 Ultima mensagem...       |
+--------------------------------------+
```

### Depois (com badge de situacao)
```text
+--------------------------------------+
| [Avatar] Maria Silva   [Novo Lead]   |
|          📱 14:30                    |
|          Ultima mensagem...          |
+--------------------------------------+
```

Ou com layout mais compacto:
```text
+--------------------------------------+
| [Avatar] Maria Silva          14:30  |
|          [Aguardando Contato]        |
|          📱 Ultima mensagem...       |
+--------------------------------------+
```

---

## Detalhes da Badge

- **Tamanho**: Pequeno (`text-xs px-2 py-0.5`)
- **Posicao**: Logo abaixo do nome ou ao lado direito do nome
- **Conteudo**: Nome da etapa do pipeline (ex: "Novo Lead", "Aguardando Contato", "Visita Agendada")
- **Quando exibir**: Apenas se o contato tiver uma oportunidade associada
- **Status especiais**: Para "won" mostrar "Ganho" em verde, para "lost" mostrar "Perdido" em vermelho

---

## Consideracoes de Performance

1. **Busca em paralelo**: Oportunidades serao buscadas junto com conversas para nao adicionar latencia
2. **Cache**: Reutilizar os dados de oportunidades ja carregados
3. **Mapeamento eficiente**: Criar mapa O(1) para lookup por contactId

---

## Passos de Implementacao

1. Atualizar Edge Function para incluir dados de oportunidades na listagem de conversas
2. Modificar o componente GhlConversationsTab para processar e armazenar o mapa de oportunidades
3. Atualizar a renderizacao do card de conversa para incluir o badge
4. Aplicar estilos e cores apropriadas baseadas no status
5. Testar com dados reais
