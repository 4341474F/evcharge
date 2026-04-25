import { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Linking } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../lib/supabase/client";

type TokenState = "loading" | "ready" | "error";

export default function ResetPasswordScreen() {
  const [tokenState, setTokenState] = useState<TokenState>("loading");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // URL'den token parse ederek session kur
  async function handleUrl(url: string | null) {
    if (!url) {
      setTokenState("error");
      return;
    }

    try {
      // Fragment kısmını al: #access_token=...&type=recovery&...
      const fragment = url.includes("#") ? url.split("#")[1] : "";
      if (!fragment) {
        setTokenState("error");
        return;
      }

      const params = new URLSearchParams(fragment);
      const access_token = params.get("access_token");
      const type = params.get("type");

      if (!access_token || type !== "recovery") {
        setTokenState("error");
        return;
      }

      // Supabase session'ı kur
      const { error } = await supabase.auth.setSession({
        access_token,
        refresh_token: access_token,
      });

      if (error) {
        console.warn("setSession error:", error.message);
        setTokenState("error");
        return;
      }

      setTokenState("ready");
    } catch (e) {
      console.warn("handleUrl exception:", e);
      setTokenState("error");
    }
  }

  useEffect(() => {
    // Uygulama kapalıyken açıldıysa
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleUrl(url);
      } else {
        // Uygulama zaten açıksa event listener yakalar
        // Kısa timeout ile kontrol et
        const timer = setTimeout(() => {
          setTokenState((prev) => (prev === "loading" ? "error" : prev));
        }, 3000);

        return () => clearTimeout(timer);
      }
    });

    // Uygulama arka plandayken deep link gelirse
    const subscription = Linking.addEventListener("url", ({ url }) => {
      handleUrl(url);
    });

    return () => subscription.remove();
  }, []);

  async function handleUpdatePassword() {
    if (!newPassword || !confirmPassword) {
      Alert.alert("Hata", "Lütfen tüm alanları doldurun.");
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert("Hata", "Şifre en az 6 karakter olmalıdır.");
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert("Hata", "Şifreler eşleşmiyor. Lütfen tekrar deneyin.");
      return;
    }

    setIsLoading(true);
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    setIsLoading(false);

    if (error) {
      Alert.alert("Hata", error.message);
      return;
    }

    Alert.alert(
      "Başarılı!",
      "Şifreniz başarıyla güncellendi. Yeni şifrenizle giriş yapabilirsiniz.",
      [
        {
          text: "Giriş Yap",
          onPress: () => router.replace("/(auth)/login"),
        },
      ]
    );
  }

  // ── Yükleniyor ─────────────────────────────────────────────────────────
  if (tokenState === "loading") {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <View style={styles.loadingIconWrap}>
            <ActivityIndicator size="large" color="#00D26A" />
          </View>
          <Text style={styles.loadingTitle}>Doğrulanıyor</Text>
          <Text style={styles.loadingSubtitle}>
            Şifre sıfırlama bağlantısı kontrol ediliyor…
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Token Hatası ────────────────────────────────────────────────────────
  if (tokenState === "error") {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <View style={styles.errorIconWrap}>
            <Ionicons name="warning-outline" size={40} color="#F87171" />
          </View>
          <Text style={styles.errorTitle}>Geçersiz Bağlantı</Text>
          <Text style={styles.errorSubtitle}>
            Şifre sıfırlama bağlantısı geçersiz veya süresi dolmuş.{"\n"}
            Lütfen yeni bir sıfırlama bağlantısı talep edin.
          </Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.replace("/(auth)/login")}
          >
            <Ionicons name="arrow-back-outline" size={18} color="#0F1117" />
            <Text style={styles.backButtonText}>Giriş Yap</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Yeni Şifre Formu ────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Başlık Alanı */}
          <View style={styles.headerSection}>
            <View style={styles.iconWrap}>
              <Ionicons name="lock-closed" size={36} color="#00D26A" />
            </View>
            <Text style={styles.title}>Yeni Şifre Belirle</Text>
            <Text style={styles.subtitle}>Güçlü bir şifre seçin.</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {/* Yeni Şifre */}
            <View>
              <Text style={styles.label}>Yeni Şifre</Text>
              <View style={styles.inputWrapper}>
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color="#6B7280"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="En az 6 karakter"
                  placeholderTextColor="#6B7280"
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry={!showPw}
                  autoCapitalize="none"
                  autoComplete="new-password"
                />
                <TouchableOpacity
                  onPress={() => setShowPw(!showPw)}
                  style={styles.eyeIcon}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons
                    name={showPw ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color="#6B7280"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Şifre Tekrar */}
            <View>
              <Text style={styles.label}>Yeni Şifre Tekrar</Text>
              <View
                style={[
                  styles.inputWrapper,
                  confirmPassword.length > 0 &&
                    newPassword !== confirmPassword &&
                    styles.inputWrapperError,
                ]}
              >
                <Ionicons
                  name="shield-checkmark-outline"
                  size={20}
                  color="#6B7280"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Şifreyi tekrar girin"
                  placeholderTextColor="#6B7280"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirm}
                  autoCapitalize="none"
                  autoComplete="new-password"
                />
                <TouchableOpacity
                  onPress={() => setShowConfirm(!showConfirm)}
                  style={styles.eyeIcon}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons
                    name={showConfirm ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color="#6B7280"
                  />
                </TouchableOpacity>
              </View>
              {confirmPassword.length > 0 && newPassword !== confirmPassword && (
                <Text style={styles.errorHint}>Şifreler eşleşmiyor</Text>
              )}
            </View>

            {/* Şifre Güç Göstergesi */}
            {newPassword.length > 0 && (
              <PasswordStrengthBar password={newPassword} />
            )}

            {/* Güncelle Butonu */}
            <TouchableOpacity
              style={[
                styles.updateButton,
                isLoading && styles.updateButtonDisabled,
              ]}
              onPress={handleUpdatePassword}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator color="#0F1117" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="#0F1117" />
                  <Text style={styles.updateButtonText}>Şifreyi Güncelle</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Alt link */}
            <TouchableOpacity
              style={styles.cancelRow}
              onPress={() => router.replace("/(auth)/login")}
            >
              <Text style={styles.cancelText}>İptal, giriş sayfasına dön</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ── Şifre Güç Göstergesi Bileşeni ──────────────────────────────────────────
