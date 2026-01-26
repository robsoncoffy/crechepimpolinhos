
# Plano: Sincronização de Calendário com GoHighLevel

## Objetivo
Integrar o calendário escolar do Pimpolinhos com o GoHighLevel, permitindo:
1. Visualizar e agendar visitas escolares diretamente pelo painel
2. Sincronizar agendamentos bidirecionalmente (Painel <-> GHL)
3. Consolidar eventos internos e visitas em uma interface unificada

---

## Arquitetura Proposta

```text
+------------------+      +--------------------+      +------------------+
|   Frontend       |      |   Edge Function    |      |  GoHighLevel     |
|   AdminCalendar  | <--> |  ghl-calendar      | <--> |  Calendar API    |
+------------------+      +--------------------+      +------------------+
         |                         |
         v                         v
+------------------+      +--------------------+
|  school_events   |      |  scheduled_visits  |
|  (eventos)       |      |  (visitas - nova)  |
+------------------+      +--------------------+
```

---

## Etapas de Implementação

### Etapa 1: Criar Nova Edge Function `ghl-calendar`
Desenvolver uma Edge Function para comunicação com a API de calendários do GHL:
- `action: "calendars"` - Listar calendários disponíveis
- `action: "free-slots"` - Buscar horários livres
- `action: "create-appointment"` - Criar agendamento de visita
- `action: "list-appointments"` - Listar agendamentos
- `action: "cancel-appointment"` - Cancelar visita

### Etapa 2: Criar Tabela `scheduled_visits`
Nova tabela para armazenar visitas agendadas localmente:
- `id`, `ghl_appointment_id` (sincronização)
- `contact_name`, `contact_email`, `contact_phone`
- `scheduled_at` (data/hora da visita)
- `status` (pendente, confirmada, realizada, cancelada)
- `notes`, `created_at`, `updated_at`
- `pre_enrollment_id` (opcional, link com pré-matrícula)

### Etapa 3: Criar Página "Agenda de Visitas"
Nova página `/painel/visitas` com:
- **Visualização em Calendário**: Dias com visitas destacados
- **Lista de Visitas**: Próximas visitas com detalhes do lead
- **Modal de Agendamento**: Selecionar data/hora dos slots disponíveis
- **Ações Rápidas**: Confirmar, remarcar, cancelar, registrar como realizada
- **Integração com Pipeline**: Mover lead para "Visita Agendada" automaticamente

### Etapa 4: Atualizar Sidebar
Adicionar novo item na seção "Comunicação" ou "Cadastros":
- Ícone: `CalendarCheck` ou similar
- Label: "Visitas Agendadas"
- Rota: `/painel/visitas`
- Roles: `["admin"]`

### Etapa 5: Unificar Calendário Existente
Aprimorar a página de Eventos (`/painel/eventos`) para mostrar também as visitas:
- Tab "Eventos da Escola" (atual)
- Tab "Visitas Agendadas" (nova, com link para detalhes)
- Ou: Marcadores visuais no calendário diferenciando tipos

---

## Detalhes Técnicos

### Edge Function `ghl-calendar` - Endpoints

**Listar Calendários:**
```
POST { action: "calendars" }
-> GET /calendars?locationId={locationId}
```

**Buscar Slots Livres:**
```
POST { action: "free-slots", calendarId, startDate, endDate }
-> GET /calendars/{calendarId}/free-slots?startDate=...&endDate=...
```

**Criar Agendamento:**
```
POST { 
  action: "create-appointment", 
  calendarId, 
  contactId, 
  startTime, 
  endTime, 
  title, 
  notes 
}
-> POST /calendars/events/appointments
```

### Estrutura da Tabela `scheduled_visits`

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | uuid | PK |
| ghl_appointment_id | text | ID do agendamento no GHL |
| ghl_calendar_id | text | ID do calendário usado |
| contact_name | text | Nome do lead |
| contact_email | text | Email |
| contact_phone | text | Telefone |
| scheduled_at | timestamptz | Data/hora da visita |
| status | text | pendente/confirmada/realizada/cancelada |
| notes | text | Observações |
| pre_enrollment_id | uuid (FK) | Link opcional com pré-matrícula |
| created_by | uuid (FK) | Quem agendou |
| created_at | timestamptz | Criação |
| updated_at | timestamptz | Última atualização |

### Componentes do Frontend

1. **AdminVisits.tsx** - Página principal
2. **VisitCalendarView.tsx** - Visualização em calendário
3. **VisitListView.tsx** - Lista de visitas
4. **ScheduleVisitDialog.tsx** - Modal de agendamento
5. **VisitDetailsSheet.tsx** - Detalhes da visita

---

## Fluxo do Usuário

1. Admin acessa "Visitas Agendadas"
2. Clica em "Agendar Visita"
3. Seleciona/busca um contato do GHL ou da pré-matrícula
4. Escolhe data no calendário (slots disponíveis destacados)
5. Seleciona horário disponível
6. Adiciona observações
7. Sistema cria agendamento no GHL + registro local
8. Lead é movido para etapa "Visita Agendada" no pipeline
9. Notificação/email automático para o lead

---

## Considerações

- **Sincronização**: Os agendamentos feitos diretamente no GHL podem ser sincronizados via polling periódico ou webhook
- **Timezone**: Garantir que horários estejam em America/Sao_Paulo
- **Permissões**: Apenas admins podem gerenciar visitas inicialmente
- **RLS**: Políticas para proteger dados de visitas

---

## Resumo de Arquivos

| Arquivo | Ação |
|---------|------|
| `supabase/functions/ghl-calendar/index.ts` | Criar |
| `supabase/config.toml` | Atualizar (adicionar function) |
| `src/pages/admin/AdminVisits.tsx` | Criar |
| `src/components/admin/visits/*.tsx` | Criar (3-4 componentes) |
| `src/components/admin/AdminSidebar.tsx` | Atualizar |
| `src/App.tsx` | Atualizar (nova rota) |
| Migração SQL (scheduled_visits) | Criar |

