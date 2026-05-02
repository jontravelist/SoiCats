import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { QueryClientProvider } from "@tanstack/react-query";

import { queryClient } from "@/lib/queryClient";
import { useAuthStore } from "@/stores/auth";
import "@/lib/i18n";

export default function RootLayout() {
  const init = useAuthStore((s) => s.init);

  useEffect(() => {
    void init();
  }, [init]);

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
          <Stack.Screen name="sticker/[id]" options={{ presentation: "modal" }} />
        </Stack>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
