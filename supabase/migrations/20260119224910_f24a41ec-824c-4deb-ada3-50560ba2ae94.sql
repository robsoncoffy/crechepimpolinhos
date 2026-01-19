-- =====================================================
-- CORREÇÕES DE SEGURANÇA RLS - CRÍTICAS
-- =====================================================

-- 1. employee_profiles: Restringir acesso a dados sensíveis
-- Atualmente qualquer staff pode ver dados bancários de todos
-- Correção: Apenas o próprio funcionário ou admin pode ver

DROP POLICY IF EXISTS "Staff can view all employee profiles" ON public.employee_profiles;

CREATE POLICY "Users can view own or admin can view all employee profiles"
ON public.employee_profiles
FOR SELECT
USING (
  auth.uid() = user_id 
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- 2. employee_invites: Corrigir UPDATE policy que é "true"
-- Atualmente qualquer pessoa autenticada pode atualizar convites
-- Correção: Apenas o próprio convite sendo usado ou admin

DROP POLICY IF EXISTS "System can update invite on use" ON public.employee_invites;

CREATE POLICY "User can mark invite as used or admin can update"
ON public.employee_invites
FOR UPDATE
USING (
  -- Admin pode atualizar qualquer convite
  has_role(auth.uid(), 'admin'::app_role)
  -- Ou o convite não foi usado ainda (permitir que o sistema marque como usado durante registro)
  OR (is_used = false AND expires_at > now())
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR (is_used = true) -- Só pode marcar como usado, não pode reverter
);

-- 3. invoices: Restringir visualização para apenas admin
-- Atualmente qualquer staff (professor, cozinheira) pode ver faturas
-- Correção: Apenas admin e o próprio pai

DROP POLICY IF EXISTS "Staff can view all invoices" ON public.invoices;
DROP POLICY IF EXISTS "Staff can manage invoices" ON public.invoices;

CREATE POLICY "Admin can view all invoices"
ON public.invoices
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin can manage invoices"
ON public.invoices
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- 4. subscriptions: Restringir visualização para apenas admin
-- Mesmo problema das invoices

DROP POLICY IF EXISTS "Staff can view all subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Staff can manage subscriptions" ON public.subscriptions;

CREATE POLICY "Admin can view all subscriptions"
ON public.subscriptions
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin can manage subscriptions"
ON public.subscriptions
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- 5. payment_customers: Restringir visualização para apenas admin

DROP POLICY IF EXISTS "Staff can view all payment customers" ON public.payment_customers;
DROP POLICY IF EXISTS "Staff can manage payment customers" ON public.payment_customers;

CREATE POLICY "Admin can view all payment customers"
ON public.payment_customers
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin can manage payment customers"
ON public.payment_customers
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));