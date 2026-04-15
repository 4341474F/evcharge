-- Araçlar
CREATE TABLE IF NOT EXISTS public.vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  year INTEGER NOT NULL CHECK (year >= 2000 AND year <= 2030),
  battery_capacity_kwh NUMERIC(5, 1) NOT NULL CHECK (battery_capacity_kwh > 0),
  connector_types TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_vehicles_user_id ON public.vehicles(user_id);

ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vehicles_select_own" ON public.vehicles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "vehicles_insert_own" ON public.vehicles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "vehicles_update_own" ON public.vehicles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "vehicles_delete_own" ON public.vehicles
  FOR DELETE USING (auth.uid() = user_id);
