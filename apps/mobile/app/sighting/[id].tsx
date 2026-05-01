import { useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, TextInput, View } from "react-native";
import { Image } from "expo-image";
import { useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Screen } from "@/components/Screen";
import { Button } from "@/components/Button";
import { fetchComments, postComment, toggleLike } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/auth";
import { useTimeAgo } from "@/hooks/useTimeAgo";
import { colors, spacing, typography } from "@/lib/theme";

export default function SightingDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const session = useAuthStore((s) => s.session);
  const timeAgo = useTimeAgo();
  const qc = useQueryClient();
  const [draft, setDraft] = useState("");

  const sightingQ = useQuery({
    queryKey: ["sighting", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sightings")
        .select("*, users:photographer_id(handle, avatar_url), cats(id, name)")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const commentsQ = useQuery({
    queryKey: ["comments", id],
    queryFn: () => fetchComments(id!),
    enabled: !!id,
  });

  const likedQ = useQuery({
    queryKey: ["liked", id, session?.user.id],
    queryFn: async () => {
      if (!session) return false;
      const { count } = await supabase
        .from("likes")
        .select("user_id", { count: "exact", head: true })
        .eq("sighting_id", id!)
        .eq("user_id", session.user.id);
      return (count ?? 0) > 0;
    },
    enabled: !!session && !!id,
  });

  const likeMut = useMutation({
    mutationFn: () => toggleLike(id!, !likedQ.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["liked", id] }),
  });

  const commentMut = useMutation({
    mutationFn: () => postComment(id!, draft.trim()),
    onSuccess: () => {
      setDraft("");
      qc.invalidateQueries({ queryKey: ["comments", id] });
    },
  });

  if (sightingQ.isLoading || !sightingQ.data) {
    return <Screen><ActivityIndicator style={{ flex: 1 }} /></Screen>;
  }
  const s = sightingQ.data;

  return (
    <Screen scroll>
      <Image source={s.photo_url} style={styles.photo} contentFit="cover" />
      <View style={styles.body}>
        <Text style={styles.cat}>{s.cats?.name ?? "—"}</Text>
        <Text style={styles.meta}>
          @{s.users?.handle ?? "anon"} · {timeAgo(s.created_at)}
        </Text>
        {s.caption ? <Text style={styles.caption}>{s.caption}</Text> : null}
        <View style={styles.actions}>
          <Button
            label={likedQ.data ? "♥ Liked" : "♡ Like"}
            onPress={() => likeMut.mutate()}
            variant={likedQ.data ? "secondary" : "primary"}
          />
        </View>
      </View>

      <FlatList
        data={commentsQ.data ?? []}
        keyExtractor={(c) => c.id}
        scrollEnabled={false}
        renderItem={({ item }) => (
          <View style={styles.commentRow}>
            <Text style={styles.commentHandle}>
              @{(item as { users?: { handle?: string } }).users?.handle ?? "anon"}
            </Text>
            <Text style={styles.commentBody}>{item.body}</Text>
          </View>
        )}
      />

      {session ? (
        <View style={styles.composer}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Say something"
            style={styles.input}
            maxLength={1000}
          />
          <Button label="Post" onPress={() => commentMut.mutate()} disabled={!draft.trim()} loading={commentMut.isPending} />
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  photo: { width: "100%", aspectRatio: 1, backgroundColor: colors.border },
  body: { padding: spacing(4) },
  cat: { ...typography.h2 },
  meta: { ...typography.small, color: colors.textDim, marginTop: 4 },
  caption: { ...typography.body, marginTop: spacing(2) },
  actions: { marginTop: spacing(3) },
  commentRow: { paddingHorizontal: spacing(4), paddingVertical: spacing(2) },
  commentHandle: { ...typography.small, color: colors.primaryDark, fontWeight: "600" },
  commentBody: { ...typography.body },
  composer: {
    flexDirection: "row", gap: spacing(2), padding: spacing(3),
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  input: {
    flex: 1, minHeight: 44, paddingHorizontal: 12,
    borderWidth: 1, borderColor: colors.border, borderRadius: 10,
    backgroundColor: colors.surface,
  },
});
