-- Payroll / Holerites

-- 1) Tables
CREATE TABLE IF NOT EXISTS public.payroll_payslips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_user_id UUID NOT NULL,
  period_year INT NOT NULL,
  period_month INT NOT NULL,
  base_salary NUMERIC NOT NULL DEFAULT 0,
  net_salary NUMERIC NULL,
  hours_worked NUMERIC NOT NULL DEFAULT 0,
  overtime_hours NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  created_by UUID NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (employee_user_id, period_year, period_month)
);

CREATE TABLE IF NOT EXISTS public.payroll_payslip_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payslip_id UUID NOT NULL REFERENCES public.payroll_payslips(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  label TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.payroll_payslip_lines
  ADD CONSTRAINT payroll_payslip_lines_kind_check
  CHECK (kind IN ('earning','deduction'));

CREATE TABLE IF NOT EXISTS public.employee_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_user_id UUID NOT NULL,
  doc_type TEXT NOT NULL,
  title TEXT NOT NULL,
  bucket_id TEXT NOT NULL DEFAULT 'employee-documents',
  file_path TEXT NOT NULL,
  created_by UUID NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2) Triggers for updated_at
DROP TRIGGER IF EXISTS update_payroll_payslips_updated_at ON public.payroll_payslips;
CREATE TRIGGER update_payroll_payslips_updated_at
BEFORE UPDATE ON public.payroll_payslips
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_employee_documents_updated_at ON public.employee_documents;
CREATE TRIGGER update_employee_documents_updated_at
BEFORE UPDATE ON public.employee_documents
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) Enable RLS
ALTER TABLE public.payroll_payslips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_payslip_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_documents ENABLE ROW LEVEL SECURITY;

-- 4) RLS policies
-- Payslips
DROP POLICY IF EXISTS "Payslips: employee can view own or admin can view all" ON public.payroll_payslips;
CREATE POLICY "Payslips: employee can view own or admin can view all"
ON public.payroll_payslips
FOR SELECT
USING (
  auth.uid() = employee_user_id
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);

DROP POLICY IF EXISTS "Payslips: admin can manage" ON public.payroll_payslips;
CREATE POLICY "Payslips: admin can manage"
ON public.payroll_payslips
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Payslips: admin can update" ON public.payroll_payslips;
CREATE POLICY "Payslips: admin can update"
ON public.payroll_payslips
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Payslips: admin can delete" ON public.payroll_payslips;
CREATE POLICY "Payslips: admin can delete"
ON public.payroll_payslips
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Payslip lines (inherit access through parent)
DROP POLICY IF EXISTS "Payslip lines: employee can view own or admin can view all" ON public.payroll_payslip_lines;
CREATE POLICY "Payslip lines: employee can view own or admin can view all"
ON public.payroll_payslip_lines
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.payroll_payslips p
    WHERE p.id = payroll_payslip_lines.payslip_id
      AND (
        p.employee_user_id = auth.uid()
        OR public.has_role(auth.uid(), 'admin'::public.app_role)
      )
  )
);

DROP POLICY IF EXISTS "Payslip lines: admin can manage" ON public.payroll_payslip_lines;
CREATE POLICY "Payslip lines: admin can manage"
ON public.payroll_payslip_lines
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Payslip lines: admin can update" ON public.payroll_payslip_lines;
CREATE POLICY "Payslip lines: admin can update"
ON public.payroll_payslip_lines
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Payslip lines: admin can delete" ON public.payroll_payslip_lines;
CREATE POLICY "Payslip lines: admin can delete"
ON public.payroll_payslip_lines
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Employee documents
DROP POLICY IF EXISTS "Employee docs: employee can view own or admin can view all" ON public.employee_documents;
CREATE POLICY "Employee docs: employee can view own or admin can view all"
ON public.employee_documents
FOR SELECT
USING (
  auth.uid() = employee_user_id
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);

DROP POLICY IF EXISTS "Employee docs: admin can insert" ON public.employee_documents;
CREATE POLICY "Employee docs: admin can insert"
ON public.employee_documents
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Employee docs: admin can update" ON public.employee_documents;
CREATE POLICY "Employee docs: admin can update"
ON public.employee_documents
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Employee docs: admin can delete" ON public.employee_documents;
CREATE POLICY "Employee docs: admin can delete"
ON public.employee_documents
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 5) Storage bucket for RH documents (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('employee-documents', 'employee-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: allow admin full access; employee only to their own folder (user_id/...)
DROP POLICY IF EXISTS "Employee docs bucket: view" ON storage.objects;
CREATE POLICY "Employee docs bucket: view"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'employee-documents'
  AND (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR (storage.foldername(name))[1] = auth.uid()::text
  )
);

DROP POLICY IF EXISTS "Employee docs bucket: upload" ON storage.objects;
CREATE POLICY "Employee docs bucket: upload"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'employee-documents'
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
);

DROP POLICY IF EXISTS "Employee docs bucket: update" ON storage.objects;
CREATE POLICY "Employee docs bucket: update"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'employee-documents'
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
);

DROP POLICY IF EXISTS "Employee docs bucket: delete" ON storage.objects;
CREATE POLICY "Employee docs bucket: delete"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'employee-documents'
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
);
