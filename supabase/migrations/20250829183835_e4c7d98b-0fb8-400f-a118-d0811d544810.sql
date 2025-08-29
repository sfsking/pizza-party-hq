-- Create auto_report_settings table to store report generation time settings
CREATE TABLE public.auto_report_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  report_time TIME NOT NULL DEFAULT '00:00:00', -- Default to midnight
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.auto_report_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for admin access
CREATE POLICY "Admins can manage auto report settings" 
ON public.auto_report_settings 
FOR ALL 
USING (get_current_user_role() = 'admin');

-- Create trigger for updated_at
CREATE TRIGGER update_auto_report_settings_updated_at
BEFORE UPDATE ON public.auto_report_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();