import { Tabs } from "expo-router";
import { Text, StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";
import { colors, shadow } from "@/lib/theme";

// Inline emoji icons keep us off any icon-font asset for the MVP.
// Swap for `@expo/vector-icons` when we have real iconography.
function TabIcon({ symbol, focused }: { symbol: string; focused: boolean }) {
  return (
    <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
      <Text style={styles.icon}>{symbol}</Text>
    </View>
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
        tabBarLabelStyle: { fontSize: 11, fontWeight: "700", marginTop: 2 },
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopWidth: 0,
          height: 84,
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
          title: t("tabs.post"),
          tabBarIcon: ({ focused }) => <TabIcon symbol="📷" focused={focused} />,
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
          title: t("tabs.profile"),
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
});
