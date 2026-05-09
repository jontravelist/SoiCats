import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { colors, radius, shadow, typography, spacing } from "@/lib/theme";
import { formatDistance } from "@/lib/location";
import { useTimeAgo } from "@/hooks/useTimeAgo";

export interface FeedItemProps {
  sightingId: string;
  catId: string | null;
  catName: string | null;
  photoUrl: string;
  caption: string | null;
  photographerHandle: string | null;
  districtName?: string | null;
  distanceM?: number;
  createdAt: string;
  likeCount: number;
  commentCount: number;
}

// Feed card per the Soi Sunset spec:
//   - Aspect-1/1 photo top, time-ago overlay top-right
//   - Body: cat name (h3) with arrow, district + sighter handle (small dim)
//   - Footer row: pin + meters · ♥ likes · 💬 comments · share
export function FeedItem(props: FeedItemProps) {
  const { t } = useTranslation();
  const timeAgo = useTimeAgo();
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Pressable onPress={() => router.push(`/sighting/${props.sightingId}`)}>
        <Image source={props.photoUrl} style={styles.photo} contentFit="cover" />
        <View style={styles.timePill}>
          <Text style={styles.timePillText}>{timeAgo(props.createdAt)}</Text>
        </View>
      </Pressable>

      <Pressable
        onPress={() => props.catId && router.push(`/cat/${props.catId}`)}
        style={({ pressed }) => [styles.body, pressed && props.catId && { opacity: 0.7 }]}
      >
        <Text style={styles.catName} numberOfLines={1}>
          {props.catName ?? "Unknown cat"}
          {props.catId ? <Text style={styles.linkArrow}>  ›</Text> : null}
        </Text>
        <Text style={styles.meta}>
          {props.districtName ? `${props.districtName} · ` : ""}@{props.photographerHandle ?? "anon"}
        </Text>
      </Pressable>

      {props.caption ? <Text style={styles.caption}>{props.caption}</Text> : null}

      <View style={styles.footerRow}>
        {props.distanceM != null ? (
          <Text style={styles.footerStat}>📍 {formatDistance(props.distanceM, t)}</Text>
        ) : <View />}
        <View style={styles.footerActions}>
          <Text style={styles.footerStat}>♥ {props.likeCount}</Text>
          <Text style={styles.footerStat}>💬 {props.commentCount}</Text>
          <Text style={styles.footerStat}>↗</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    marginHorizontal: spacing(4),
    marginVertical: spacing(2),
    overflow: "hidden",
    ...shadow.card,
  },
  photo: { width: "100%", aspectRatio: 1, backgroundColor: colors.surfaceAlt },
  timePill: {
    position: "absolute",
    top: 12,
    right: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: "rgba(23,26,31,0.6)",
    borderRadius: radius.pill,
  },
  timePillText: { color: "#fff", fontSize: 11, fontWeight: "700", letterSpacing: 0.3 },

  body: { paddingHorizontal: spacing(3), paddingTop: spacing(3), paddingBottom: spacing(1) },
  catName: { ...typography.h3, color: colors.text },
  linkArrow: { color: colors.primary, fontWeight: "900" },
  meta: { ...typography.small, color: colors.textDim, marginTop: 2 },

  caption: { ...typography.body, color: colors.text, paddingHorizontal: spacing(3), paddingTop: spacing(1) },

  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(3),
  },
  footerActions: { flexDirection: "row", gap: spacing(4) },
  footerStat: { ...typography.body, color: colors.textDim, fontWeight: "700" },
});
