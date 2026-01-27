

## Plano: Sistema de Confirmação e Retry para WhatsApp

### Resumo do Problema
Mensagens de WhatsApp enviadas via GoHighLevel (GHL) às vezes falham silenciosamente. Atualmente, o sistema não tem como confirmar se a mensagem chegou ao destinatário nem reenviar automaticamente em caso de falha.

### Solução Proposta
Implementar um sistema completo de rastreamento, confirmação e retry automático para mensagens WhatsApp, similar ao que já existe para emails.

```text
┌─────────────────┐    ┌───────────────┐    ┌──────────────────┐
│ Enviar Convite  │───▶│  Salva na DB  │───▶│  Envia via GHL   │
└─────────────────┘    │ status=sent   │    └────────┬─────────┘
                       └───────────────┘             │
                                                     ▼
┌─────────────────┐    ┌───────────────┐    ┌──────────────────┐
│ Retry Automático│◀───│ status=error  │◀───│  Webhook GHL     │
│ (cron 5min)     │    │               │    │  (callback)      │
└────────┬────────┘    └───────────────┘    └──────────────────┘
         │                                           │
         ▼                                           ▼
┌─────────────────┐                         ┌──────────────────┐
│  Reenvia até    │                         │ status=delivered │
│  3 tentativas   │                         │ (confirmado!)    │
└─────────────────┘                         └──────────────────┘
```

### Componentes a Implementar

**1. Nova Tabela: `whatsapp_message_logs`**
- Rastrear todas as mensagens WhatsApp enviadas
- Campos: `id`, `contact_id`, `phone`, `message_preview`, `ghl_message_id`, `status` (pending, sent, delivered, failed), `retry_count`, `next_retry_at`, `template_type`, `metadata`

**2. Webhook GHL: `ghl-message-webhook`**
- Receber callbacks do GHL sobre status de mensagens
- Atualizar o status na tabela `whatsapp_message_logs`
- Tipos de status: `sent`, `delivered`, `read`, `failed`

**3. Atualização das Edge Functions de Envio**
- `send-parent-invite-email`: Salvar mensagem na nova tabela antes de enviar
- `send-approval-email`: Idem
- `ghl-sync-contact`: Idem para mensagens de pré-matrícula

**4. Função de Retry: `retry-failed-whatsapp`**
- Cron job que roda a cada 5 minutos
- Busca mensagens com `status=failed` ou `status=sent` há mais de 10 minutos sem confirmação
- Reenvia até 3 vezes com backoff exponencial (5min, 15min, 45min)

**5. Atualização da Interface Admin**
- Widget no Dashboard mostrando mensagens pendentes/falhadas
- Botão de "Reenviar" manual nos convites

### Limitações Conhecidas

O GHL não garante 100% de confirmação de entrega. A API retorna status como:
- `sent` = Enviado para o GHL (não significa que chegou ao WhatsApp)
- `delivered` = Confirmado pelo WhatsApp (nem sempre disponível)
- `read` = Lido pelo destinatário (nem sempre disponível)

Por isso, o sistema considerará "sucesso" quando:
1. Receber webhook com `status=delivered` ou `status=read`, OU
2. Passar 24h sem erro explícito

### Detalhes Técnicos

**Nova Tabela SQL:**
```sql
CREATE TABLE whatsapp_message_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ghl_contact_id TEXT,
  ghl_message_id TEXT,
  phone TEXT NOT NULL,
  message_preview TEXT,
  template_type TEXT,
  status TEXT DEFAULT 'pending',
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  next_retry_at TIMESTAMPTZ,
  last_retry_at TIMESTAMPTZ,
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Configuração do Webhook no GHL:**
Será necessário configurar manualmente no dashboard do GHL:
- URL: `https://ksguxhmqctmepbddbhdz.supabase.co/functions/v1/ghl-message-webhook`
- Evento: `OutboundMessage`

**Cron Job para Retry:**
Será configurado via `pg_cron` para rodar a cada 5 minutos.

### Próximos Passos Após Implementação
1. Configurar webhook no painel do GHL
2. Testar envio de convite e verificar logs
3. Simular falha e verificar retry automático

