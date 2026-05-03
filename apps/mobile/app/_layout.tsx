import { useEffect, useRef } from "react";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { QueryClientProvider } from "@tanstack/react-query";

import { queryClient } from "@/lib/queryClient";
import { useAuthStore } from "@/stores/auth";
import "@/lib/i18n";

export default function RootLayout() {
  const init = useAuthStore((s) => s.init);
  const session = useAuthStore((s) => s.session);
  const loading = useAuthStore((s) => s.loading);
  const router = useRouter();
  const promptedOnce = useRef(false);

  useEffect(() => {
    void init();
  }, [init]);

  // First time the app finishes loading and there's no session, gently push
  // the auth modal. Only once per cold start — if they dismiss it we don't
  // keep nagging.
  useEffect(() => {
    if (loading || promptedOnce.current) return;
    promptedOnce.current = true;
    if (!session) router.push("/auth");
  }, [loading, session, router]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="auth/index" options={{ presentation: "modal" }} />
          <Stack.Screen name="cat/[id]" options={{ headerShown: true, title: "" }} />
          <Stack.Screen name="sighting/[id]" options={{ headerShown: true, title: "" }} />
          <Stack.Screen name="post/identify" options={{ headerShown: true, title: "Which cat?" }} />
          <Stack.Screen name="post/new-cat" options={{ headerShown: true, title: "New cat" }} />
          <Stack.Screen name="profile/edit" options={{ headerShown: true, title: "Edit profile" }} />
          <Stack.Screen name="sticker/[id]" options={{ presentation: "modal" }} />
        </Stack>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
