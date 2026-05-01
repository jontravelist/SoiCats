import * as ImageManipulator from "expo-image-manipulator";
import { supabase } from "@/lib/supabase";

const MAX_EDGE = 2048;

// Resize a freshly captured photo to a max edge of 2048px and strip EXIF.
// Returns the local URI of the processed image and its size in bytes.
export async function preparePhoto(uri: string): Promise<{ uri: string }> {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: MAX_EDGE } }],
    {
      compress: 0.85,
      format: ImageManipulator.SaveFormat.JPEG,
      // expo-image-manipulator strips EXIF when re-encoding to JPEG.
    },
  );
  return { uri: result.uri };
}

// Upload a prepared photo to the sighting-photos bucket. Returns the public URL.
// Path convention: <userId>/<timestamp>-<random>.jpg — required by storage RLS.
export async function uploadSightingPhoto(localUri: string, userId: string): Promise<string> {
  const filename = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
  const res = await fetch(localUri);
  const blob = await res.blob();

  const { error } = await supabase.storage
    .from("sighting-photos")
    .upload(filename, blob, { contentType: "image/jpeg", cacheControl: "31536000" });
  if (error) throw error;

  const { data } = supabase.storage.from("sighting-photos").getPublicUrl(filename);
  return data.publicUrl;
}
