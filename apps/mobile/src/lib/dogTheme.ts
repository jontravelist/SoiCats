// Pokedex-style colour theming per dog. Soi Sunset typePalettes per the
// design exploration (themes.jsx · TYPE_PALETTES.sunset). Each dog's
// primary_color string maps to a coordinated card palette.

export interface DogPalette {
  bg: string;       // card / hero background
  accent: string;   // banner + bar fills + section labels + DogGlyph stroke
  light: string;    // pale tint for chips and softer surfaces
  text: string;     // primary text colour over `bg`
  textDim: string;  // secondary text over `bg`
}

const PALETTES: Record<string, DogPalette> = {
  brown:  { bg: "#8C5A3A", accent: "#3A1F0A", text: "#FFF8EE", textDim: "#E8D2BD", light: "#C29980" },
  tan:    { bg: "#D9A96A", accent: "#7A4A18", text: "#171A1F", textDim: "#6B4A20", light: "#F0D8B0" },
  black:  { bg: "#2A2A30", accent: "#FF6B35", text: "#FFFFFF", textDim: "#C2C5CB", light: "#4A4A55" },
  white:  { bg: "#FFEDDA", accent: "#0B7A6B", text: "#171A1F", textDim: "#6B5A48", light: "#FFF6E6" },
  cream:  { bg: "#FFE0A6", accent: "#B85C00", text: "#171A1F", textDim: "#7A5A20", light: "#FFF0CC" },
  ginger: { bg: "#FF6B35", accent: "#B8351E", text: "#FFFFFF", textDim: "#FBDDCC", light: "#FFC5A8" },
  grey:   { bg: "#6B8588", accent: "#1F3F42", text: "#FFFFFF", textDim: "#D6E2E4", light: "#B8CCCE" },
  mixed:  { bg: "#0B7A6B", accent: "#FFB627", text: "#FFFFFF", textDim: "#C8E2DD", light: "#5CAEA0" },
};

const DEFAULT: DogPalette = PALETTES.mixed;

export function paletteForDog(primaryColor: string | null | undefined): DogPalette {
  if (!primaryColor) return DEFAULT;
  return PALETTES[primaryColor.toLowerCase()] ?? DEFAULT;
}

// Stable fake "N°042" Pokedex number from the dog's UUID. Mod by 1000 so
// the badge is always three digits (matches the spec from themes.jsx).
export function pokedexNumber(dogId: string): string {
  const tail = dogId.replace(/[^0-9a-f]/gi, "").slice(-3) || "000";
  const n = parseInt(tail, 16) % 1000;
  return n.toString().padStart(3, "0");
}

// Pose index for the DogGlyph illustration — three round-headed poses
// (sit / lie / perk-up). Stable per dog so a given dog always shows the
// same pose.
export function poseForDog(dogId: string): 0 | 1 | 2 {
  const last = dogId.charCodeAt(dogId.length - 1) || 0;
  return (last % 3) as 0 | 1 | 2;
}
