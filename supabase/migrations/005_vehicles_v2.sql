-- ============================================================
-- Migration 005: Vehicles V2 + Favorites Ext + Notifications
-- Türkiye EV şarj uygulaması - Araç yönetimi genişletmesi
-- ============================================================

-- -----------------------------------------------------------
-- 1. Araç tablosuna yeni sütunlar ekle
-- -----------------------------------------------------------
ALTER TABLE public.vehicles
  ADD COLUMN IF NOT EXISTS range_km       INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_charge_kw  INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_togg        BOOLEAN NOT NULL DEFAULT FALSE;

-- Mevcut Togg araçlarını otomatik işaretle
UPDATE public.vehicles
SET is_togg = TRUE
WHERE brand = 'Togg';

-- -----------------------------------------------------------
-- 2. Favori istasyon tablosuna konum / ağ bilgisi ekle
-- -----------------------------------------------------------
ALTER TABLE public.favorites
  ADD COLUMN IF NOT EXISTS network    TEXT,
  ADD COLUMN IF NOT EXISTS city       TEXT,
  ADD COLUMN IF NOT EXISTS latitude   NUMERIC(10, 6),
  ADD COLUMN IF NOT EXISTS longitude  NUMERIC(10, 6);

-- -----------------------------------------------------------
-- 3. Bildirim tercihleri tablosu
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID        NOT NULL
                                  REFERENCES public.profiles(id)
                                  ON DELETE CASCADE,
  charge_complete   BOOLEAN     NOT NULL DEFAULT TRUE,
  station_available BOOLEAN     NOT NULL DEFAULT TRUE,
  price_change      BOOLEAN     NOT NULL DEFAULT FALSE,
  new_station       BOOLEAN     NOT NULL DEFAULT FALSE,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT notification_preferences_user_id_key UNIQUE (user_id)
);

-- RLS
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notif_select_own"
  ON public.notification_preferences
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "notif_insert_own"
  ON public.notification_preferences
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "notif_update_own"
  ON public.notification_preferences
  FOR UPDATE
  USING (auth.uid() = user_id);

-- -----------------------------------------------------------
-- 4. Vehicles tablosu için RLS (henüz yoksa)
-- -----------------------------------------------------------
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- SELECT
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'vehicles' AND policyname = 'vehicles_select_own'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "vehicles_select_own"
        ON public.vehicles
        FOR SELECT
        USING (auth.uid() = user_id)
    $policy$;
  END IF;

  -- INSERT
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'vehicles' AND policyname = 'vehicles_insert_own'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "vehicles_insert_own"
        ON public.vehicles
        FOR INSERT
        WITH CHECK (auth.uid() = user_id)
    $policy$;
  END IF;

  -- UPDATE
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'vehicles' AND policyname = 'vehicles_update_own'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "vehicles_update_own"
        ON public.vehicles
        FOR UPDATE
        USING (auth.uid() = user_id)
    $policy$;
  END IF;

  -- DELETE
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'vehicles' AND policyname = 'vehicles_delete_own'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "vehicles_delete_own"
        ON public.vehicles
        FOR DELETE
        USING (auth.uid() = user_id)
    $policy$;
  END IF;
END
$$;

-- -----------------------------------------------------------
-- 5. Performans için indeksler
-- -----------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_vehicles_user_id
  ON public.vehicles(user_id);

CREATE INDEX IF NOT EXISTS idx_vehicles_brand
  ON public.vehicles(brand);

CREATE INDEX IF NOT EXISTS idx_vehicles_is_togg
  ON public.vehicles(is_togg)
  WHERE is_togg = TRUE;

CREATE INDEX IF NOT EXISTS idx_notif_prefs_user_id
  ON public.notification_preferences(user_id);
