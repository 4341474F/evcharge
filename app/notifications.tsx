import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useAuthStore } from "../stores/authStore";
import { supabase } from "../lib/supabase/client";

// ─── Types ────────────────────────────────────────────────────────────────────

interface NotificationPrefs {
  charge_complete: boolean;
  station_available: boolean;
  price_change: boolean;
  new_station: boolean;
}

const DEFAULT_PREFS: NotificationPrefs = {
  charge_complete: true,
  station_available: true,
  price_change: false,
  new_station: false,
};

interface PrefItem {
  key: keyof NotificationPrefs;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  iconColor: string;
  title: string;
  description: string;
}

const PREF_ITEMS: PrefItem[] = [
  {
    key: "charge_complete",
    icon: "flash",
    iconColor: "#00D26A",
    title: "Şarj Tamamlandı",
    description: "Şarj oturumunuz bittiğinde bildirim al",
  },
  {
    key: "station_available",
    icon: "radio-button-on",
    iconColor: "#3B82F6",
    title: "İstasyon Müsait",
    description: "Favori istasyonlarda konektör boşaldığında bildirim al",
  },
  {
    key: "price_change",
    icon: "pricetag",
    iconColor: "#F59E0B",
    title: "Fiyat Değişikliği",
    description: "Sık kullandığın istasyonlarda fiyat güncellendiğinde bildirim al",
  },
  {
    key: "new_station",
    icon: "location",
    iconColor: "#8B5CF6",
    title: "Yeni İstasyon",
    description: "Yakınında yeni bir şarj istasyonu açıldığında bildirim al",
  },
];

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function NotificationsScreen() {
  const { user } = useAuthStore();
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_PREFS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // ── Veriyi çek ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    loadPrefs();
  }, [user]);

  async function loadPrefs() {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("notification_preferences")
        .select(
          "charge_complete, station_available, price_change, new_station",
        )
        .eq("user_id", user!.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setPrefs({
          charge_complete: data.charge_complete,
          station_available: data.station_available,
          price_change: data.price_change,
          new_station: data.new_station,
        });
      } else {
        // Satır henüz yok — varsayılanları kullan, kaydetme bekleniyor
        setPrefs(DEFAULT_PREFS);
      }
    } catch (err) {
      console.error("Bildirim tercihleri yüklenemedi:", err);
    } finally {
      setIsLoading(false);
    }
  }

  // ── Toggle handler ───────────────────────────────────────────────────────────
  function handleToggle(key: keyof NotificationPrefs, value: boolean) {
    setPrefs((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  }

  // ── Kaydet ──────────────────────────────────────────────────────────────────
  async function handleSave() {
    if (!user) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("notification_preferences")
        .upsert(
          {
            user_id: user.id,
            ...prefs,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" },
        );

      if (error) throw error;
      setHasChanges(false);
      Alert.alert("Kaydedildi", "Bildirim tercihleriniz güncellendi.");
    } catch (err: any) {
      Alert.alert("Hata", err?.message ?? "Tercihler kaydedilemedi.");
    } finally {
      setIsSaving(false);
    }
  }

  // ── Giriş yapılmamış ────────────────────────────────────────────────────────
  if (!user) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <Header showSave={false} />
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconWrap}>
            <Ionicons
              name="notifications-off-outline"
              size={40}
              color="#4B5563"
            />
          </View>
          <Text style={styles.emptyTitle}>Giriş Gerekli</Text>
          <Text style={styles.emptySubtitle}>
            Bildirim tercihlerini yönetmek için hesabınıza giriş yapın.
          </Text>
          <TouchableOpacity
            style={styles.loginBtn}
            onPress={() => router.push("/(auth)/login")}
          >
            <Ionicons name="log-in-outline" size={18} color="#0F1117" />
            <Text style={styles.loginBtnText}>Giriş Yap</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Yükleniyor ──────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <Header showSave={false} />
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color="#00D26A" />
          <Text style={styles.loadingText}>Tercihler yükleniyor…</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Ana görünüm ─────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <Header
        showSave={hasChanges}
        isSaving={isSaving}
        onSave={handleSave}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Bilgi kartı */}
        <View style={styles.infoCard}>
          <View style={styles.infoIconWrap}>
            <Ionicons name="information-circle" size={20} color="#3B82F6" />
          </View>
          <Text style={styles.infoText}>
            Almak istediğiniz bildirimleri aşağıdan özelleştirin. Değişiklikler
            anında kaydedilmez — kaydetmek için sağ üstteki{" "}
            <Text style={styles.infoTextBold}>Kaydet</Text> butonuna basın.
          </Text>
        </View>

        {/* Tercih kartları */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>BİLDİRİM TERCİHLERİ</Text>
          <View style={styles.prefGroup}>
            {PREF_ITEMS.map((item, index) => (
              <React.Fragment key={item.key}>
                <PrefRow
                  item={item}
                  value={prefs[item.key]}
                  onToggle={(val) => handleToggle(item.key, val)}
                />
                {index < PREF_ITEMS.length - 1 && (
                  <View style={styles.divider} />
                )}
              </React.Fragment>
            ))}
          </View>
        </View>

        {/* Tümünü aç / kapat */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>HIZLI AYARLAR</Text>
          <View style={styles.quickRow}>
            <TouchableOpacity
              style={styles.quickBtn}
              onPress={() => {
                const allOn: NotificationPrefs = {
                  charge_complete: true,
                  station_available: true,
                  price_change: true,
                  new_station: true,
                };
                setPrefs(allOn);
                setHasChanges(true);
              }}
            >
              <Ionicons
                name="notifications"
                size={18}
                color="#00D26A"
              />
              <Text style={[styles.quickBtnText, { color: "#00D26A" }]}>
                Tümünü Aç
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.quickBtn, styles.quickBtnMuted]}
              onPress={() => {
                const allOff: NotificationPrefs = {
                  charge_complete: false,
                  station_available: false,
                  price_change: false,
                  new_station: false,
                };
                setPrefs(allOff);
                setHasChanges(true);
              }}
            >
              <Ionicons
                name="notifications-off"
                size={18}
                color="#6B7280"
              />
              <Text style={styles.quickBtnText}>Tümünü Kapat</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Alt kaydet butonu */}
        {hasChanges && (
          <View style={styles.saveFooter}>
            <TouchableOpacity
              style={[styles.saveBtn, isSaving && styles.saveBtnDisabled]}
              onPress={handleSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#0F1117" />
              ) : (
                <>
                  <Ionicons name="checkmark" size={18} color="#0F1117" />
                  <Text style={styles.saveBtnText}>Tercihleri Kaydet</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Header ───────────────────────────────────────────────────────────────────

function Header({
  showSave,
  isSaving,
  onSave,
}: {
  showSave: boolean;
  isSaving?: boolean;
  onSave?: () => void;
}) {
  return (
    <View style={styles.header}>
      <TouchableOpacity
        style={styles.backBtn}
        onPress={() => router.back()}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
      </TouchableOpacity>

      <Text style={styles.headerTitle}>Bildirimler</Text>

      {showSave ? (
        <TouchableOpacity
          style={styles.saveHeaderBtn}
          onPress={onSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#00D26A" />
          ) : (
            <Text style={styles.saveHeaderBtnText}>Kaydet</Text>
          )}
        </TouchableOpacity>
      ) : (
        <View style={styles.headerSpacer} />
      )}
    </View>
  );
}

// ─── PrefRow ──────────────────────────────────────────────────────────────────

function PrefRow({
  item,
  value,
  onToggle,
}: {
  item: PrefItem;
  value: boolean;
  onToggle: (val: boolean) => void;
}) {
  return (
    <View style={styles.prefRow}>
      {/* Sol: ikon */}
      <View
        style={[
          styles.prefIcon,
          { backgroundColor: item.iconColor + "20", borderColor: item.iconColor + "40" },
        ]}
      >
        <Ionicons name={item.icon} size={18} color={item.iconColor} />
      </View>

      {/* Orta: metin */}
      <View style={styles.prefInfo}>
        <Text style={styles.prefTitle}>{item.title}</Text>
        <Text style={styles.prefDescription}>{item.description}</Text>
      </View>

      {/* Sağ: toggle */}
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: "#374151", true: "#00D26A40" }}
        thumbColor={value ? "#00D26A" : "#6B7280"}
        ios_backgroundColor="#374151"
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F1117",
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#1F2937",
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#1A2332",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#2D3748",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  headerSpacer: {
    width: 36,
  },
  saveHeaderBtn: {
    minWidth: 36,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#064E3B",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#00D26A40",
  },
  saveHeaderBtnText: {
    color: "#00D26A",
    fontSize: 13,
    fontWeight: "700",
  },

  // Scroll
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },

  // Info card
  infoCard: {
    flexDirection: "row",
    gap: 10,
    backgroundColor: "#1E3A5F",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#3B82F640",
    marginBottom: 24,
    alignItems: "flex-start",
  },
  infoIconWrap: {
    marginTop: 1,
    flexShrink: 0,
  },
  infoText: {
    flex: 1,
    color: "#93C5FD",
    fontSize: 13,
    lineHeight: 20,
  },
  infoTextBold: {
    fontWeight: "700",
    color: "#BFDBFE",
  },

  // Section
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: "#4B5563",
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 1,
    marginBottom: 10,
  },

  // Pref group
  prefGroup: {
    backgroundColor: "#1A2332",
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#2D3748",
  },
  prefRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
  },
  prefIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    flexShrink: 0,
  },
  prefInfo: {
    flex: 1,
    gap: 3,
  },
  prefTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  prefDescription: {
    fontSize: 12,
    color: "#6B7280",
    lineHeight: 17,
  },
  divider: {
    height: 1,
    backgroundColor: "#1F2937",
    marginLeft: 68,
  },

  // Quick actions
  quickRow: {
    flexDirection: "row",
    gap: 10,
  },
  quickBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#064E3B",
    borderRadius: 12,
    paddingVertical: 13,
    borderWidth: 1,
    borderColor: "#00D26A30",
  },
  quickBtnMuted: {
    backgroundColor: "#1A2332",
    borderColor: "#2D3748",
  },
  quickBtnText: {
    color: "#6B7280",
    fontSize: 14,
    fontWeight: "600",
  },

  // Save footer
  saveFooter: {
    marginBottom: 8,
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#00D26A",
    borderRadius: 14,
    paddingVertical: 15,
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    color: "#0F1117",
    fontSize: 16,
    fontWeight: "700",
  },

  // Empty / loading
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
    gap: 14,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#1A2332",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#2D3748",
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#D1D5DB",
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 20,
  },
  loginBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#00D26A",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginTop: 8,
  },
  loginBtnText: {
    color: "#0F1117",
    fontSize: 15,
    fontWeight: "700",
  },
  loadingText: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 12,
  },
});
