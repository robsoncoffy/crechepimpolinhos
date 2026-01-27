
# Plano: Integração Completa Control iD iDClass Bio

## Resumo

Integrar o relógio de ponto Control iD iDClass Bio com o sistema de ponto eletrônico existente, utilizando:
- **Monitor (Push)**: O relógio envia batidas em tempo real via webhook
- **Polling (Backup)**: Job periódico busca registros do relógio para garantir sincronização
- **CPF**: Como identificador único para vincular funcionários

## Arquitetura da Integração

```text
┌─────────────────┐         Push (Realtime)         ┌──────────────────────┐
│                 │ ─────────────────────────────▶  │                      │
│  iDClass Bio    │                                 │  controlid-webhook   │
│  (Relógio)      │ ◀────────────────────────────── │  (Edge Function)     │
│                 │         Polling (5 min)         │                      │
└─────────────────┘                                 └──────────────────────┘
                                                              │
                                                              ▼
                                                    ┌──────────────────────┐
                                                    │  employee_time_clock │
                                                    │  (Tabela)            │
                                                    └──────────────────────┘
```

---

## Etapa 1: Atualizar Webhook Existente

O webhook atual precisa ser adaptado para receber o formato do **Monitor** do Control iD.

**Arquivo:** `supabase/functions/controlid-webhook/index.ts`

**Mudanças:**
- Aceitar formato `/api/notifications/dao` com `object_changes`
- Mapear `user_id` do relógio para funcionário via CPF
- Suportar tanto formato atual quanto formato Monitor

**Formato recebido do Monitor:**
```json
{
  "object_changes": [{
    "object": "access_logs",
    "type": "inserted",
    "values": {
      "id": "519",
      "time": "1532977090",
      "user_id": "123",
      "device_id": "478435"
    }
  }],
  "device_id": 478435
}
```

---

## Etapa 2: Criar Edge Function de Polling

Nova função que conecta ao relógio periodicamente para buscar registros não sincronizados.

**Arquivo:** `supabase/functions/controlid-sync/index.ts`

**Funcionalidades:**
- Fazer login no relógio (sessão)
- Buscar `access_logs` desde último sync
- Comparar com registros existentes
- Inserir apenas registros novos
- Registrar timestamp do último sync

**Fluxo:**
1. `POST /login.fcgi` → obter sessão
2. `POST /load_objects.fcgi` → buscar access_logs
3. Filtrar registros já existentes
4. Inserir novos no `employee_time_clock`
5. Atualizar `last_sync_at` na config

---

## Etapa 3: Criar Tabela de Mapeamento

Tabela para vincular IDs do relógio aos funcionários via CPF.

**Tabela:** `controlid_user_mappings`

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | uuid | PK |
| employee_id | uuid | FK para employee_profiles |
| controlid_user_id | integer | ID do usuário no relógio |
| cpf | text | CPF para mapeamento |
| device_id | text | ID do dispositivo |
| synced_at | timestamp | Última sincronização |

---

## Etapa 4: Atualizar Tabela de Configuração

Adicionar campos necessários na `time_clock_config`:

| Campo | Tipo | Descrição |
|-------|------|-----------|
| device_ip | text | IP do relógio na rede |
| device_login | text | Usuário (default: admin) |
| device_password | text | Senha (criptografada) |
| last_sync_at | timestamp | Último polling bem-sucedido |
| sync_interval_minutes | integer | Intervalo do polling (default: 5) |

---

## Etapa 5: Criar Tela de Configuração Admin

Interface para gerenciar a integração.

**Arquivo:** `src/pages/admin/AdminTimeClockConfig.tsx`

**Funcionalidades:**
- Configurar IP/credenciais do relógio
- Testar conexão com o equipamento
- Ver status do último sync
- Sincronizar funcionários (enviar para o relógio)
- Buscar registros manualmente
- Ver logs de sincronização

**Seções:**
1. **Conexão**: IP, usuário, senha, testar
2. **Funcionários**: Lista de mapeados, sincronizar novos
3. **Logs**: Últimas sincronizações, erros
4. **Manual**: Botão para forçar sync

---

## Etapa 6: Criar Job de Polling (Cron)

Agendar execução periódica do sync.

**SQL (pg_cron):**
```sql
SELECT cron.schedule(
  'controlid-sync-every-5-min',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url:='https://xxx.supabase.co/functions/v1/controlid-sync',
    headers:='{"Authorization": "Bearer ANON_KEY"}'::jsonb,
    body:='{}'::jsonb
  );
  $$
);
```

---

## Etapa 7: Criar Edge Function para Sincronizar Funcionários

Enviar funcionários cadastrados para o relógio.

**Arquivo:** `supabase/functions/controlid-sync-employees/index.ts`

**Funcionalidades:**
- Buscar funcionários ativos com CPF
- Enviar para o relógio via `add_users.fcgi`
- Salvar mapeamento de IDs
- Retornar status de cada funcionário

---

## Estrutura de Arquivos

```text
supabase/functions/
├── controlid-webhook/index.ts      # Atualizar (receber Monitor)
├── controlid-sync/index.ts         # Novo (polling backup)
├── controlid-sync-employees/index.ts # Novo (enviar funcionários)
└── controlid-test-connection/index.ts # Novo (testar conexão)

src/pages/admin/
└── AdminTimeClockConfig.tsx        # Nova tela de configuração

supabase/migrations/
└── xxx_controlid_integration.sql   # Tabelas e colunas novas
```

---

## Configuração no Relógio

Após implementação, configurar no painel do iDClass:

1. **Acessar**: `http://[IP-DO-RELOGIO]/`
2. **Login**: admin / admin
3. **Configurar Monitor**:
   - Hostname: `ksguxhmqctmepbddbhdz.supabase.co`
   - Port: `443`
   - Path: `functions/v1/controlid-webhook`

---

## Detalhes Técnicos

### Tratamento de Duplicatas
- Usar constraint único em `(device_id, controlid_log_id)` para evitar duplicatas
- Polling verifica se registro já existe antes de inserir

### Segurança
- Credenciais do relógio armazenadas criptografadas
- Webhook valida `device_id` configurado
- SSL para comunicação com relógio (HTTPS)

### Logs e Monitoramento
- Tabela `controlid_sync_logs` para histórico
- Alerta se sync falhar por mais de 30 minutos
- Dashboard mostra status em tempo real

---

## Sequência de Implementação

1. Criar migração com tabelas novas
2. Atualizar webhook existente
3. Criar função de teste de conexão
4. Criar função de sync de funcionários
5. Criar função de polling
6. Criar tela de configuração
7. Agendar cron job
8. Testar integração completa
