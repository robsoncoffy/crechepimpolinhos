-- Renomear coluna child_name para parent_name na tabela parent_invites
ALTER TABLE public.parent_invites 
RENAME COLUMN child_name TO parent_name;

-- Adicionar comentário explicativo
COMMENT ON COLUMN public.parent_invites.parent_name IS 'Nome do responsável para identificação do convite e criação do contato no GHL';