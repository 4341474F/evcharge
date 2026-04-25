import React, { useRef, useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Dimensions,
  Animated,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../../lib/supabase/client";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const ONBOARDING_KEY = "sarjbul_onboarding_done";

// ─── Slide verisi ──────────────────────────────────────────────────────────────

interface Slide {
  id: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  iconColor: string;
  iconBg: string;
  accentColor: string;
  title: string;
  subtitle: string;
  bullets: {
    icon: React.ComponentProps<typeof Ionicons>["name"];
    text: string;
  }[];
}

const SLIDES: Slide[] = [
  {
    id: "map",
    icon: "map",
    iconColor: "#00D26A",
    iconBg: "#064E3B",
    accentColor: "#00D26A",
    title: "Tüm Şarj Ağları\nTek Haritada",
    subtitle:
      "ZES, Eşarj, Trugo, Voltrun ve daha fazlası — Türkiye'deki tüm halka açık şarj istasyonlarını tek ekrandan görün.",
    bullets: [
      { icon: "flash", text: "Anlık müsaitlik durumu" },
      { icon: "filter", text: "Ağ, güç ve konnektör filtresi" },
      { icon: "leaf", text: "Yeşil enerji (YEK-G) rozeti" },
    ],
  },
  {
    id: "route",
    icon: "navigate",
    iconColor: "#3B82F6",
    iconBg: "#1E3A5F",
    accentColor: "#3B82F6",
    title: "Akıllı\nRota Planlama",
    subtitle:
      "Uzun yolculuklarda aracının menzilini hesaba katarak en uygun şarj duraklarını otomatik öner.",
    bullets: [
      { icon: "car-sport", text: "Aracına özel menzil hesabı" },
      { icon: "time", text: "Tahmini şarj süresi ve maliyeti" },
      { icon: "cloud", text: "CO₂ tasarrufu hesaplama" },
    ],
  },
  {
    id: "stats",
    icon: "stats-chart",
    iconColor: "#8B5CF6",
    iconBg: "#2E1065",
    accentColor: "#8B5CF6",
    title: "Şarj Geçmişin\nve İstatistiklerin",
    subtitle:
      "Her şarj oturumunu kaydet, harcamalarını izle, rozetler kazan ve elektrikli araç kullanımının avantajlarını gör.",
    bullets: [
      { icon: "card", text: "Oturum başına maliyet takibi" },
      { icon: "trophy", text: "Başarı rozetleri" },
      { icon: "heart", text: "Favori istasyonlar listesi" },
    ],
  },
];

// ─── Onboarding tamamlandı mı kontrolü ────────────────────────────────────────

export async function isOnboardingDone(): Promise<boolean> {
  try {
    const val = await AsyncStorage.getItem(ONBOARDING_KEY);
    return val === "true";
  } catch {
    return false;
  }
}

async function markOnboardingDone() {
  try {
    await AsyncStorage.setItem(ONBOARDING_KEY, "true");
  } catch {
    // AsyncStorage hatası sessizce geç
  }
}

// ─── SlideItem ────────────────────────────────────────────────────────────────

function SlideItem({ slide }: { slide: Slide }) {
  return (
    <View style={[styles.slide, { width: SCREEN_WIDTH }]}>
      {/* İkon dairesi */}
      <View
        style={[
          styles.iconCircle,
          {
            backgroundColor: slide.iconBg,
            borderColor: slide.accentColor + "40",
          },
        ]}
      >
        <Ionicons name={slide.icon} size={56} color={slide.iconColor} />
      </View>

      {/* Başlık */}
      <Text style={styles.slideTitle}>{slide.title}</Text>

      {/* Alt başlık */}
      <Text style={styles.slideSubtitle}>{slide.subtitle}</Text>

      {/* Bullet'lar */}
      <View style={styles.bulletsContainer}>
        {slide.bullets.map((b, i) => (
          <View key={i} style={styles.bulletRow}>
            <View
              style={[
                styles.bulletIcon,
                {
                  backgroundColor: slide.accentColor + "20",
                  borderColor: slide.accentColor + "40",
                },
              ]}
            >
              <Ionicons name={b.icon} size={15} color={slide.accentColor} />
            </View>
            <Text style={styles.bulletText}>{b.text}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── Ana Ekran ────────────────────────────────────────────────────────────────

export default function OnboardingScreen() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const isLast = currentIndex === SLIDES.length - 1;
  const currentSlide = SLIDES[currentIndex];

  async function handleFinish() {
    await markOnboardingDone();
    // Oturum açıksa direkt haritaya, yoksa login'e
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session) {
      router.replace("/(tabs)");
    } else {
      router.replace("/(auth)/login");
    }
  }

  function handleNext() {
    if (isLast) {
      handleFinish();
      return;
    }
    const next = currentIndex + 1;
    flatListRef.current?.scrollToIndex({ index: next, animated: true });
    setCurrentIndex(next);
  }

  function handleSkip() {
    handleFinish();
  }

  function handleDotPress(index: number) {
    flatListRef.current?.scrollToIndex({ index, animated: true });
    setCurrentIndex(index);
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <StatusBar barStyle="light-content" backgroundColor="#0F1117" />

      {/* Atla butonu */}
      <View style={styles.topBar}>
        <View style={styles.appBrand}>
          <Ionicons name="flash" size={18} color="#00D26A" />
          <Text style={styles.appBrandText}>ŞarjBul</Text>
        </View>
        {!isLast && (
          <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
            <Text style={styles.skipText}>Atla</Text>
            <Ionicons name="chevron-forward" size={14} color="#6B7280" />
          </TouchableOpacity>
        )}
      </View>

      {/* Slide listesi */}
      <Animated.FlatList
        ref={flatListRef}
        data={SLIDES}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false },
        )}
        onMomentumScrollEnd={(e) => {
          const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
          setCurrentIndex(idx);
        }}
        renderItem={({ item }) => <SlideItem slide={item} />}
        getItemLayout={(_, index) => ({
          length: SCREEN_WIDTH,
          offset: SCREEN_WIDTH * index,
          index,
        })}
      />

      {/* Alt alan: dot'lar + buton */}
      <View style={styles.bottomArea}>
        {/* Dot'lar */}
        <View style={styles.dotsRow}>
          {SLIDES.map((_, i) => {
            const inputRange = [
              (i - 1) * SCREEN_WIDTH,
              i * SCREEN_WIDTH,
              (i + 1) * SCREEN_WIDTH,
            ];
            const width = scrollX.interpolate({
              inputRange,
              outputRange: [8, 24, 8],
              extrapolate: "clamp",
            });
            const opacity = scrollX.interpolate({
              inputRange,
              outputRange: [0.3, 1, 0.3],
              extrapolate: "clamp",
            });
            return (
              <TouchableOpacity
                key={i}
                onPress={() => handleDotPress(i)}
                hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
              >
                <Animated.View
                  style={[
                    styles.dot,
                    {
                      width,
                      opacity,
                      backgroundColor: currentSlide.accentColor,
                    },
                  ]}
                />
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Devam / Başla butonu */}
        <TouchableOpacity
          style={[
            styles.nextBtn,
            { backgroundColor: currentSlide.accentColor },
          ]}
          onPress={handleNext}
          activeOpacity={0.85}
        >
          {isLast ? (
            <>
              <Ionicons name="flash" size={20} color="#0F1117" />
              <Text style={styles.nextBtnText}>Hemen Başla</Text>
            </>
          ) : (
            <>
              <Text style={styles.nextBtnText}>Devam</Text>
              <Ionicons name="arrow-forward" size={20} color="#0F1117" />
            </>
          )}
        </TouchableOpacity>

        {/* Zaten hesabım var */}
        <TouchableOpacity style={styles.loginRow} onPress={handleFinish}>
          <Text style={styles.loginRowText}>Zaten hesabım var — </Text>
          <Text
            style={[styles.loginRowLink, { color: currentSlide.accentColor }]}
          >
            Giriş Yap
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F1117",
  },

  // Top bar
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
  },
  appBrand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  appBrandText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  skipBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  skipText: {
    color: "#6B7280",
    fontSize: 14,
  },

  // Slide
  slide: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingBottom: 20,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 36,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    marginBottom: 36,
    // Subtle shadow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  slideTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#FFFFFF",
    textAlign: "center",
    lineHeight: 36,
    letterSpacing: -0.5,
    marginBottom: 16,
  },
  slideSubtitle: {
    fontSize: 15,
    color: "#9CA3AF",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 32,
  },

  // Bullets
  bulletsContainer: {
    width: "100%",
    gap: 12,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "#1A2332",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#2D3748",
  },
  bulletIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    flexShrink: 0,
  },
  bulletText: {
    color: "#D1D5DB",
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
  },

  // Bottom area
  bottomArea: {
    paddingHorizontal: 24,
    paddingBottom: 16,
    gap: 16,
    alignItems: "center",
  },
  dotsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  nextBtn: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: 16,
    paddingVertical: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  nextBtnText: {
    color: "#0F1117",
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  loginRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
  },
  loginRowText: {
    color: "#6B7280",
    fontSize: 13,
  },
  loginRowLink: {
    fontSize: 13,
    fontWeight: "700",
  },
});
