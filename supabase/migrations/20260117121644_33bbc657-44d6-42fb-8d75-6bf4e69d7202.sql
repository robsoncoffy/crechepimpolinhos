-- Create table for complete child registration by parents
CREATE TABLE public.child_registrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  parent_id UUID NOT NULL,
  
  -- Child basic info
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  birth_date DATE NOT NULL,
  photo_url TEXT,
  
  -- Address
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  
  -- Documents
  cpf TEXT,
  rg TEXT,
  birth_certificate_url TEXT,
  sus_card TEXT,
  
  -- Medical info
  allergies TEXT,
  medications TEXT,
  continuous_doctors TEXT,
  private_doctors TEXT,
  
  -- Enrollment type
  enrollment_type TEXT NOT NULL CHECK (enrollment_type IN ('municipal', 'private')),
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for authorized people to pick up the child
CREATE TABLE public.authorized_pickups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  registration_id UUID NOT NULL REFERENCES public.child_registrations(id) ON DELETE CASCADE,
  
  full_name TEXT NOT NULL,
  relationship TEXT NOT NULL,
  document_url TEXT,
  is_approved BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.child_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.authorized_pickups ENABLE ROW LEVEL SECURITY;

-- RLS Policies for child_registrations
CREATE POLICY "Parents can insert own registrations"
ON public.child_registrations
FOR INSERT
WITH CHECK (auth.uid() = parent_id);

CREATE POLICY "Parents can view own registrations"
ON public.child_registrations
FOR SELECT
USING (auth.uid() = parent_id OR is_staff(auth.uid()));

CREATE POLICY "Parents can update own registrations"
ON public.child_registrations
FOR UPDATE
USING (auth.uid() = parent_id);

CREATE POLICY "Staff can manage all registrations"
ON public.child_registrations
FOR ALL
USING (is_staff(auth.uid()));

-- RLS Policies for authorized_pickups
CREATE POLICY "Parents can insert authorized pickups"
ON public.authorized_pickups
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.child_registrations 
    WHERE id = registration_id AND parent_id = auth.uid()
  )
);

CREATE POLICY "Parents can view own authorized pickups"
ON public.authorized_pickups
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.child_registrations 
    WHERE id = registration_id AND (parent_id = auth.uid() OR is_staff(auth.uid()))
  )
);

CREATE POLICY "Parents can update own authorized pickups"
ON public.authorized_pickups
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.child_registrations 
    WHERE id = registration_id AND parent_id = auth.uid()
  )
);

CREATE POLICY "Parents can delete own authorized pickups"
ON public.authorized_pickups
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.child_registrations 
    WHERE id = registration_id AND parent_id = auth.uid()
  )
);

CREATE POLICY "Staff can manage all authorized pickups"
ON public.authorized_pickups
FOR ALL
USING (is_staff(auth.uid()));

-- Create storage bucket for child documents
INSERT INTO storage.buckets (id, name, public) VALUES ('child-documents', 'child-documents', true);

-- Storage policies for child-documents bucket
CREATE POLICY "Authenticated users can upload their child documents"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'child-documents' AND auth.role() = 'authenticated');

CREATE POLICY "Users can view documents"
ON storage.objects
FOR SELECT
USING (bucket_id = 'child-documents');

CREATE POLICY "Users can update their documents"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'child-documents' AND auth.role() = 'authenticated');

CREATE POLICY "Users can delete their documents"
ON storage.objects
FOR DELETE
USING (bucket_id = 'child-documents' AND auth.role() = 'authenticated');

-- Trigger for updated_at
CREATE TRIGGER update_child_registrations_updated_at
BEFORE UPDATE ON public.child_registrations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();