
# Plano: Atualização Automática do Chat de Leads

## Problema Identificado
O Chat de Leads (GoHighLevel) atualmente:
- Atualiza a lista de conversas apenas a cada 60 segundos
- NÃO atualiza automaticamente as mensagens quando uma conversa está aberta
- Requer clique manual no botão "Atualizar" ou envio de mensagem para ver novas respostas

## Solução Proposta
Implementar polling inteligente que mantém o chat atualizado sem sobrecarregar a API do GHL.

---

## Mudanças Técnicas

### 1. Polling de Mensagens na Conversa Aberta
Quando uma conversa está selecionada, implementar atualização automática a cada 10 segundos:

```text
selectedConversation ativo?
    └── SIM → Polling de mensagens a cada 10s
    └── NÃO → Sem polling de mensagens
```

### 2. Polling Mais Frequente para Lista de Conversas
Reduzir o intervalo de atualização da lista de 60s para 30s para capturar novas mensagens mais rapidamente.

### 3. Indicador Visual de Última Atualização
Adicionar um timestamp mostrando "Última atualização: há X segundos" para dar feedback visual ao usuário.

### 4. Detecção de Novas Mensagens
Comparar o número de mensagens antes e depois do fetch para tocar notificação sonora se houver novas mensagens de entrada.

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/admin/GhlConversationsTab.tsx` | Adicionar polling de mensagens, reduzir intervalo, indicador visual |

---

## Implementação Detalhada

### Novo useEffect para Polling de Mensagens
```typescript
// Quando uma conversa está selecionada, atualizar mensagens a cada 10 segundos
useEffect(() => {
  if (!selectedConversation) return;

  const interval = setInterval(() => {
    fetchMessages(selectedConversation.id);
  }, 10000); // 10 segundos

  return () => clearInterval(interval);
}, [selectedConversation?.id]);
```

### Detecção de Novas Mensagens
```typescript
const previousMessageCount = useRef(0);

// No fetchMessages:
const inboundCount = newMessages.filter(m => m.direction === "inbound").length;
if (inboundCount > previousMessageCount.current) {
  playNotificationSound(); // Nova mensagem recebida!
}
previousMessageCount.current = inboundCount;
```

### Indicador de Última Atualização
```typescript
const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

// Após cada fetch bem-sucedido:
setLastUpdate(new Date());

// Na UI:
<span className="text-xs text-muted-foreground">
  Atualizado {formatDistanceToNow(lastUpdate, { addSuffix: true, locale: ptBR })}
</span>
```

---

## Fluxo Final

```text
Usuário abre Chat de Leads
    │
    ├── Lista de conversas atualiza a cada 30s
    │
    └── Usuário seleciona uma conversa
            │
            ├── Carrega mensagens imediatamente
            │
            ├── Inicia polling de mensagens (10s)
            │
            ├── Se nova mensagem inbound → toca som
            │
            └── Mostra "Última atualização: há X segundos"
```

---

## Considerações

- **Rate Limiting**: O GHL tem limites de API, mas 10s para mensagens e 30s para lista é conservador o suficiente
- **Performance**: O polling é interrompido quando o usuário sai da aba ou fecha a conversa
- **UX**: O indicador visual dá confiança ao usuário de que as mensagens estão atualizando
- **Fallback**: O botão manual de atualizar continua disponível caso necessário

---

## Resultado Esperado
- Mensagens aparecem automaticamente em até 10 segundos após recebidas
- Som de notificação quando chega nova mensagem do lead
- Feedback visual claro mostrando que o sistema está ativo
