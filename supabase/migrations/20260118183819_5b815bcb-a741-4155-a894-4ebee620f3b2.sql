-- Create enum for clock type
CREATE TYPE public.clock_type AS ENUM ('entry', 'exit', 'break_start', 'break_end');

-- Create enum for clock source
CREATE TYPE public.clock_source AS ENUM ('controlid', 'manual', 'mobile');

-- Create table for time clock configuration
CREATE TABLE public.time_clock_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  device_name TEXT NOT NULL DEFAULT 'Control iD Principal',
  device_ip TEXT,
  webhook_secret TEXT DEFAULT gen_random_uuid()::text,
  is_active BOOLEAN NOT NULL DEFAULT true,
  work_start_time TIME NOT NULL DEFAULT '08:00:00',
  work_end_time TIME NOT NULL DEFAULT '17:00:00',
  tolerance_minutes INTEGER NOT NULL DEFAULT 10,
  break_duration_minutes INTEGER NOT NULL DEFAULT 60,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for employee time clock records
CREATE TABLE public.employee_time_clock (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID REFERENCES public.employee_profiles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  clock_type public.clock_type NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  source public.clock_source NOT NULL DEFAULT 'manual',
  device_id TEXT,
  location TEXT,
  photo_url TEXT,
  verified BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for setup tasks checklist
CREATE TABLE public.time_clock_setup_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_key TEXT NOT NULL UNIQUE,
  task_label TEXT NOT NULL,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  completed_by UUID REFERENCES auth.users(id),
  notes TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default setup tasks
INSERT INTO public.time_clock_setup_tasks (task_key, task_label, order_index) VALUES
('acquire_device', 'Adquirir relógio Control iD (iDClass ou iDFace)', 1),
('configure_wifi', 'Configurar WiFi do relógio na mesma rede', 2),
('access_panel', 'Acessar painel do Control iD (IP do relógio)', 3),
('configure_webhook', 'Configurar webhook URL no relógio', 4),
('set_webhook_secret', 'Configurar webhook secret', 5),
('register_employees', 'Cadastrar funcionários no relógio (CPF como identificador)', 6),
('test_first_record', 'Testar primeiro registro', 7);

-- Insert default configuration
INSERT INTO public.time_clock_config (device_name) VALUES ('Control iD Principal');

-- Enable RLS
ALTER TABLE public.time_clock_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_time_clock ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_clock_setup_tasks ENABLE ROW LEVEL SECURITY;

-- Policies for time_clock_config (admin only)
CREATE POLICY "Admins can manage time clock config" ON public.time_clock_config
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Policies for employee_time_clock
CREATE POLICY "Admins can manage all time clock records" ON public.employee_time_clock
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Employees can view their own records" ON public.employee_time_clock
  FOR SELECT USING (auth.uid() = user_id);

-- Policies for setup tasks (admin only)
CREATE POLICY "Admins can manage setup tasks" ON public.time_clock_setup_tasks
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Create indexes for better performance
CREATE INDEX idx_employee_time_clock_user_id ON public.employee_time_clock(user_id);
CREATE INDEX idx_employee_time_clock_timestamp ON public.employee_time_clock(timestamp);
CREATE INDEX idx_employee_time_clock_employee_id ON public.employee_time_clock(employee_id);

-- Trigger for updated_at
CREATE TRIGGER update_time_clock_config_updated_at
  BEFORE UPDATE ON public.time_clock_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_employee_time_clock_updated_at
  BEFORE UPDATE ON public.employee_time_clock
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for time clock records
ALTER PUBLICATION supabase_realtime ADD TABLE public.employee_time_clock;