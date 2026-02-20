-- Create function to notify parents when a quarterly evaluation is created
CREATE OR REPLACE FUNCTION public.notify_parent_quarterly_evaluation()
RETURNS TRIGGER AS $$
DECLARE
  parent_record RECORD;
  child_record RECORD;
  quarter_name TEXT;
BEGIN
  -- Get child info
  SELECT full_name INTO child_record FROM public.children WHERE id = NEW.child_id;
  
  -- Map quarter number to name
  quarter_name := CASE NEW.quarter
    WHEN 1 THEN '1º Trimestre'
    WHEN 2 THEN '2º Trimestre'
    WHEN 3 THEN '3º Trimestre'
    WHEN 4 THEN '4º Trimestre'
  END;
  
  -- Notify all parents linked to this child
  FOR parent_record IN 
    SELECT parent_id FROM public.parent_children WHERE child_id = NEW.child_id
  LOOP
    INSERT INTO public.notifications (
      user_id,
      title,
      message,
      type,
      link
    ) VALUES (
      parent_record.parent_id,
      'Nova Avaliação Trimestral',
      'A avaliação do ' || quarter_name || ' de ' || NEW.year || ' de ' || child_record.full_name || ' está disponível.',
      'evaluation',
      '/painel-pais'
    );
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for quarterly evaluations
DROP TRIGGER IF EXISTS on_quarterly_evaluation_created ON public.quarterly_evaluations;
CREATE TRIGGER on_quarterly_evaluation_created
  AFTER INSERT ON public.quarterly_evaluations
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_parent_quarterly_evaluation();