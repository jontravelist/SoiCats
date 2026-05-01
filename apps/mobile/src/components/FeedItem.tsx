import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { colors, radius, typography, spacing } from "@/lib/theme";
import { formatDistance } from "@/lib/location";
import { useTimeAgo } from "@/hooks/useTimeAgo";

export interface FeedItemProps {
  sightingId: string;
  catId: string | null;
  catName: string | null;
  photoUrl: string;
  caption: string | null;
  photographerHandle: string | null;
  distanceM?: number;
  createdAt: string;
  likeCount: number;
  commentCount: number;
}

export function FeedItem(props: FeedItemProps) {
  const { t } = useTranslation();
  const timeAgo = useTimeAgo();
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Pressable
        onPress={() => props.catId && router.push(`/cat/${props.catId}`)}
        style={styles.header}
      >
        <Text style={styles.catName}>{props.catName ?? "Unknown cat"}</Text>
        <Text style={styles.meta}>
          @{props.photographerHandle ?? "anon"}
          {props.distanceM != null ? ` · ${formatDistance(props.distanceM, t)}` : ""}
          {` · ${timeAgo(props.createdAt)}`}
        </Text>
      </Pressable>
      <Pressable onPress={() => router.push(`/sighting/${props.sightingId}`)}>
        <Image source={props.photoUrl} style={styles.photo} contentFit="cover" />
      </Pressable>
      <View style={styles.row}>
        <Text style={styles.stat}>♥ {props.likeCount}</Text>
        <Text style={styles.stat}>💬 {props.commentCount}</Text>
      </View>
      {props.caption ? <Text style={styles.caption}>{props.caption}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    marginHorizontal: spacing(3),
    marginVertical: spacing(2),
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
  },
  header: { padding: spacing(3) },
  catName: { ...typography.h2 },
  meta: { ...typography.small, color: colors.textDim, marginTop: 2 },
  photo: { width: "100%", aspectRatio: 1, backgroundColor: colors.border },
  row: { flexDirection: "row", paddingHorizontal: spacing(3), paddingVertical: spacing(2), gap: spacing(4) },
  stat: { ...typography.body, color: colors.textDim },
  caption: { ...typography.body, paddingHorizontal: spacing(3), paddingBottom: spacing(3) },
});
