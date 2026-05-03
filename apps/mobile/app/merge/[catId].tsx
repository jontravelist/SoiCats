import { useState } from "react";
import { Alert, FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";

import { Screen } from "@/components/Screen";
import { Button } from "@/components/Button";
import { fetchCat, requestCatMerge, searchCatsByName } from "@/lib/api";
import { useAuthStore } from "@/stores/auth";
import { colors, radius, shadow, spacing, typography } from "@/lib/theme";

// Lets a user flag this cat (the source) as a duplicate of another (the target).
// Lands in cat_merge_requests for an admin to approve in Studio.
export default function MergeRequest() {
  const { catId } = useLocalSearchParams<{ catId: string }>();
  const router = useRouter();
  const session = useAuthStore((s) => s.session);

  const sourceQ = useQuery({ queryKey: ["cat", catId], queryFn: () => fetchCat(catId!), enabled: !!catId });
  const [search, setSearch] = useState("");
  const [target, setTarget] = useState<{ id: string; name: string } | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const matchesQ = useQuery({
    queryKey: ["search-cats", search, catId],
    queryFn: () => searchCatsByName(search, catId),
    enabled: search.trim().length >= 2 && !target,
  });

  if (!session) {
    return (
      <Screen style={styles.center}>
        <Text style={styles.body}>Sign in to flag a duplicate.</Text>
        <Button label="Sign in" onPress={() => router.push("/auth")} />
      </Screen>
    );
  }

  const submit = async () => {
    if (!catId || !target) {
      Alert.alert("Pick a cat", "Search for the cat you think this is the same as.");
      return;
    }
    if (!reason.trim()) {
      Alert.alert("Add a reason", "Tell the admin why you think these are the same cat.");
      return;
    }
    setBusy(true);
    try {
      await requestCatMerge({ sourceCatId: catId, targetCatId: target.id, reason: reason.trim() });
      Alert.alert(
        "Request submitted",
        `Thanks. An admin will review the merge of ${sourceQ.data?.name} into ${target.name}.`,
      );
      router.back();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (/duplicate key/i.test(msg)) {
        Alert.alert("Already requested", "Someone else has already filed this exact merge request.");
      } else {
        Alert.alert("Couldn't submit", msg);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={64}
    >
      <Screen>
        <View style={styles.container}>
          <Text style={styles.h1}>Mark as duplicate</Text>
          {sourceQ.data ? (
            <Text style={styles.subtitle}>This cat: {sourceQ.data.name}</Text>
          ) : null}

          <Text style={styles.label}>Same as which cat?</Text>
          {target ? (
            <View style={styles.targetCard}>
              <Text style={styles.targetName}>{target.name}</Text>
              <Pressable onPress={() => setTarget(null)}>
                <Text style={styles.changeLink}>Change</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Type a name to search"
                placeholderTextColor={colors.textDim}
                autoCapitalize="none"
                style={styles.input}
              />
              {(matchesQ.data ?? []).length > 0 ? (
                <FlatList
                  data={matchesQ.data ?? []}
                  keyExtractor={(c) => c.id}
                  scrollEnabled={false}
                  contentContainerStyle={{ gap: spacing(1), marginTop: spacing(2) }}
                  renderItem={({ item }) => (
                    <Pressable
                      onPress={() => setTarget({ id: item.id, name: item.name })}
                      style={({ pressed }) => [styles.matchRow, pressed && { opacity: 0.85 }]}
                    >
                      <Text style={styles.matchName}>{item.name}</Text>
                      <Text style={styles.matchMeta}>{item.primary_color} · {item.pattern}</Text>
                    </Pressable>
                  )}
                />
              ) : search.trim().length >= 2 ? (
                <Text style={styles.empty}>No matches.</Text>
              ) : null}
            </>
          )}

          <Text style={styles.label}>Why do you think they're the same?</Text>
          <TextInput
            value={reason}
            onChangeText={setReason}
            placeholder="Same colour, same area, same ear-tip, etc."
            placeholderTextColor={colors.textDim}
            multiline
            maxLength={500}
            style={[styles.input, { minHeight: 100, textAlignVertical: "top", paddingVertical: 14 }]}
          />

          <View style={styles.note}>
            <Text style={styles.noteText}>
              An admin reviews every merge before any data moves. Approving merges
              the source cat's photos, favourites and flags into the target cat
              and removes the duplicate.
            </Text>
          </View>

          <Button label="Submit request" onPress={submit} loading={busy} variant="danger" />
          <Button label="Cancel" variant="ghost" onPress={() => router.back()} />
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing(5), gap: spacing(2) },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing(6), gap: spacing(3) },
  h1: { ...typography.h1, color: colors.text },
  subtitle: { ...typography.body, color: colors.textDim, marginBottom: spacing(2) },
  body: { ...typography.body, color: colors.text, textAlign: "center" },
  label: { ...typography.label, color: colors.text, marginTop: spacing(3) },
  input: {
    minHeight: 56,
    paddingHorizontal: 16,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    fontSize: 16,
    color: colors.text,
    ...shadow.card,
  },
  empty: { ...typography.small, color: colors.textDim, marginTop: spacing(2) },
  matchRow: { padding: spacing(3), backgroundColor: colors.surface, borderRadius: radius.md, ...shadow.card },
  matchName: { ...typography.h3, color: colors.text },
  matchMeta: { ...typography.small, color: colors.textDim, marginTop: 2 },
  targetCard: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    padding: spacing(3), backgroundColor: colors.accentSoft, borderRadius: radius.md,
  },
  targetName: { ...typography.h3, color: colors.text },
  changeLink: { ...typography.body, color: colors.primary, fontWeight: "700" },
  note: {
    backgroundColor: colors.accentSoft,
    padding: spacing(3),
    borderRadius: radius.md,
    marginTop: spacing(3),
  },
  noteText: { ...typography.small, color: colors.text },
});
