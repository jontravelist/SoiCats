import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";

import { Screen } from "@/components/Screen";
import { fetchMyPosts } from "@/lib/api";
import { useTimeAgo } from "@/hooks/useTimeAgo";
import { useAuthStore } from "@/stores/auth";
import { colors, radius, shadow, spacing, typography } from "@/lib/theme";

// Lists every sighting the calling user has posted, including ones in the
// 'pending_id' community-ID queue (which don't appear on the public feed).
// Tap any row to open its sighting page.
export default function MyPosts() {
  const router = useRouter();
  const session = useAuthStore((s) => s.session);
  const timeAgo = useTimeAgo();

  const q = useQuery({
    queryKey: ["my-posts", session?.user.id],
    queryFn: fetchMyPosts,
    enabled: !!session,
  });

  if (q.isLoading) {
    return <Screen><ActivityIndicator style={{ flex: 1 }} /></Screen>;
  }

  const items = q.data ?? [];

  if (items.length === 0) {
    return (
      <Screen style={styles.center}>
        <Text style={styles.empty}>No posts yet. Snap a cat to start.</Text>
      </Screen>
    );
  }

  return (
    <Screen>
      <FlatList
        data={items}
        keyExtractor={(s) => s.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const cat = (item as { cats?: { name?: string } | null }).cats;
          const isPending = item.status === "pending_id";
          return (
            <Pressable
              onPress={() => router.push(`/sighting/${item.id}`)}
              style={({ pressed }) => [styles.row, pressed && { opacity: 0.92 }]}
            >
              <Image source={item.photo_url} style={styles.thumb} contentFit="cover" />
              <View style={styles.rowText}>
                <Text style={styles.name}>{cat?.name ?? "Awaiting ID"}</Text>
                <Text style={styles.meta}>{timeAgo(item.created_at)}</Text>
                {isPending ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>In community ID queue</Text>
                  </View>
                ) : null}
              </View>
            </Pressable>
          );
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing(6) },
  empty: { ...typography.body, color: colors.textDim, textAlign: "center" },
  list: { padding: spacing(4), gap: spacing(2) },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    padding: spacing(3),
    borderRadius: radius.lg,
    gap: spacing(3),
    ...shadow.card,
  },
  thumb: { width: 72, height: 72, borderRadius: radius.md, backgroundColor: colors.accentSoft },
  rowText: { flex: 1, gap: 4 },
  name: { ...typography.h3, color: colors.text },
  meta: { ...typography.small, color: colors.textDim },
  badge: { alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: colors.warning, marginTop: 4 },
  badgeText: { color: colors.text, fontSize: 11, fontWeight: "700" },
});
