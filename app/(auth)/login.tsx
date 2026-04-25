import { useState } from "react";
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
  Modal,
} from "react-native";
import { Link, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase/client";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Şifre sıfırlama modal state'leri
  const [resetModalVisible, setResetModalVisible] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  async function handleLogin() {
    if (!email || !password) {
      Alert.alert("Hata", "E-posta ve şifre gereklidir.");
      return;
    }

    setIsLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setIsLoading(false);

    if (error) {
      Alert.alert("Giriş Hatası", error.message);
      return;
    }

    router.replace("/(tabs)");
  }

  function openResetModal() {
    setResetEmail(email); // Varsa mevcut e-postayı doldur
    setResetSent(false);
    setResetModalVisible(true);
  }

  function closeResetModal() {
    setResetModalVisible(false);
    setResetSent(false);
    setResetEmail("");
  }

  async function handleSendReset() {
    if (!resetEmail.trim()) {
      Alert.alert("Hata", "Lütfen e-posta adresinizi girin.");
      return;
    }

    setIsSendingReset(true);
    const { error } = await supabase.auth.resetPasswordForEmail(
      resetEmail.trim(),
      {
        redirectTo: "sarjbul://reset-password",
      },
    );
    setIsSendingReset(false);

    if (error) {
      Alert.alert("Hata", error.message);
      return;
    }

    setResetSent(true);
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.content}>
        {/* Logo */}
        <View style={styles.logoSection}>
          <View style={styles.logoIcon}>
            <Ionicons name="flash" size={40} color="#00D26A" />
          </View>
          <Text style={styles.appName}>ŞarjBul</Text>
          <Text style={styles.tagline}>Tüm şarj ağları tek uygulamada</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <View style={styles.inputWrapper}>
            <Ionicons
              name="mail-outline"
              size={20}
              color="#6B7280"
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="E-posta"
              placeholderTextColor="#6B7280"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
          </View>

          <View style={styles.inputWrapper}>
            <Ionicons
              name="lock-closed-outline"
              size={20}
              color="#6B7280"
              style={styles.inputIcon}
            />
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Şifre"
              placeholderTextColor="#6B7280"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoComplete="password"
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eyeIcon}
            >
              <Ionicons
                name={showPassword ? "eye-off-outline" : "eye-outline"}
                size={20}
                color="#6B7280"
              />
            </TouchableOpacity>
          </View>

          {/* Şifremi Unuttum */}
          <TouchableOpacity style={styles.forgotRow} onPress={openResetModal}>
            <Text style={styles.forgotText}>Şifremi Unuttum</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.loginButton,
              isLoading && styles.loginButtonDisabled,
            ]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#0F1117" />
            ) : (
              <Text style={styles.loginButtonText}>Giriş Yap</Text>
            )}
          </TouchableOpacity>

          <View style={styles.registerRow}>
            <Text style={styles.registerText}>Hesabın yok mu? </Text>
            <Link href="/(auth)/register" asChild>
              <TouchableOpacity>
                <Text style={styles.registerLink}>Kayıt Ol</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>

        {/* Network logos */}
        <View style={styles.networksRow}>
          {["ZES", "Eşarj", "Trugo", "Voltrun"].map((n) => (
            <View key={n} style={styles.networkBadge}>
              <Text style={styles.networkBadgeText}>{n}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* ── Şifre Sıfırlama Modalı ───────────────────────────────────────── */}
      <Modal
        visible={resetModalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeResetModal}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={closeResetModal}
          />
          <View style={styles.modalCard}>
            {/* Başlık */}
            <View style={styles.modalHeader}>
              <View style={styles.modalIconWrap}>
                <Ionicons name="lock-open-outline" size={26} color="#00D26A" />
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={closeResetModal}
              >
                <Ionicons name="close" size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalTitle}>Şifre Sıfırlama</Text>

            {resetSent ? (
              /* Başarı durumu */
              <View style={styles.successContainer}>
                <View style={styles.successIconWrap}>
                  <Ionicons name="checkmark-circle" size={48} color="#00D26A" />
                </View>
                <Text style={styles.successTitle}>E-posta Gönderildi!</Text>
                <Text style={styles.successText}>
                  <Text style={styles.successEmailHighlight}>{resetEmail}</Text>{" "}
                  adresine şifre sıfırlama bağlantısı gönderildi.{"\n\n"}
                  Gelen kutunuzu ve spam klasörünüzü kontrol edin.
                </Text>
                <TouchableOpacity
                  style={styles.doneBtn}
                  onPress={closeResetModal}
                >
                  <Text style={styles.doneBtnText}>Tamam</Text>
                </TouchableOpacity>
              </View>
            ) : (
              /* Form */
              <>
                <Text style={styles.modalSubtitle}>
                  Hesabınıza kayıtlı e-posta adresinizi girin. Şifre sıfırlama
                  bağlantısı göndereceğiz.
                </Text>

                <View style={styles.modalInputWrapper}>
                  <Ionicons
                    name="mail-outline"
                    size={18}
                    color="#6B7280"
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.modalInput}
                    placeholder="E-posta adresiniz"
                    placeholderTextColor="#4B5563"
                    value={resetEmail}
                    onChangeText={setResetEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    autoFocus
                  />
                </View>

                <TouchableOpacity
                  style={[
                    styles.sendBtn,
                    isSendingReset && styles.sendBtnDisabled,
                  ]}
                  onPress={handleSendReset}
                  disabled={isSendingReset}
                >
                  {isSendingReset ? (
                    <ActivityIndicator size="small" color="#0F1117" />
                  ) : (
                    <>
                      <Ionicons name="send" size={16} color="#0F1117" />
                      <Text style={styles.sendBtnText}>Bağlantı Gönder</Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={closeResetModal}
                >
                  <Text style={styles.cancelBtnText}>İptal</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F1117",
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: "center",
  },
  logoSection: {
    alignItems: "center",
    marginBottom: 48,
  },
  logoIcon: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: "#1A2332",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#00D26A30",
  },
  appName: {
    fontSize: 32,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 6,
  },
  form: {
    gap: 12,
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
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 16,
  },
  eyeIcon: {
    padding: 4,
  },
  forgotRow: {
    alignSelf: "flex-end",
    marginTop: -4,
  },
  forgotText: {
    color: "#00D26A",
    fontSize: 13,
    fontWeight: "500",
  },
  loginButton: {
    backgroundColor: "#00D26A",
    borderRadius: 12,
    height: 52,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 4,
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    color: "#0F1117",
    fontSize: 16,
    fontWeight: "700",
  },
  registerRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 8,
  },
  registerText: {
    color: "#6B7280",
    fontSize: 14,
  },
  registerLink: {
    color: "#00D26A",
    fontSize: 14,
    fontWeight: "600",
  },
  networksRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginTop: 48,
  },
  networkBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#1A2332",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#2D3748",
  },
  networkBadgeText: {
    color: "#9CA3AF",
    fontSize: 12,
    fontWeight: "500",
  },

  // ── Modal ────────────────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingHorizontal: 24,
  },
  modalCard: {
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
    marginBottom: 12,
  },
  modalIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#064E3B",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#00D26A30",
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#0F1117",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#374151",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 20,
    marginBottom: 20,
  },
  modalInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0F1117",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#374151",
    paddingHorizontal: 14,
    height: 50,
    marginBottom: 16,
  },
  modalInput: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 15,
  },
  sendBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#00D26A",
    borderRadius: 12,
    height: 50,
    marginBottom: 10,
  },
  sendBtnDisabled: {
    opacity: 0.6,
  },
  sendBtnText: {
    color: "#0F1117",
    fontSize: 15,
    fontWeight: "700",
  },
  cancelBtn: {
    alignItems: "center",
    paddingVertical: 10,
  },
  cancelBtnText: {
    color: "#6B7280",
    fontSize: 14,
  },

  // ── Başarı durumu ────────────────────────────────────────────────────────
  successContainer: {
    alignItems: "center",
    paddingVertical: 8,
    gap: 12,
  },
  successIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#064E3B",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#00D26A30",
    marginBottom: 4,
  },
  successTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  successText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 20,
  },
  successEmailHighlight: {
    color: "#00D26A",
    fontWeight: "600",
  },
  doneBtn: {
    backgroundColor: "#00D26A",
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 40,
    marginTop: 8,
  },
  doneBtnText: {
    color: "#0F1117",
    fontSize: 15,
    fontWeight: "700",
  },
});
