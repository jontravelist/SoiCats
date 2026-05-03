import * as ImageManipulator from "expo-image-manipulator";
import { File } from "expo-file-system";
import { supabase } from "@/lib/supabase";

const AVATAR_EDGE = 512;

// Resize a profile photo to a square 512px max edge, JPEG.
// Strips EXIF (we don't want a user's home GPS leaking via their avatar).
export async function prepareAvatar(uri: string): Promise<{ uri: string }> {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: AVATAR_EDGE, height: AVATAR_EDGE } }],
    { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG },
  );
  return { uri: result.uri };
}

// Upload to the avatars bucket under <userId>/avatar.jpg. Always overwrites the
// previous avatar to keep storage cheap. Returns a cache-busted public URL.
export async function uploadAvatar(localUri: string, userId: string): Promise<string> {
  const path = `${userId}/avatar.jpg`;

  const file = new File(localUri);
  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);

  const { error } = await supabase.storage
    .from("avatars")
    .upload(path, bytes, {
      contentType: "image/jpeg",
      cacheControl: "0",
      upsert: true,
    });
  if (error) throw error;

  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  // Cache buster — same path means expo-image would otherwise show the old image.
  return `${data.publicUrl}?t=${Date.now()}`;
}
