import { Tabs } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { colors, shadow } from "@/lib/theme";

// Inline emoji icons keep us off any icon-font asset for the MVP.
// Swap for `@expo/vector-icons` when we have real iconography.
function TabIcon({ symbol, focused }: { symbol: string; focused: boolean }) {
  return (
    <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
      <Text style={[styles.icon, !focused && { opacity: 0.55 }]}>{symbol}</Text>
    </View>
  );
}

// Raised post-FAB per the Soi Sunset spec — 54x54 papaya circle, white
// plus, lifted -12 above the bar, 4px cream ring, soft halo shadow.
function PostFab({ focused, onPress }: { focused: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={12}
      style={({ pressed }) => [styles.fab, focused && styles.fabFocused, pressed && { transform: [{ scale: 0.96 }] }]}
    >
      <Text style={styles.fabIcon}>＋</Text>
    </Pressable>
  );
}

export default function TabsLayout() {
  const { t } = useTranslation();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textDim,
        tabBarLabelStyle: { fontSize: 10.5, fontWeight: "700", marginTop: 2, letterSpacing: 0.2 },
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopWidth: 0,
          height: 88,
          paddingTop: 8,
          paddingBottom: 24,
          ...shadow.card,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t("tabs.feed"),
          tabBarIcon: ({ focused }) => <TabIcon symbol="🏘️" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: t("tabs.map"),
          tabBarIcon: ({ focused }) => <TabIcon symbol="🗺️" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="post"
        options={{
          title: "",
          tabBarIcon: ({ focused }) => null,
          // Render the raised FAB via the tab button.
          tabBarButton: (props) => (
            <View style={styles.fabSlot}>
              <PostFab focused={!!props.accessibilityState?.selected} onPress={props.onPress as () => void} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="cats"
        options={{
          title: "Cats",
          tabBarIcon: ({ focused }) => <TabIcon symbol="🐈" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "You",
          tabBarIcon: ({ focused }) => <TabIcon symbol="👤" focused={focused} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrapActive: { backgroundColor: colors.bg },
  icon: { fontSize: 20 },

  fabSlot: { flex: 1, alignItems: "center", justifyContent: "flex-start" },
  fab: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.primary,
    borderWidth: 4,
    borderColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -16,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  fabFocused: { transform: [{ scale: 1.04 }] },
  fabIcon: { color: "#FFFFFF", fontSize: 28, fontWeight: "900", lineHeight: 28, marginTop: -2 },
});
