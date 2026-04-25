import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  Modal,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../../stores/authStore";
import { supabase } from "../../lib/supabase/client";

// ─── Types ────────────────────────────────────────────────────────────────────

interface MenuItemProps {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  onPress: () => void;
  danger?: boolean;
  badge?: string;
}

// ─── MenuItem Component ───────────────────────────────────────────────────────

function MenuItem({ icon, label, onPress, danger, badge }: MenuItemProps) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <View style={[styles.menuIcon, danger && styles.menuIconDanger]}>
        <Ionicons
          name={icon}
          size={20}
          color={danger ? "#EF4444" : "#9CA3AF"}
        />
      </View>
      <Text style={[styles.menuLabel, danger && styles.menuLabelDanger]}>
        {label}
      </Text>
      {badge ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      ) : (
        <Ionicons name="chevron-forward" size={18} color="#4B5563" />
      )}
    </TouchableOpacity>
  );
}

// ─── Network data ─────────────────────────────────────────────────────────────

const NETWORKS = [
  { name: "ZES", color: "#00D26A", count: "5.190+" },
  { name: "Eşarj", color: "#3B82F6", count: "2.230+" },
  { name: "Trugo", color: "#F59E0B", count: "3.088+" },
  { name: "Voltrun", color: "#8B5CF6", count: "2.184+" },
  { name: "WAT", color: "#EC4899", count: "713+" },
  { name: "5şarj", color: "#06B6D4", count: "181+" },
  { name: "EnYakıt", color: "#F97316", count: "296+" },
  { name: "Beefull", color: "#84CC16", count: "50+" },
];

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const { user, signOut } = useAuthStore();
  const queryClient = useQueryClient();

  // Profil düzenleme state'leri
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Şifre değiştirme state'leri
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [isChangingPw, setIsChangingPw] = useState(false);

  // Profil bilgilerini çek (ad soyad)
  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, phone")
        .eq("id", user.id)
        .maybeSingle();
      if (error) return null;
      return data;
    },
    enabled: !!user,
  });

  // Araç sayısını çek
  const { data: vehicleCount = 0 } = useQuery<number>({
    queryKey: ["vehicles-count", user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const { count, error } = await supabase
        .from("vehicles")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id);
      if (error) return 0;
      return count ?? 0;
    },
    enabled: !!user,
  });

  async function handleDeleteAccount() {
    Alert.alert(
      "Hesabı Sil",
      "Bu işlem geri alınamaz. Tüm verileriniz (şarj geçmişi, araçlar, favoriler) kalıcı olarak silinecek.",
      [
        { text: "İptal", style: "cancel" },
        {
          text: "Devam Et",
          style: "destructive",
          onPress: () => {
            Alert.alert(
              "Emin misiniz?",
              "Hesabınız ve tüm verileriniz kalıcı olarak silinecek.",
              [
                { text: "Vazgeç", style: "cancel" },
                {
                  text: "Hesabı Sil",
                  style: "destructive",
                  onPress: async () => {
                    Alert.alert(
                      "Hesap Silme Talebi",
                      "Hesabınızı silmek için destek@sarjbul.com adresine e-posta gönderin. Güvenliğiniz için bu işlem manuel onay gerektirir.",
                      [{ text: "Tamam" }],
                    );
                    await supabase.auth.signOut();
                    signOut();
                    router.replace("/(auth)/login");
                  },
                },
              ],
            );
          },
        },
      ],
    );
  }

  async function handleSignOut() {
    Alert.alert(
      "Çıkış Yap",
      "Hesabınızdan çıkmak istediğinizden emin misiniz?",
      [
        { text: "İptal", style: "cancel" },
        {
          text: "Çıkış Yap",
          style: "destructive",
          onPress: async () => {
            await supabase.auth.signOut();
            signOut();
            router.replace("/(auth)/login");
          },
        },
      ],
    );
  }

  function openEditModal() {
    setEditName(profile?.full_name ?? "");
    setEditPhone(profile?.phone ?? "");
    setEditModalVisible(true);
  }

  async function handleSave() {
    if (!user) return;
    setIsSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: editName.trim(), phone: editPhone.trim() || null })
      .eq("id", user.id);
    setIsSaving(false);
    if (error) {
      Alert.alert("Hata", error.message);
    } else {
      queryClient.invalidateQueries({ queryKey: ["profile", user.id] });
      setEditModalVisible(false);
    }
  }

  async function handleChangePassword() {
    // Validasyon
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert("Hata", "Lütfen tüm alanları doldurun.");
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert("Hata", "Yeni şifre en az 6 karakter olmalıdır.");
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert("Hata", "Yeni şifreler eşleşmiyor.");
      return;
    }

    setIsChangingPw(true);

    // Mevcut şifreyle re-auth
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user!.email!,
      password: currentPassword,
    });

    if (signInError) {
      setIsChangingPw(false);
      Alert.alert("Hata", "Mevcut şifre hatalı.");
      return;
    }

    // Yeni şifreyi güncelle
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    setIsChangingPw(false);

    if (updateError) {
      Alert.alert("Hata", updateError.message);
      return;
    }

    // Başarı — modalı kapat ve state'leri temizle
    setPasswordModalVisible(false);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    Alert.alert("Başarılı", "Şifreniz güncellendi.");
  }

  const displayName = profile?.full_name?.trim() || null;
  const userInitial =
    displayName?.[0]?.toUpperCase() ?? user?.email?.[0]?.toUpperCase() ?? "?";

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <View style={styles.header}>
          <Text style={styles.title}>Profil</Text>
        </View>

        {/* ── User card ──────────────────────────────────────────────────── */}
        {user ? (
          <View style={styles.userCard}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{userInitial}</Text>
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              {displayName ? (
                <Text style={styles.userName}>{displayName}</Text>
              ) : null}
              <Text style={styles.userEmail}>{user.email}</Text>
              {/* Araç sayısı satırı */}
              <View style={styles.vehicleCountRow}>
                <Ionicons name="car-outline" size={13} color="#00D26A" />
                <Text style={styles.vehicleCountText}>
                  {vehicleCount === 0
                    ? "Araç eklenmedi"
                    : `${vehicleCount} araç kayıtlı`}
                </Text>
              </View>
            </View>
            {/* Düzenle butonu */}
            <TouchableOpacity style={styles.editButton} onPress={openEditModal}>
              <Ionicons name="pencil-outline" size={16} color="#9CA3AF" />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.loginPrompt}
            onPress={() => router.push("/(auth)/login")}
          >
            <Ionicons name="person-add-outline" size={24} color="#00D26A" />
            <Text style={styles.loginPromptText}>Giriş Yap / Kayıt Ol</Text>
            <Ionicons name="chevron-forward" size={18} color="#6B7280" />
          </TouchableOpacity>
        )}

        {/* ── Hesap ──────────────────────────────────────────────────────── */}
        {user && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>HESAP</Text>
            <View style={styles.menuGroup}>
              <MenuItem
                icon="key-outline"
                label="Şifre Değiştir"
                onPress={() => {
                  setCurrentPassword("");
                  setNewPassword("");
                  setConfirmPassword("");
                  setPasswordModalVisible(true);
                }}
              />
            </View>
          </View>
        )}

        {/* ── Araçlarım ──────────────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ARAÇLARIM</Text>
          <View style={styles.menuGroup}>
            <MenuItem
              icon="car-outline"
              label="Araçlarımı Yönet"
              onPress={() => router.push("/vehicles")}
            />
            <MenuItem
              icon="heart-outline"
              label="Favorilerim"
              onPress={() => router.push("/favorites")}
            />
          </View>
        </View>

        {/* ── Desteklenen Ağlar ───────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>DESTEKLENEN AĞLAR</Text>
          <View style={styles.networksGrid}>
            {NETWORKS.map((n) => (
              <View
                key={n.name}
                style={[styles.networkCard, { borderColor: n.color + "35" }]}
              >
                <Text style={[styles.networkName, { color: n.color }]}>
                  {n.name}
                </Text>
                <Text style={styles.networkCount}>{n.count} istasyon</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Uygulama ───────────────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>UYGULAMA</Text>
          <View style={styles.menuGroup}>
            <MenuItem
              icon="stats-chart-outline"
              label="İstatistiklerim"
              onPress={() => router.push("/(tabs)/stats")}
            />
            <MenuItem
              icon="notifications-outline"
              label="Bildirimler"
              onPress={() => router.push("/notifications")}
            />
            <MenuItem
              icon="information-circle-outline"
              label="Hakkında"
              onPress={() =>
                Alert.alert(
                  "ŞarjBul v1.0",
                  "Türkiye'nin şarj ağı konsolidatörü.\n\nVeri kaynağı: Open Charge Map",
                )
              }
              badge="v1.0"
            />
          </View>
        </View>

        {/* ── Çıkış ──────────────────────────────────────────────────────── */}
        {user && (
          <View style={styles.section}>
            <View style={styles.menuGroup}>
              <MenuItem
                icon="log-out-outline"
                label="Çıkış Yap"
                onPress={handleSignOut}
                danger
              />
            </View>
          </View>
        )}

        {/* ── Hesap Sil ──────────────────────────────────────────────────── */}
        {user && (
          <View style={[styles.section, { marginTop: 8 }]}>
            <View style={styles.menuGroup}>
              <MenuItem
                icon="trash-outline"
                label="Hesabımı Sil"
                onPress={handleDeleteAccount}
                danger
              />
            </View>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── Profil Düzenleme Modalı ─────────────────────────────────────── */}
      <Modal
        visible={editModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {/* Başlık satırı */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Profili Düzenle</Text>
              <TouchableOpacity
                onPress={() => setEditModalVisible(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={22} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            {/* Ad Soyad */}
            <Text style={styles.inputLabel}>Ad Soyad</Text>
            <TextInput
              style={styles.textInput}
              value={editName}
              onChangeText={setEditName}
              placeholder="Adınızı girin"
              placeholderTextColor="#4B5563"
              autoCapitalize="words"
            />

            {/* Telefon */}
            <Text style={styles.inputLabel}>Telefon</Text>
            <TextInput
              style={styles.textInput}
              value={editPhone}
              onChangeText={setEditPhone}
              placeholder="Telefon numaranızı girin"
              placeholderTextColor="#4B5563"
              keyboardType="phone-pad"
            />

            {/* Kaydet butonu */}
            <TouchableOpacity
              style={[styles.saveButton, isSaving && { opacity: 0.6 }]}
              onPress={handleSave}
              disabled={isSaving}
            >
              <Text style={styles.saveButtonText}>
                {isSaving ? "Kaydediliyor…" : "Kaydet"}
              </Text>
            </TouchableOpacity>

            {/* İptal butonu */}
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setEditModalVisible(false)}
              disabled={isSaving}
            >
              <Text style={styles.cancelButtonText}>İptal</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Şifre Değiştirme Modalı ─────────────────────────────────────── */}
      <Modal
        visible={passwordModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPasswordModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {/* Başlık satırı */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Şifre Değiştir</Text>
              <TouchableOpacity
                onPress={() => setPasswordModalVisible(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={22} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            {/* Mevcut Şifre */}
            <Text style={styles.inputLabel}>Mevcut Şifre</Text>
            <View style={styles.passwordInputWrapper}>
              <TextInput
                style={styles.passwordInput}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                placeholder="Mevcut şifrenizi girin"
                placeholderTextColor="#4B5563"
                secureTextEntry={!showCurrentPw}
                autoCapitalize="none"
              />
              <TouchableOpacity
                onPress={() => setShowCurrentPw((v) => !v)}
                style={styles.eyeButton}
              >
                <Ionicons
                  name={showCurrentPw ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color="#6B7280"
                />
              </TouchableOpacity>
            </View>

            {/* Yeni Şifre */}
            <Text style={styles.inputLabel}>Yeni Şifre</Text>
            <View style={styles.passwordInputWrapper}>
              <TextInput
                style={styles.passwordInput}
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Yeni şifrenizi girin"
                placeholderTextColor="#4B5563"
                secureTextEntry={!showNewPw}
                autoCapitalize="none"
              />
              <TouchableOpacity
                onPress={() => setShowNewPw((v) => !v)}
                style={styles.eyeButton}
              >
                <Ionicons
                  name={showNewPw ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color="#6B7280"
                />
              </TouchableOpacity>
            </View>

            {/* Yeni Şifre (Tekrar) */}
            <Text style={styles.inputLabel}>Yeni Şifre (Tekrar)</Text>
            <View style={styles.passwordInputWrapper}>
              <TextInput
                style={styles.passwordInput}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Yeni şifrenizi tekrar girin"
                placeholderTextColor="#4B5563"
                secureTextEntry={!showConfirmPw}
                autoCapitalize="none"
              />
              <TouchableOpacity
                onPress={() => setShowConfirmPw((v) => !v)}
                style={styles.eyeButton}
              >
                <Ionicons
                  name={showConfirmPw ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color="#6B7280"
                />
              </TouchableOpacity>
            </View>

            {/* Güncelle butonu */}
            <TouchableOpacity
              style={[styles.saveButton, isChangingPw && { opacity: 0.6 }]}
              onPress={handleChangePassword}
              disabled={isChangingPw}
            >
              <Text style={styles.saveButtonText}>
                {isChangingPw ? "Güncelleniyor…" : "Güncelle"}
              </Text>
            </TouchableOpacity>

            {/* İptal butonu */}
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setPasswordModalVisible(false)}
              disabled={isChangingPw}
            >
              <Text style={styles.cancelButtonText}>İptal</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0F1117" },

  // Header
  header: { paddingHorizontal: 20, paddingVertical: 16 },
  title: { fontSize: 26, fontWeight: "700", color: "#FFFFFF" },

  // User card
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "#1A2332",
    marginHorizontal: 16,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#2D3748",
    marginBottom: 8,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#00D26A20",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#00D26A40",
  },
  avatarText: { color: "#00D26A", fontSize: 22, fontWeight: "700" },
  userName: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  userEmail: { color: "#9CA3AF", fontSize: 13, fontWeight: "400" },
  vehicleCountRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 2,
  },
  vehicleCountText: { color: "#00D26A", fontSize: 12, fontWeight: "500" },

  // Login prompt
  loginPrompt: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#1A2332",
    marginHorizontal: 16,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#2D3748",
    marginBottom: 8,
  },
  loginPromptText: {
    flex: 1,
    color: "#D1D5DB",
    fontSize: 15,
    fontWeight: "500",
  },

  // Section
  section: { marginTop: 24, paddingHorizontal: 16 },
  sectionTitle: {
    color: "#4B5563",
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 1,
    marginBottom: 10,
  },

  // Menu group
  menuGroup: {
    backgroundColor: "#1A2332",
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#2D3748",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#1F2937",
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "#0F1117",
    justifyContent: "center",
    alignItems: "center",
  },
  menuIconDanger: { backgroundColor: "#7F1D1D20" },
  menuLabel: { flex: 1, color: "#D1D5DB", fontSize: 15 },
  menuLabelDanger: { color: "#EF4444" },
  badge: {
    backgroundColor: "#374151",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: { color: "#9CA3AF", fontSize: 11 },

  // Networks grid — 2 sütun, 4 satır
  networksGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  networkCard: {
    width: "47.5%",
    backgroundColor: "#1A2332",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
  },
  networkName: { fontSize: 15, fontWeight: "700", marginBottom: 4 },
  networkCount: { color: "#6B7280", fontSize: 12 },

  // Edit button (pencil)
  editButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#1A2332",
    borderWidth: 1,
    borderColor: "#2D3748",
    justifyContent: "center",
    alignItems: "center",
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  modalContainer: {
    width: "100%",
    backgroundColor: "#1A2332",
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: "#2D3748",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  modalTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
  },
  inputLabel: {
    color: "#9CA3AF",
    fontSize: 13,
    fontWeight: "500",
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: "#0F1117",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#2D3748",
    color: "#FFFFFF",
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
  },

  // Password input with eye toggle
  passwordInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0F1117",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#2D3748",
    marginBottom: 16,
  },
  passwordInput: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  eyeButton: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },

  saveButton: {
    backgroundColor: "#00D26A",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 4,
    marginBottom: 12,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  cancelButton: {
    alignItems: "center",
    paddingVertical: 6,
  },
  cancelButtonText: {
    color: "#6B7280",
    fontSize: 14,
    fontWeight: "500",
  },
});
