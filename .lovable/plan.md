
# Webhook de Ponto Eletrônico Control iD

## Resumo
Criar uma nova Edge Function que recebe marcações de ponto em formato simplificado via POST, salva no banco de dados e atualiza o dashboard em tempo real.

## Formato de Entrada Esperado
```json
{
  "marcacoes": [
    {
      "cpf": "12345678900",
      "hora": "08:00",
      "tipo": "entrada",
      "timestamp": "2026-02-03T08:00:00Z"
    }
  ]
}
```

## O Que Será Criado

### 1. Nova Edge Function: `webhook-ponto`
- **Endpoint**: `POST /functions/v1/webhook-ponto`
- **Funcionalidades**:
  - Receber array de marcações em lote
  - Validar CPF e buscar funcionário
  - Mapear tipo para clock_type do banco (entrada→entry, saida→exit, intervalo_inicio→break_start, intervalo_fim→break_end)
  - Inserir registros na tabela `employee_time_clock`
  - Retornar resumo de sucesso/erros

### 2. Configuração
- Adicionar `verify_jwt = false` no `supabase/config.toml` para permitir chamadas externas sem autenticação

## Dashboard em Tempo Real
O dashboard já está configurado para atualizar automaticamente. O componente `TimeClockStatusCard` já possui:
- Subscription no Supabase Realtime para a tabela `employee_time_clock`
- Atualização automática quando novos registros são inseridos

## Mapeamento de Tipos

| Valor Recebido | clock_type no Banco |
|----------------|---------------------|
| `entrada` / `entry` | `entry` |
| `saida` / `exit` | `exit` |
| `intervalo_inicio` / `break_start` | `break_start` |
| `intervalo_fim` / `break_end` | `break_end` |

---

## Detalhes Técnicos

### Estrutura da Edge Function
```text
supabase/functions/webhook-ponto/index.ts
```

### Fluxo de Processamento
```text
1. Receber POST com JSON
2. Validar estrutura do payload
3. Para cada marcação:
   a. Limpar CPF (remover pontuação)
   b. Buscar funcionário por CPF
   c. Mapear tipo para clock_type
   d. Inserir em employee_time_clock
4. Retornar resumo
```

### Resposta de Sucesso
```json
{
  "success": true,
  "processed": 5,
  "failed": 0,
  "results": [
    { "cpf": "123...", "status": "ok", "employee": "João Silva" },
    { "cpf": "456...", "status": "error", "error": "CPF não encontrado" }
  ]
}
```

### Segurança (Opcional)
- Suporte a header `x-webhook-secret` para validação
- Usa secret configurado em `time_clock_config` (já existente)

### Arquivos a Criar/Modificar
1. `supabase/functions/webhook-ponto/index.ts` - Nova função
2. `supabase/config.toml` - Adicionar configuração da função
