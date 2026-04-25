-- ============================================================
-- Migration 006: notification_preferences updated_at trigger
-- ============================================================

-- -----------------------------------------------------------
-- 1. updated_at otomatik güncelleyen genel fonksiyon
--    (henüz yoksa oluştur)
-- -----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- -----------------------------------------------------------
-- 2. notification_preferences tablosuna trigger ekle
-- -----------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_notif_prefs_updated_at'
      AND tgrelid = 'public.notification_preferences'::regclass
  ) THEN
    EXECUTE $trig$
      CREATE TRIGGER trg_notif_prefs_updated_at
        BEFORE UPDATE ON public.notification_preferences
        FOR EACH ROW
        EXECUTE FUNCTION public.set_updated_at()
    $trig$;
  END IF;
END
$$;

-- -----------------------------------------------------------
-- 3. favorites tablosuna added_at indeksi (sorgu performansı)
-- -----------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_favorites_added_at
  ON public.favorites(added_at DESC);

-- -----------------------------------------------------------
-- 4. charging_sessions tablosuna network indeksi
--    (İstatistik ekranındaki ağ dağılımı sorgusunu hızlandırır)
-- -----------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_charging_sessions_network
  ON public.charging_sessions(network);

CREATE INDEX IF NOT EXISTS idx_charging_sessions_started_at
  ON public.charging_sessions(started_at DESC);

-- -----------------------------------------------------------
-- 5. profiles tablosunda updated_at trigger (henüz yoksa)
-- -----------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_profiles_updated_at'
      AND tgrelid = 'public.profiles'::regclass
  ) THEN
    EXECUTE $trig$
      CREATE TRIGGER trg_profiles_updated_at
        BEFORE UPDATE ON public.profiles
        FOR EACH ROW
        EXECUTE FUNCTION public.set_updated_at()
    $trig$;
  END IF;
END
$$;
