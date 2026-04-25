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
  ScrollView,
} from "react-native";
import { Link, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase/client";

export default function RegisterScreen() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [registered, setRegistered] = useState(false);

  async function handleRegister() {
    if (!fullName || !email || !password) {
      Alert.alert("Hata", "Tüm alanları doldurun.");
      return;
    }
    if (password.length < 6) {
      Alert.alert("Hata", "Şifre en az 6 karakter olmalıdır.");
      return;
    }

    setIsLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: "sarjbul://login",
      },
    });
    setIsLoading(false);

    if (error) {
      Alert.alert("Kayıt Hatası", error.message);
      return;
    }

    // Supabase email confirmation kapalıysa session hemen gelir
    if (data.session) {
      router.replace("/(tabs)");
      return;
    }

    // Email confirmation açıksa bekleme ekranına geç
    setRegistered(true);
  }

  // ── Email doğrulama bekleme ekranı ──────────────────────────────────────────
  if (registered) {
    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.successContent}>
          <View style={styles.successIconWrap}>
            <Ionicons name="mail" size={44} color="#00D26A" />
          </View>

          <Text style={styles.successTitle}>E-postanızı Doğrulayın</Text>
          <Text style={styles.successBody}>
            <Text style={styles.successEmail}>{email}</Text> adresine bir
            doğrulama bağlantısı gönderdik.{"\n\n"}
            E-postanızdaki bağlantıya tıkladıktan sonra aşağıdan giriş
            yapabilirsiniz.
          </Text>

          <View style={styles.successHint}>
            <Ionicons
              name="information-circle-outline"
              size={16}
              color="#3B82F6"
            />
            <Text style={styles.successHintText}>
              Spam / gereksiz posta klasörünüzü de kontrol edin.
            </Text>
          </View>

          <TouchableOpacity
            style={styles.loginBtn}
            onPress={() => router.replace("/(auth)/login")}
          >
            <Ionicons name="log-in-outline" size={18} color="#0F1117" />
            <Text style={styles.loginBtnText}>Giriş Yap</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.resendBtn}
            onPress={async () => {
              const { error } = await supabase.auth.resend({
                type: "signup",
                email,
                options: { emailRedirectTo: "sarjbul://login" },
              });
              if (error) {
                Alert.alert("Hata", error.message);
              } else {
                Alert.alert(
                  "Gönderildi",
                  "Doğrulama e-postası tekrar gönderildi.",
                );
              }
            }}
          >
            <Text style={styles.resendText}>Tekrar Gönder</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    );
  }

  // ── Kayıt formu ─────────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.title}>Hesap Oluştur</Text>
          <Text style={styles.subtitle}>
            Tüm şarj ağlarına tek hesapla eriş
          </Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputWrapper}>
            <Ionicons
              name="person-outline"
              size={20}
              color="#6B7280"
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="Ad Soyad"
              placeholderTextColor="#6B7280"
              value={fullName}
              onChangeText={setFullName}
              autoCapitalize="words"
            />
          </View>

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
              placeholder="Şifre (min. 6 karakter)"
              placeholderTextColor="#6B7280"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
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

          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#0F1117" />
            ) : (
              <Text style={styles.buttonText}>Kayıt Ol</Text>
            )}
          </TouchableOpacity>

          <View style={styles.loginRow}>
            <Text style={styles.loginText}>Zaten hesabın var mı? </Text>
            <Link href="/(auth)/login" asChild>
              <TouchableOpacity>
                <Text style={styles.loginLink}>Giriş Yap</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0F1117" },

  // ── Kayıt formu ──────────────────────────────────────────────────────────────
  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  backBtn: { marginBottom: 32 },
  header: { marginBottom: 32 },
  title: { fontSize: 28, fontWeight: "700", color: "#FFFFFF", marginBottom: 8 },
  subtitle: { fontSize: 14, color: "#6B7280" },
  form: { gap: 12 },
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
  inputIcon: { marginRight: 12 },
  input: { flex: 1, color: "#FFFFFF", fontSize: 16 },
  eyeIcon: { padding: 4 },
  button: {
    backgroundColor: "#00D26A",
    borderRadius: 12,
    height: 52,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "#0F1117", fontSize: 16, fontWeight: "700" },
  loginRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 8,
  },
  loginText: { color: "#6B7280", fontSize: 14 },
  loginLink: { color: "#00D26A", fontSize: 14, fontWeight: "600" },

  // ── Email doğrulama bekleme ekranı ───────────────────────────────────────────
  successContent: {
    flex: 1,
    paddingHorizontal: 32,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  successIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 28,
    backgroundColor: "#064E3B",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#00D26A40",
    marginBottom: 8,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#FFFFFF",
    textAlign: "center",
  },
  successBody: {
    fontSize: 15,
    color: "#9CA3AF",
    textAlign: "center",
    lineHeight: 22,
  },
  successEmail: {
    color: "#00D26A",
    fontWeight: "600",
  },
  successHint: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#1E3A5F",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#3B82F630",
    width: "100%",
  },
  successHintText: {
    flex: 1,
    color: "#93C5FD",
    fontSize: 13,
    lineHeight: 18,
  },
  loginBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#00D26A",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
    width: "100%",
    justifyContent: "center",
    marginTop: 8,
  },
  loginBtnText: {
    color: "#0F1117",
    fontSize: 16,
    fontWeight: "700",
  },
  resendBtn: {
    paddingVertical: 10,
  },
  resendText: {
    color: "#6B7280",
    fontSize: 14,
    textDecorationLine: "underline",
  },
});
