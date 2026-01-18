-- Add cpf and rg columns to profiles table for parent documents
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS cpf text,
ADD COLUMN IF NOT EXISTS rg text;

-- Add comment for clarity
COMMENT ON COLUMN public.profiles.cpf IS 'CPF do responsável (pai/mãe)';
COMMENT ON COLUMN public.profiles.rg IS 'RG do responsável (pai/mãe)';