function PasswordStrengthBar({ password }: { password: string }) {
  const getStrength = (pw: string): { level: number; label: string; color: string } => {
    let score = 0;
    if (pw.length >= 8) score++;
    if (pw.length >= 12) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;

    if (score <= 1) return { level: 1, label: "Zayıf", color: "#F87171" };
    if (score <= 2) return { level: 2, label: "Orta", color: "#FBBF24" };
    if (score <= 3) return { level: 3, label: "İyi", color: "#60A5FA" };
    return { level: 4, label: "Güçlü", color: "#00D26A" };
  };

  const { level, label, color } = getStrength(password);

  return (
    <View style={strengthStyles.container}>
      <View style={strengthStyles.bars}>
        {[1, 2, 3, 4].map((i) => (
          <View
            key={i}
            style={[
              strengthStyles.bar,
              { backgroundColor: i <= level ? color : "#2D3748" },
            ]}
          />
        ))}
      </View>
      <Text style={[strengthStyles.label, { color }]}>{label}</Text>
    </View>
  );
}

// ── Stiller ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F1117",
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 40,
    justifyContent: "center",
  },

  // Yükleniyor / Hata ortak
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
    gap: 16,
  },
  loadingIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#1A2332",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#00D26A30",
    marginBottom: 8,
  },
  loadingTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  loadingSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 20,
  },
  errorIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#1F1010",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#F8717130",
    marginBottom: 8,
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  errorSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 22,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#00D26A",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
    marginTop: 8,
  },
  backButtonText: {
    color: "#0F1117",
    fontSize: 15,
    fontWeight: "700",
  },

  // Form
  headerSection: {
    alignItems: "center",
    marginBottom: 40,
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: "#1A2332",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#00D26A30",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#6B7280",
  },
  form: {
    gap: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#9CA3AF",
    marginBottom: 8,
    marginLeft: 2,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1A2332",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#2D3748",
    paddingHorizontal: 16,
    height: 52,
  },
  inputWrapperError: {
    borderColor: "#F87171",
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    color: "#FFFFFF",
    fontSize: 16,
  },
  eyeIcon: {
    padding: 4,
  },
  errorHint: {
    fontSize: 12,
    color: "#F87171",
    marginTop: 6,
    marginLeft: 4,
  },
  updateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#00D26A",
    borderRadius: 12,
    height: 52,
    marginTop: 8,
  },
  updateButtonDisabled: {
    opacity: 0.6,
  },
  updateButtonText: {
    color: "#0F1117",
    fontSize: 16,
    fontWeight: "700",
  },
  cancelRow: {
    alignItems: "center",
    paddingVertical: 8,
  },
  cancelText: {
    color: "#6B7280",
    fontSize: 13,
  },
});

const strengthStyles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: -4,
  },
  bars: {
    flex: 1,
    flexDirection: "row",
    gap: 4,
  },
  bar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    width: 42,
    textAlign: "right",
  },
});
