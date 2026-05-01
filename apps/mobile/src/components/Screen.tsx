import { ReactNode } from "react";
import { ScrollView, StyleSheet, View, ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "@/lib/theme";

interface Props {
  children: ReactNode;
  scroll?: boolean;
  style?: ViewStyle;
}

export function Screen({ children, scroll, style }: Props) {
  const Container = scroll ? ScrollView : View;
  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <Container style={[styles.body, style]} contentContainerStyle={scroll ? styles.scrollContent : undefined}>
        {children}
      </Container>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  body: { flex: 1 },
  scrollContent: { paddingBottom: 40 },
});
