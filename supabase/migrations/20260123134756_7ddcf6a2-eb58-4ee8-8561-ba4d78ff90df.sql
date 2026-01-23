-- Criar enum para tipo de vaga
CREATE TYPE public.vacancy_type AS ENUM ('municipal', 'particular');

-- Adicionar coluna vacancy_type à tabela pre_enrollments
ALTER TABLE public.pre_enrollments
ADD COLUMN IF NOT EXISTS vacancy_type public.vacancy_type NOT NULL DEFAULT 'particular';

-- Adicionar índice para filtrar por tipo de vaga
CREATE INDEX IF NOT EXISTS idx_pre_enrollments_vacancy_type
ON public.pre_enrollments(vacancy_type);

-- Criar índice composto para vagas municipais pendentes
CREATE INDEX IF NOT EXISTS idx_pre_enrollments_municipal_pending
ON public.pre_enrollments(vacancy_type, status)
WHERE vacancy_type = 'municipal' AND status = 'pending';