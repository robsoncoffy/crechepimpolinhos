-- Tabela de mapeamento entre usuários do relógio e funcionários
CREATE TABLE public.controlid_user_mappings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employee_profiles(id) ON DELETE CASCADE,
  controlid_user_id INTEGER NOT NULL,
  cpf TEXT NOT NULL,
  device_id TEXT,
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(controlid_user_id, device_id),
  UNIQUE(employee_id, device_id)
);

-- Tabela de logs de sincronização
CREATE TABLE public.controlid_sync_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sync_type TEXT NOT NULL CHECK (sync_type IN ('push', 'polling', 'manual')),
  status TEXT NOT NULL CHECK (status IN ('success', 'error', 'partial')),
  records_synced INTEGER DEFAULT 0,
  records_failed INTEGER DEFAULT 0,
  error_message TEXT,
  device_id TEXT,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  details JSONB DEFAULT '{}'::jsonb
);

-- Adicionar colunas na time_clock_config
ALTER TABLE public.time_clock_config 
ADD COLUMN IF NOT EXISTS device_ip TEXT,
ADD COLUMN IF NOT EXISTS device_login TEXT DEFAULT 'admin',
ADD COLUMN IF NOT EXISTS device_password TEXT,
ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS sync_interval_minutes INTEGER DEFAULT 5,
ADD COLUMN IF NOT EXISTS device_name TEXT;

-- Adicionar coluna controlid_log_id na tabela de ponto para evitar duplicatas
ALTER TABLE public.employee_time_clock
ADD COLUMN IF NOT EXISTS controlid_log_id TEXT,
ADD CONSTRAINT employee_time_clock_controlid_unique UNIQUE (device_id, controlid_log_id);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_controlid_mappings_cpf ON public.controlid_user_mappings(cpf);
CREATE INDEX IF NOT EXISTS idx_controlid_mappings_controlid_user ON public.controlid_user_mappings(controlid_user_id);
CREATE INDEX IF NOT EXISTS idx_controlid_sync_logs_created ON public.controlid_sync_logs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_employee_time_clock_controlid ON public.employee_time_clock(controlid_log_id) WHERE controlid_log_id IS NOT NULL;

-- Trigger para updated_at
CREATE TRIGGER update_controlid_mappings_updated_at
BEFORE UPDATE ON public.controlid_user_mappings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.controlid_user_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.controlid_sync_logs ENABLE ROW LEVEL SECURITY;

-- Políticas RLS - apenas admins podem gerenciar
CREATE POLICY "Admins can manage controlid mappings"
ON public.controlid_user_mappings
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage controlid sync logs"
ON public.controlid_sync_logs
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));