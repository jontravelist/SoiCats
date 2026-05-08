import { useEffect, useRef } from "react";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { QueryClientProvider } from "@tanstack/react-query";

import { queryClient } from "@/lib/queryClient";
import { useAuthStore } from "@/stores/auth";
import { registerForPush } from "@/lib/push";
import { colors } from "@/lib/theme";
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

  // Whenever the user signs in (or app starts with an existing session),
  // make sure their Expo push token is recorded. No-ops in Expo Go without
  // an EAS projectId, on simulators, or when permission is denied.
  useEffect(() => {
    if (!session) return;
    void registerForPush(session.user.id);
  }, [session?.user.id]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerShown: false,
            headerBackTitle: "Back",
            headerTintColor: colors.primary,
            headerStyle: { backgroundColor: colors.bg },
            headerTitleStyle: { color: colors.text, fontWeight: "700" },
          }}
        >
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="auth/index" options={{ presentation: "modal" }} />
          <Stack.Screen name="cat/[id]" options={{ headerShown: true, title: "" }} />
          <Stack.Screen name="sighting/[id]" options={{ headerShown: true, title: "" }} />
          <Stack.Screen name="post/identify" options={{ headerShown: true, title: "Which cat?" }} />
          <Stack.Screen name="post/new-cat" options={{ headerShown: true, title: "New cat" }} />
          <Stack.Screen name="profile/edit" options={{ headerShown: true, title: "Edit profile" }} />
          <Stack.Screen name="profile/my-posts" options={{ headerShown: true, title: "My posts" }} />
          <Stack.Screen name="profile/notifications" options={{ headerShown: true, title: "Notifications" }} />
          <Stack.Screen name="identify/index" options={{ headerShown: true, title: "Help identify" }} />
          <Stack.Screen name="flag/[catId]" options={{ headerShown: true, title: "Report welfare issue" }} />
          <Stack.Screen name="edit-cat/[id]" options={{ headerShown: true, title: "Edit cat" }} />
          <Stack.Screen name="merge/[catId]" options={{ headerShown: true, title: "Mark as duplicate" }} />
          <Stack.Screen name="admin/index" options={{ headerShown: true, title: "Admin" }} />
          <Stack.Screen name="admin/merges" options={{ headerShown: true, title: "Merge requests" }} />
          <Stack.Screen name="admin/feeders" options={{ headerShown: true, title: "Feeder applications" }} />
          <Stack.Screen name="leaderboards/index" options={{ headerShown: true, title: "Leaderboards" }} />
          <Stack.Screen name="share-card/[catId]" options={{ presentation: "modal", headerShown: true, title: "Share" }} />
          <Stack.Screen name="profile/apply-feeder" options={{ headerShown: true, title: "Verified Feeder" }} />
          <Stack.Screen name="log-feed/[catId]" options={{ headerShown: true, title: "Log feed" }} />
          <Stack.Screen name="stickers/index" options={{ headerShown: true, title: "Stickers" }} />
          <Stack.Screen name="sticker/[id]" options={{ presentation: "modal" }} />
        </Stack>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
