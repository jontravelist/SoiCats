import { useState } from "react";
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import * as AppleAuthentication from "expo-apple-authentication";
import Constants from "expo-constants";

import { Button } from "@/components/Button";
import { supabase } from "@/lib/supabase";
import { colors, radius, shadow, spacing, typography } from "@/lib/theme";

const isInExpoGo = Constants.appOwnership === "expo";

// Fruitopia-style welcome + auth screen.
// Step 1: a friendly landing with the brand and two big CTAs.
// Step 2: same screen, swapped to a small email/password form.
// Browse-without-account is always one tap away in the small ghost link.
export default function AuthScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [step, setStep] = useState<"welcome" | "form">("welcome");
  const [mode, setMode] = useState<"sign_in" | "sign_up">("sign_up");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const goForm = (m: "sign_in" | "sign_up") => {
    setMode(m);
    setStep("form");
  };

  const submit = async () => {
    if (!email.includes("@") || password.length < 6) {
      Alert.alert("Hmm", "Enter a valid email and a password of 6+ characters.");
      return;
    }
    setBusy(true);
    const fn = mode === "sign_up"
      ? supabase.auth.signUp({ email, password })
      : supabase.auth.signInWithPassword({ email, password });
    const { error } = await fn;
    setBusy(false);
    if (error) {
      Alert.alert("Couldn't sign in", error.message);
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
      if (!/canceled/i.test(msg)) Alert.alert("Couldn't sign in", msg);
    }
  };

  return (
    <View style={styles.bg}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        <View style={styles.hero}>
          <Text style={styles.title}>{t("app.name")}</Text>
          <Text style={styles.tagline}>Every cat in your neighbourhood, named.</Text>

          <View style={styles.mascots}>
            <Text style={[styles.cat, styles.cat1]}>🐈</Text>
            <Text style={[styles.cat, styles.cat2]}>🐱</Text>
            <Text style={[styles.cat, styles.cat3]}>🐈‍⬛</Text>
          </View>
        </View>

        {step === "welcome" ? (
          <View style={styles.actions}>
            {Platform.OS === "ios" && !isInExpoGo ? (
              <AppleAuthentication.AppleAuthenticationButton
                buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                cornerRadius={radius.pill}
                style={styles.appleBtn}
                onPress={signInApple}
              />
            ) : null}
            <Pressable onPress={() => goForm("sign_up")} style={({ pressed }) => [styles.cta, styles.ctaPrimary, pressed && styles.pressed]}>
              <Text style={styles.ctaLabel}>Get started</Text>
            </Pressable>
            <Pressable onPress={() => goForm("sign_in")} style={({ pressed }) => [styles.cta, styles.ctaSecondary, pressed && styles.pressed]}>
              <Text style={styles.ctaLabel}>Log in</Text>
            </Pressable>
            <Pressable onPress={() => router.back()}>
              <Text style={styles.skip}>Browse without an account</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.form}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={colors.textDim}
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
              placeholderTextColor={colors.textDim}
              style={styles.input}
            />
            <Button
              label={mode === "sign_up" ? "Create account" : "Sign in"}
              onPress={submit}
              loading={busy}
              style={{ marginTop: spacing(3) }}
            />
            <Pressable onPress={() => setStep("welcome")}>
              <Text style={styles.skip}>← Back</Text>
            </Pressable>
          </View>
        )}

        <Text style={styles.terms}>By continuing you agree to the Terms and Privacy Policy.</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: colors.bg },
  scroll: { flexGrow: 1, padding: spacing(6), justifyContent: "space-between" },

  hero: { alignItems: "center", marginTop: spacing(8) },
  title: { fontSize: 56, fontWeight: "900", color: colors.text, letterSpacing: -1 },
  tagline: { ...typography.body, color: colors.text, opacity: 0.7, marginTop: spacing(2), textAlign: "center" },

  mascots: { height: 240, width: "100%", alignItems: "center", justifyContent: "center", marginTop: spacing(4), position: "relative" },
  cat: { fontSize: 110, position: "absolute" },
  cat1: { left: 10, top: 30, transform: [{ rotate: "-12deg" }] },
  cat2: { right: 20, top: 60, transform: [{ rotate: "10deg" }] },
  cat3: { bottom: 0, alignSelf: "center" },

  actions: { gap: spacing(3), marginTop: spacing(6) },
  cta: {
    minHeight: 60,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
    ...shadow.card,
  },
  ctaPrimary:   { backgroundColor: colors.primary },
  ctaSecondary: { backgroundColor: colors.secondary },
  ctaLabel: { color: "#fff", fontSize: 18, fontWeight: "700" },
  pressed: { transform: [{ scale: 0.98 }] },
  appleBtn: { width: "100%", height: 60 },

  form: { marginTop: spacing(6), gap: spacing(2) },
  label: { ...typography.label, color: colors.text, marginTop: spacing(2) },
  input: {
    minHeight: 56,
    paddingHorizontal: 16,
    borderRadius: radius.lg,
    backgroundColor: "#fff",
    fontSize: 16,
    color: colors.text,
  },
  skip: { ...typography.body, color: colors.text, opacity: 0.7, textAlign: "center", marginTop: spacing(3), padding: spacing(2) },
  terms: { ...typography.small, color: colors.text, opacity: 0.5, textAlign: "center", marginTop: spacing(4) },
});
