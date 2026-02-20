-- Tabela de convites para funcionários
CREATE TABLE public.employee_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invite_code VARCHAR(20) NOT NULL UNIQUE,
  role public.app_role NOT NULL DEFAULT 'teacher',
  is_used BOOLEAN DEFAULT false,
  used_by UUID REFERENCES auth.users(id),
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '7 days')
);

-- Tabela de dados completos dos funcionários
CREATE TABLE public.employee_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  
  -- Dados Pessoais
  full_name VARCHAR(255) NOT NULL,
  birth_date DATE NOT NULL,
  gender VARCHAR(20),
  marital_status VARCHAR(30),
  nationality VARCHAR(100) DEFAULT 'Brasileira',
  place_of_birth VARCHAR(100),
  mother_name VARCHAR(255),
  father_name VARCHAR(255),
  
  -- Documentos
  cpf VARCHAR(14) NOT NULL,
  rg VARCHAR(20),
  rg_issuer VARCHAR(20),
  rg_issue_date DATE,
  pis_pasep VARCHAR(20),
  ctps_number VARCHAR(20),
  ctps_series VARCHAR(10),
  ctps_state VARCHAR(2),
  voter_title VARCHAR(20),
  voter_zone VARCHAR(10),
  voter_section VARCHAR(10),
  military_certificate VARCHAR(30),
  
  -- Endereço
  zip_code VARCHAR(10),
  street VARCHAR(255),
  street_number VARCHAR(20),
  complement VARCHAR(100),
  neighborhood VARCHAR(100),
  city VARCHAR(100),
  state VARCHAR(2),
  
  -- Contato
  phone VARCHAR(20),
  emergency_contact_name VARCHAR(255),
  emergency_contact_phone VARCHAR(20),
  
  -- Dados Bancários
  bank_name VARCHAR(100),
  bank_agency VARCHAR(20),
  bank_account VARCHAR(30),
  bank_account_type VARCHAR(20),
  pix_key VARCHAR(255),
  
  -- Dados Profissionais
  education_level VARCHAR(50),
  specialization VARCHAR(255),
  hire_date DATE,
  job_title VARCHAR(100),
  work_shift VARCHAR(50),
  salary DECIMAL(10,2),
  
  -- Outros
  has_disability BOOLEAN DEFAULT false,
  disability_description TEXT,
  photo_url TEXT,
  documents_url TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de notificações do sistema
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) DEFAULT 'info',
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  link VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.employee_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Policies para employee_invites
CREATE POLICY "Staff can view invites" ON public.employee_invites
  FOR SELECT USING (public.is_staff(auth.uid()));

CREATE POLICY "Admin can create invites" ON public.employee_invites
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Anyone can check valid invite code" ON public.employee_invites
  FOR SELECT USING (is_used = false AND expires_at > now());

CREATE POLICY "System can update invite on use" ON public.employee_invites
  FOR UPDATE USING (true);

-- Policies para employee_profiles
CREATE POLICY "Staff can view all employee profiles" ON public.employee_profiles
  FOR SELECT USING (public.is_staff(auth.uid()));

CREATE POLICY "Users can view own profile" ON public.employee_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON public.employee_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON public.employee_profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admin can manage all profiles" ON public.employee_profiles
  FOR ALL USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Policies para notifications
CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Staff can create notifications" ON public.notifications
  FOR INSERT WITH CHECK (public.is_staff(auth.uid()));

-- Trigger para updated_at
CREATE TRIGGER update_employee_profiles_updated_at
  BEFORE UPDATE ON public.employee_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime para notificações
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;