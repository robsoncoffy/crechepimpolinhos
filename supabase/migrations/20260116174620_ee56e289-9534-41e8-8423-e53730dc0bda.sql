-- Remover política existente e recriar com validação básica
DROP POLICY IF EXISTS "Anyone can submit contact" ON public.contact_submissions;

-- Criar política mais restritiva (ainda pública, mas com validação de campos)
CREATE POLICY "Anyone can submit contact with valid data"
ON public.contact_submissions FOR INSERT
TO anon, authenticated
WITH CHECK (
    name IS NOT NULL AND name <> '' AND
    email IS NOT NULL AND email <> '' AND
    message IS NOT NULL AND message <> ''
);