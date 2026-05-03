import { useEffect, useState } from "react";
import { Alert, Linking, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { useQueryClient } from "@tanstack/react-query";

import { Screen } from "@/components/Screen";
import { Button } from "@/components/Button";
import { useAuthStore } from "@/stores/auth";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/lib/supabase";
import { prepareAvatar, uploadAvatar } from "@/lib/avatar";
import { colors, radius, shadow, spacing, typography } from "@/lib/theme";

async function pickPhoto(): Promise<string | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    Alert.alert(
      "Photos permission needed",
      "เติมแมว needs Photos access to set your profile picture. Open Settings → Expo Go → Photos.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Open Settings", onPress: () => Linking.openSettings() },
      ],
    );
    return null;
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.9,
  });
  if (result.canceled) return null;
  return result.assets[0].uri;
}

export default function EditProfile() {
  const router = useRouter();
  const session = useAuthStore((s) => s.session);
  const { data: profile } = useProfile();
  const qc = useQueryClient();

  const [displayName, setDisplayName] = useState("");
  const [handle, setHandle] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [pendingAvatarUri, setPendingAvatarUri] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Hydrate fields once the profile loads.
  useEffect(() => {
    if (!profile) return;
    setDisplayName(profile.display_name ?? "");
    setHandle(profile.handle ?? "");
    setAvatarUrl(profile.avatar_url);
  }, [profile]);

  if (!session) {
    return (
      <Screen style={styles.center}>
        <Text>You need to sign in to edit your profile.</Text>
      </Screen>
    );
  }

  const onChangeAvatar = async () => {
    const uri = await pickPhoto();
    if (!uri) return;
    const prepared = await prepareAvatar(uri);
    setPendingAvatarUri(prepared.uri);
  };

  const save = async () => {
    if (!session) return;
    if (handle && !/^[a-z0-9_]{3,20}$/i.test(handle)) {
      Alert.alert("Invalid handle", "Use 3–20 letters, numbers, or underscores.");
      return;
    }
    setBusy(true);
    try {
      let nextAvatar = avatarUrl;
      if (pendingAvatarUri) {
        nextAvatar = await uploadAvatar(pendingAvatarUri, session.user.id);
      }
      const { error } = await supabase
        .from("users")
        .update({
          display_name: displayName.trim() || null,
          handle: handle.trim() || null,
          avatar_url: nextAvatar,
        })
        .eq("id", session.user.id);
      if (error) throw error;
      await qc.invalidateQueries({ queryKey: ["profile"] });
      router.back();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      // Postgres unique-violation surfaces as "duplicate key value" — friendlier copy.
      if (/duplicate key|unique constraint/i.test(msg)) {
        Alert.alert("Handle taken", "Someone else has that handle. Try another.");
      } else {
        Alert.alert("Couldn't save", msg);
      }
    } finally {
      setBusy(false);
    }
  };

  const previewAvatar = pendingAvatarUri ?? avatarUrl;

  return (
    <Screen scroll>
      <View style={styles.container}>
        <Text style={styles.h1}>Edit profile</Text>

        <Pressable onPress={onChangeAvatar} style={styles.avatarPress}>
          {previewAvatar ? (
            <Image source={previewAvatar} style={styles.avatar} contentFit="cover" />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={{ fontSize: 56 }}>🐈</Text>
            </View>
          )}
          <View style={styles.avatarBadge}>
            <Text style={styles.avatarBadgeText}>Change photo</Text>
          </View>
        </Pressable>

        <Text style={styles.label}>Display name</Text>
        <TextInput
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="What should others call you?"
          placeholderTextColor={colors.textDim}
          maxLength={40}
          style={styles.input}
        />

        <Text style={styles.label}>Handle</Text>
        <TextInput
          value={handle}
          onChangeText={setHandle}
          placeholder="username"
          placeholderTextColor={colors.textDim}
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={20}
          style={styles.input}
        />
        <Text style={styles.hint}>3–20 letters, numbers, or underscores. Shown as @{handle || "username"}.</Text>

        <Button label="Save" onPress={save} loading={busy} style={{ marginTop: spacing(4) }} />
        <Button label="Cancel" variant="ghost" onPress={() => router.back()} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing(5), gap: spacing(2) },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  h1: { ...typography.h1, color: colors.text, marginBottom: spacing(3) },
  avatarPress: { alignSelf: "center", alignItems: "center", marginBottom: spacing(4), gap: spacing(2) },
  avatar: { width: 128, height: 128, borderRadius: 64, backgroundColor: colors.surface, ...shadow.card },
  avatarPlaceholder: { alignItems: "center", justifyContent: "center" },
  avatarBadge: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.pill, backgroundColor: colors.primary },
  avatarBadgeText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  label: { ...typography.label, color: colors.text, marginTop: spacing(2) },
  input: {
    minHeight: 56,
    paddingHorizontal: 16,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    fontSize: 16,
    color: colors.text,
    ...shadow.card,
  },
  hint: { ...typography.small, color: colors.textDim },
});
