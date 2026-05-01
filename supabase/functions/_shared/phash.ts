// Tiny perceptual hash: 8x8 average-hash on a downsampled greyscale image.
// 64-bit hash returned as 16-char hex. Comparison via Hamming distance.
//
// We accept a JPEG/PNG byte array. For an MVP this is "good enough":
// - resize to 8x8 nearest-neighbour
// - greyscale via 0.299R + 0.587G + 0.114B
// - hash bit per pixel: 1 if pixel >= mean.
//
// We use the standards-compliant `Image` from `imagescript` because Deno does
// not ship a built-in image decoder.

import { decode } from "https://deno.land/x/imagescript@1.2.17/mod.ts";

export async function pHash(bytes: Uint8Array): Promise<string> {
  const img = await decode(bytes);
  // imagescript's resize uses bicubic by default — that's fine for a hash.
  const small = img.resize(8, 8);

  const greys: number[] = new Array(64);
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      const px = small.getPixelAt(x + 1, y + 1); // 1-indexed
      const r = (px >> 24) & 0xff;
      const g = (px >> 16) & 0xff;
      const b = (px >> 8)  & 0xff;
      greys[y * 8 + x] = 0.299 * r + 0.587 * g + 0.114 * b;
    }
  }
  const mean = greys.reduce((a, v) => a + v, 0) / greys.length;

  let hex = "";
  for (let nibble = 0; nibble < 16; nibble++) {
    let v = 0;
    for (let b = 0; b < 4; b++) {
      const i = nibble * 4 + b;
      if (greys[i] >= mean) v |= 1 << (3 - b);
    }
    hex += v.toString(16);
  }
  return hex;
}

export function hammingHex(a: string, b: string): number {
  if (a.length !== b.length) return Number.MAX_SAFE_INTEGER;
  let dist = 0;
  for (let i = 0; i < a.length; i++) {
    let xor = parseInt(a[i], 16) ^ parseInt(b[i], 16);
    while (xor) {
      dist += xor & 1;
      xor >>= 1;
    }
  }
  return dist;
}
