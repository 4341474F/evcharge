import { useEffect, useState } from "react";
import { Stack, router } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";
import { supabase } from "../lib/supabase/client";
import { useAuthStore } from "../stores/authStore";
import { isOnboardingDone } from "./(auth)/onboarding";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 2, staleTime: 5 * 60 * 1000 },
  },
});

function AuthListener() {
  const { setSession, setLoading } = useAuthStore();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    // Onboarding kontrolü + session yükleme paralel
    Promise.all([isOnboardingDone(), supabase.auth.getSession()]).then(
      ([
        onboardingDone,
        {
          data: { session },
        },
      ]) => {
        setSession(session);
        setLoading(false);

        if (!onboardingDone) {
          router.replace("/(auth)/onboarding");
        }

        setChecked(true);
      },
    );

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (event === "SIGNED_OUT") router.replace("/(auth)/login");
    });

    return () => subscription.unsubscribe();
  }, []);

  return null;
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthListener />
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="station/[id]" options={{ presentation: "modal" }} />
        <Stack.Screen
          name="session/active"
          options={{ presentation: "fullScreenModal" }}
        />
        <Stack.Screen
          name="favorites"
          options={{ presentation: "card", animation: "slide_from_right" }}
        />
        <Stack.Screen
          name="vehicles"
          options={{ presentation: "card", animation: "slide_from_right" }}
        />
        <Stack.Screen
          name="notifications"
          options={{ presentation: "card", animation: "slide_from_right" }}
        />
        <Stack.Screen
          name="reset-password"
          options={{ presentation: "card", animation: "slide_from_bottom" }}
        />
      </Stack>
    </QueryClientProvider>
  );
}
