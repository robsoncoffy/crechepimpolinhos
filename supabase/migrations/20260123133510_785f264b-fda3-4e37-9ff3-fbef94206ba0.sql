-- Adicionar colunas de integração GHL à tabela pre_enrollments
ALTER TABLE public.pre_enrollments
ADD COLUMN IF NOT EXISTS ghl_contact_id text,
ADD COLUMN IF NOT EXISTS ghl_synced_at timestamptz,
ADD COLUMN IF NOT EXISTS ghl_sync_error text;

-- Criar índice para busca por ghl_contact_id
CREATE INDEX IF NOT EXISTS idx_pre_enrollments_ghl_contact_id 
ON public.pre_enrollments(ghl_contact_id) 
WHERE ghl_contact_id IS NOT NULL;