import { useRef } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";

import { Screen } from "@/components/Screen";
import { Button } from "@/components/Button";
import { DogShareCard } from "@/components/ShareCards/DogShareCard";
import { fetchDog, fetchDogSightings } from "@/lib/api";
import { captureAndSaveCard, captureAndShareCard } from "@/lib/shareCard";
import { colors, spacing, typography } from "@/lib/theme";

// Modal screen showing the dog's share card preview + Share / Save buttons.
// The card itself is captured via react-native-view-shot at 1080x1080 px
// (3x the on-screen 360dp render).
export default function ShareCardScreen() {
  const { dogId } = useLocalSearchParams<{ dogId: string }>();
  const router = useRouter();
  const cardRef = useRef<View>(null);

  const dogQ = useQuery({
    queryKey: ["dog", dogId],
    queryFn: () => fetchDog(dogId!),
    enabled: !!dogId,
  });
  const sightingsQ = useQuery({
    queryKey: ["dog-sightings", dogId],
    queryFn: () => fetchDogSightings(dogId!),
    enabled: !!dogId,
  });

  if (dogQ.isLoading || !dogQ.data) {
    return <Screen><ActivityIndicator style={{ flex: 1 }} /></Screen>;
  }
  const dog = dogQ.data;
  const heroSighting = (sightingsQ.data ?? [])[0];

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.h1}>Share card</Text>
        <Text style={styles.body}>Square 1080×1080 image — drops into Instagram Stories, LINE, WhatsApp.</Text>

        <View style={styles.cardWrap}>
          <DogShareCard
            ref={cardRef}
            dog={dog}
            districtName={(dog as { district?: { name?: string } | null }).district?.name ?? null}
            heroPhotoUrl={heroSighting?.photo_url ?? null}
          />
        </View>

        <View style={styles.actions}>
          <Button
            label="Share"
            onPress={() => captureAndShareCard(cardRef as React.RefObject<View>, `${dog.name} stat card`)}
          />
          <Button
            label="Save to camera roll"
            variant="secondary"
            onPress={() => captureAndSaveCard(cardRef as React.RefObject<View>)}
          />
          <Button label="Cancel" variant="ghost" onPress={() => router.back()} />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing(5), gap: spacing(3), alignItems: "center" },
  h1: { ...typography.h1, color: colors.text },
  body: { ...typography.body, color: colors.textDim, textAlign: "center" },
  cardWrap: { marginVertical: spacing(2) },
  actions: { width: "100%", gap: spacing(2), marginTop: spacing(3) },
});
