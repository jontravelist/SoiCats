import * as ImageManipulator from "expo-image-manipulator";
import { File } from "expo-file-system";
import { supabase } from "@/lib/supabase";

const MAX_EDGE = 2048;

// Resize a freshly captured photo to a max edge of 2048px and strip EXIF.
// Returns the local URI of the processed image.
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
//
// Reading via fetch+blob silently uploads zero bytes in React Native, so we
// read the file as raw bytes via the new expo-file-system File API and hand
// the Uint8Array directly to supabase-storage.
export async function uploadSightingPhoto(localUri: string, userId: string): Promise<string> {
  const filename = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;

  const file = new File(localUri);
  const bytes = file.bytes();

  const { error } = await supabase.storage
    .from("sighting-photos")
    .upload(filename, bytes, { contentType: "image/jpeg", cacheControl: "31536000" });
  if (error) throw error;

  const { data } = supabase.storage.from("sighting-photos").getPublicUrl(filename);
  return data.publicUrl;
}
