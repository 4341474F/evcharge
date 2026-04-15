-- Şarj oturumları
CREATE TABLE IF NOT EXISTS public.charging_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  station_id TEXT NOT NULL,
  station_name TEXT NOT NULL,
  network TEXT NOT NULL,
  connector_type TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  energy_kwh NUMERIC(8, 3) NOT NULL DEFAULT 0,
  cost_tl NUMERIC(8, 2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled'))
);

CREATE INDEX idx_sessions_user_id ON public.charging_sessions(user_id);
CREATE INDEX idx_sessions_status ON public.charging_sessions(status);
CREATE INDEX idx_sessions_started_at ON public.charging_sessions(started_at DESC);

ALTER TABLE public.charging_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sessions_select_own" ON public.charging_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "sessions_insert_own" ON public.charging_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "sessions_update_own" ON public.charging_sessions
  FOR UPDATE USING (auth.uid() = user_id);
