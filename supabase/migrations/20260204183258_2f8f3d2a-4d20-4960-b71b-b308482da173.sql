-- Index for 5-year retention queries (historical audits)
CREATE INDEX IF NOT EXISTS idx_weekly_menus_created_at 
ON public.weekly_menus(created_at);