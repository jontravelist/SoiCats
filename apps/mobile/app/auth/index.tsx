import { useState } from "react";
import { Alert, Platform, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import * as AppleAuthentication from "expo-apple-authentication";
import Constants from "expo-constants";

import { Screen } from "@/components/Screen";
import { Button } from "@/components/Button";
import { supabase } from "@/lib/supabase";
import { colors, spacing, typography } from "@/lib/theme";

// Apple sign-in only works inside our native shell, not Expo Go.
// `appOwnership === "expo"` means we're running in Expo Go.
const isInExpoGo = Constants.appOwnership === "expo";

export default function AuthScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [mode, setMode] = useState<"sign_in" | "sign_up">("sign_up");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!email.includes("@") || password.length < 6) {
      Alert.alert(t("common.error"), "Need a valid email and a password of 6+ characters.");
      return;
    }
    setBusy(true);
    const fn = mode === "sign_up"
      ? supabase.auth.signUp({ email, password })
      : supabase.auth.signInWithPassword({ email, password });
    const { error } = await fn;
    setBusy(false);
    if (error) {
      Alert.alert(t("common.error"), error.message);
      return;
    }
    router.back();
  };

  const signInApple = async () => {
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (!credential.identityToken) throw new Error("No identity token");
      const { error } = await supabase.auth.signInWithIdToken({
        provider: "apple",
        token: credential.identityToken,
      });
      if (error) throw error;
      router.back();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (!/canceled/i.test(msg)) Alert.alert(t("common.error"), msg);
    }
  };

  return (
    <Screen>
      <View style={styles.body}>
        <Text style={styles.title}>{t("app.name")}</Text>
        <Text style={styles.tagline}>{t("app.tagline")}</Text>

        {Platform.OS === "ios" && !isInExpoGo ? (
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
            buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
            cornerRadius={10}
            style={styles.appleBtn}
            onPress={signInApple}
          />
        ) : null}

        <View style={styles.tabs}>
          <Button
            label="Sign up"
            variant={mode === "sign_up" ? "primary" : "ghost"}
            onPress={() => setMode("sign_up")}
            style={styles.tabBtn}
          />
          <Button
            label="Sign in"
            variant={mode === "sign_in" ? "primary" : "ghost"}
            onPress={() => setMode("sign_in")}
            style={styles.tabBtn}
          />
        </View>

        <Text style={styles.label}>Email</Text>
        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          style={styles.input}
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          placeholder="6+ characters"
          style={styles.input}
        />

        <Button
          label={mode === "sign_up" ? "Create account" : "Sign in"}
          onPress={submit}
          loading={busy}
        />

        <Button
          label={t("auth.skipForNow")}
          variant="ghost"
          onPress={() => router.back()}
          style={{ marginTop: spacing(2) }}
        />

        <Text style={styles.terms}>{t("auth.termsHint")}</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, padding: spacing(5), gap: spacing(3) },
  title: { ...typography.h1, marginTop: spacing(4) },
  tagline: { ...typography.body, color: colors.textDim },
  appleBtn: { width: "100%", height: 48, marginTop: spacing(3) },
  tabs: { flexDirection: "row", gap: spacing(2), marginTop: spacing(3) },
  tabBtn: { flex: 1 },
  label: { ...typography.label, color: colors.textDim },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    backgroundColor: colors.surface,
  },
  terms: { ...typography.small, color: colors.textDim, textAlign: "center", marginTop: "auto" },
});
