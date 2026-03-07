

## Análise: Onde o vínculo `parent_children` reverbera no sistema

Após análise completa do código, **o vínculo já reverbera corretamente em todos os locais necessários**. Não há pendências de implementação.

### Locais onde o vínculo `parent_children` (incluindo `relationship`) é utilizado:

| Local | Uso |
|-------|-----|
| **Aprovação de matrícula** (`AdminApprovals`) | Cria o link com relationship ao aprovar |
| **Aprovação de responsável** (`AdminApprovals`) | Cria/atualiza link ao aprovar perfil |
| **Painel do Responsável** (`ParentDashboard`) | Busca filhos vinculados para exibir dados |
| **Gestão de Crianças** (`AdminChildren`) | Exibe responsáveis vinculados e permite vincular novos |
| **PDF da Criança** (`ChildPdfExport`) | Inclui nome e parentesco dos responsáveis no PDF |
| **Contratos** (`AdminContracts`) | Busca responsável vinculado para gerar/enviar contrato |
| **Pagamentos** (`AdminPayments`) | Busca responsável para cobrança e exibição |
| **Perfis** (`AdminProfiles`) | Exibe filhos vinculados ao perfil do responsável |
| **Agenda/Registros diários** (`daily_records` RLS) | Controla acesso via `parent_has_child_access()` |
| **Galeria de fotos** (`gallery_photos` RLS) | Filtra fotos por turma dos filhos vinculados |
| **Avisos** (`announcements` RLS) | Filtra avisos por turma dos filhos vinculados |
| **Chat professor↔responsável** | Acesso baseado no vínculo |
| **Webhook Asaas** | Cria vínculo automaticamente se não existir |
| **Deleção de usuário** (`delete-user`) | Remove links ao deletar |
| **Convite de segundo guardião** (`accept_guardian_invitation`) | Cria link via função segura |
| **AppDataContext** | Cache centralizado dos vínculos para staff |

### Conclusão

O fluxo de aprovação já insere corretamente o `relationship` na tabela `parent_children`, e todos os módulos que consomem esse dado (PDF, contratos, pagamentos, RLS, dashboards) já leem de lá. **Não há local adicional onde o vínculo precise ser replicado.**

