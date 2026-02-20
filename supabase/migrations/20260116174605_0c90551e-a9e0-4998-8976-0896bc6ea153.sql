-- Criar enum para roles
CREATE TYPE public.app_role AS ENUM ('admin', 'teacher', 'parent');

-- Criar enum para turmas
CREATE TYPE public.class_type AS ENUM ('bercario', 'maternal', 'jardim');

-- Criar enum para turnos
CREATE TYPE public.shift_type AS ENUM ('manha', 'tarde', 'integral');

-- Criar enum para status de aprovação
CREATE TYPE public.approval_status AS ENUM ('pending', 'approved', 'rejected');

-- Criar enum para opções de refeição
CREATE TYPE public.meal_status AS ENUM ('tudo', 'quase_tudo', 'metade', 'pouco', 'nao_aceitou');

-- Criar enum para evacuação
CREATE TYPE public.evacuation_status AS ENUM ('normal', 'pastosa', 'liquida', 'nao');

-- Tabela de perfis de usuário
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    phone TEXT,
    avatar_url TEXT,
    status approval_status DEFAULT 'pending' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Tabela de roles separada (segurança)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    UNIQUE(user_id, role)
);

-- Tabela de crianças
CREATE TABLE public.children (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    birth_date DATE NOT NULL,
    class_type class_type NOT NULL,
    shift_type shift_type NOT NULL,
    photo_url TEXT,
    allergies TEXT,
    medical_info TEXT,
    pediatrician_name TEXT,
    pediatrician_phone TEXT,
    authorized_pickups TEXT[], -- Pessoas autorizadas a buscar
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Tabela de relação pais/responsáveis com crianças
CREATE TABLE public.parent_children (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    child_id UUID REFERENCES public.children(id) ON DELETE CASCADE NOT NULL,
    relationship TEXT DEFAULT 'responsável' NOT NULL,
    UNIQUE(parent_id, child_id)
);

-- Tabela de registro diário (agenda)
CREATE TABLE public.daily_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id UUID REFERENCES public.children(id) ON DELETE CASCADE NOT NULL,
    record_date DATE DEFAULT CURRENT_DATE NOT NULL,
    teacher_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- Refeições
    breakfast meal_status,
    lunch meal_status,
    snack meal_status,
    dinner meal_status,
    
    -- Fralda/Banheiro
    urinated BOOLEAN DEFAULT false,
    evacuated evacuation_status,
    
    -- Sono
    slept_morning BOOLEAN DEFAULT false,
    slept_afternoon BOOLEAN DEFAULT false,
    sleep_notes TEXT,
    
    -- Saúde
    had_fever BOOLEAN DEFAULT false,
    temperature DECIMAL(3,1),
    took_medicine BOOLEAN DEFAULT false,
    medicine_notes TEXT,
    
    -- Recados
    school_notes TEXT,
    parent_notes TEXT,
    
    -- Atividades realizadas
    activities TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    
    UNIQUE(child_id, record_date)
);

-- Tabela de acompanhamento mensal
CREATE TABLE public.monthly_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id UUID REFERENCES public.children(id) ON DELETE CASCADE NOT NULL,
    month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
    year INTEGER NOT NULL,
    weight DECIMAL(4,2),
    height DECIMAL(5,2),
    observations TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    UNIQUE(child_id, month, year)
);

-- Tabela de mensagens/chat
CREATE TABLE public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id UUID REFERENCES public.children(id) ON DELETE CASCADE NOT NULL,
    sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Tabela de formulários de contato (público)
CREATE TABLE public.contact_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.children ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_children ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_submissions ENABLE ROW LEVEL SECURITY;

-- Função para verificar role (SECURITY DEFINER para evitar recursão)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id AND role = _role
    )
$$;

-- Função para verificar se é admin ou teacher
CREATE OR REPLACE FUNCTION public.is_staff(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id AND role IN ('admin', 'teacher')
    )
$$;

-- Função para verificar se pai tem acesso à criança
CREATE OR REPLACE FUNCTION public.parent_has_child_access(_user_id UUID, _child_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.parent_children
        WHERE parent_id = _user_id AND child_id = _child_id
    )
$$;

-- Políticas RLS para profiles
CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Staff can view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (public.is_staff(auth.uid()));

CREATE POLICY "Admin can update all profiles"
ON public.profiles FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Políticas RLS para user_roles
CREATE POLICY "Users can view own roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admin can manage all roles"
ON public.user_roles FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Políticas RLS para children
CREATE POLICY "Parents can view own children"
ON public.children FOR SELECT
TO authenticated
USING (
    public.parent_has_child_access(auth.uid(), id)
    OR public.is_staff(auth.uid())
);

CREATE POLICY "Staff can manage children"
ON public.children FOR ALL
TO authenticated
USING (public.is_staff(auth.uid()));

-- Políticas RLS para parent_children
CREATE POLICY "Users can view own parent_children"
ON public.parent_children FOR SELECT
TO authenticated
USING (
    auth.uid() = parent_id
    OR public.is_staff(auth.uid())
);

CREATE POLICY "Staff can manage parent_children"
ON public.parent_children FOR ALL
TO authenticated
USING (public.is_staff(auth.uid()));

-- Políticas RLS para daily_records
CREATE POLICY "Parents can view own children records"
ON public.daily_records FOR SELECT
TO authenticated
USING (
    public.parent_has_child_access(auth.uid(), child_id)
    OR public.is_staff(auth.uid())
);

CREATE POLICY "Parents can add notes to own children records"
ON public.daily_records FOR UPDATE
TO authenticated
USING (public.parent_has_child_access(auth.uid(), child_id))
WITH CHECK (public.parent_has_child_access(auth.uid(), child_id));

CREATE POLICY "Staff can manage all records"
ON public.daily_records FOR ALL
TO authenticated
USING (public.is_staff(auth.uid()));

-- Políticas RLS para monthly_tracking
CREATE POLICY "Parents can view own children tracking"
ON public.monthly_tracking FOR SELECT
TO authenticated
USING (
    public.parent_has_child_access(auth.uid(), child_id)
    OR public.is_staff(auth.uid())
);

CREATE POLICY "Staff can manage all tracking"
ON public.monthly_tracking FOR ALL
TO authenticated
USING (public.is_staff(auth.uid()));

-- Políticas RLS para messages
CREATE POLICY "Users can view messages for their children"
ON public.messages FOR SELECT
TO authenticated
USING (
    public.parent_has_child_access(auth.uid(), child_id)
    OR public.is_staff(auth.uid())
);

CREATE POLICY "Users can send messages for their children"
ON public.messages FOR INSERT
TO authenticated
WITH CHECK (
    auth.uid() = sender_id
    AND (
        public.parent_has_child_access(auth.uid(), child_id)
        OR public.is_staff(auth.uid())
    )
);

-- Políticas RLS para contact_submissions
CREATE POLICY "Anyone can submit contact"
ON public.contact_submissions FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Admin can view contacts"
ON public.contact_submissions FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can manage contacts"
ON public.contact_submissions FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_children_updated_at
BEFORE UPDATE ON public.children
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_daily_records_updated_at
BEFORE UPDATE ON public.daily_records
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_monthly_tracking_updated_at
BEFORE UPDATE ON public.monthly_tracking
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger para criar perfil automaticamente quando usuário se registra
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (user_id, full_name, status)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), 'pending');
    
    -- Por padrão, novos usuários são pais (precisam aprovação)
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'parent');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();