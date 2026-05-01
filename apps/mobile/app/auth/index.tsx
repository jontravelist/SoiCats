import { useState } from "react";
import { Alert, Platform, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import * as AppleAuthentication from "expo-apple-authentication";

import { Screen } from "@/components/Screen";
import { Button } from "@/components/Button";
import { supabase } from "@/lib/supabase";
import { colors, spacing, typography } from "@/lib/theme";

// MVP auth: Apple (iOS only), Google (TODO via expo-auth-session in a follow-up),
// and email magic-link as a universal fallback.
export default function AuthScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const sendMagicLink = async () => {
    if (!email.includes("@")) return;
    setBusy(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: "soicats://auth-callback" },
    });
    setBusy(false);
    if (error) Alert.alert(t("common.error"), error.message);
    else setSent(true);
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

        {Platform.OS === "ios" ? (
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
            buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
            cornerRadius={10}
            style={styles.appleBtn}
            onPress={signInApple}
          />
        ) : null}

        <Text style={styles.divider}>—</Text>

        <Text style={styles.label}>{t("auth.email")}</Text>
        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          style={styles.input}
        />
        <Button
          label={sent ? t("auth.magicLinkSent") : t("auth.signInWithEmail")}
          onPress={sendMagicLink}
          loading={busy}
          disabled={sent}
        />

        <Button
          label={t("auth.skipForNow")}
          variant="ghost"
          onPress={() => router.back()}
          style={{ marginTop: spacing(4) }}
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
  divider: { textAlign: "center", color: colors.textDim, marginVertical: spacing(2) },
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
