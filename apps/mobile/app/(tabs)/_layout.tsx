import { Tabs } from "expo-router";
import { Text } from "react-native";
import { useTranslation } from "react-i18next";
import { colors } from "@/lib/theme";

// Inline emoji icons keep us off any icon-font asset for the MVP.
// Swap for `@expo/vector-icons` when we have real iconography.
function TabIcon({ symbol, color }: { symbol: string; color: string }) {
  return <Text style={{ fontSize: 22, color }}>{symbol}</Text>;
}

export default function TabsLayout() {
  const { t } = useTranslation();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textDim,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t("tabs.feed"),
          tabBarIcon: ({ color }) => <TabIcon symbol="🏘️" color={color} />,
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: t("tabs.map"),
          tabBarIcon: ({ color }) => <TabIcon symbol="🗺️" color={color} />,
        }}
      />
      <Tabs.Screen
        name="post"
        options={{
          title: t("tabs.post"),
          tabBarIcon: ({ color }) => <TabIcon symbol="➕" color={color} />,
        }}
      />
      <Tabs.Screen
        name="stickers"
        options={{
          title: t("tabs.stickers"),
          tabBarIcon: ({ color }) => <TabIcon symbol="✨" color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t("tabs.profile"),
          tabBarIcon: ({ color }) => <TabIcon symbol="👤" color={color} />,
        }}
      />
    </Tabs>
  );
}
