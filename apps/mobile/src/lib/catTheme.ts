// Pokedex-style colour theming per cat. Soi Sunset typePalettes per the
// design exploration (themes.jsx · TYPE_PALETTES.sunset). Each cat's
// primary_color string maps to a coordinated card palette.

export interface CatPalette {
  bg: string;       // card / hero background
  accent: string;   // banner + bar fills + section labels + CatGlyph stroke
  light: string;    // pale tint for chips and softer surfaces
  text: string;     // primary text colour over `bg`
  textDim: string;  // secondary text over `bg`
}

const PALETTES: Record<string, CatPalette> = {
  tabby:   { bg: "#FFB627", accent: "#B83C00", text: "#171A1F", textDim: "#6B5018", light: "#FFE0A6" },
  tortie:  { bg: "#B8442A", accent: "#5C1A00", text: "#FFF8EE", textDim: "#F4D8C8", light: "#E89580" },
  calico:  { bg: "#FF8B5C", accent: "#B8351E", text: "#FFFFFF", textDim: "#FBE0CC", light: "#FFD1B8" },
  tuxedo:  { bg: "#171A1F", accent: "#FFB627", text: "#FFFFFF", textDim: "#C2C5CB", light: "#3D3D45" },
  black:   { bg: "#2A2A30", accent: "#FF6B35", text: "#FFFFFF", textDim: "#C2C5CB", light: "#4A4A55" },
  white:   { bg: "#FFEDDA", accent: "#0B7A6B", text: "#171A1F", textDim: "#6B5A48", light: "#FFF6E6" },
  orange:  { bg: "#FF6B35", accent: "#B8351E", text: "#FFFFFF", textDim: "#FBDDCC", light: "#FFC5A8" },
  ginger:  { bg: "#FF6B35", accent: "#B8351E", text: "#FFFFFF", textDim: "#FBDDCC", light: "#FFC5A8" },
  grey:    { bg: "#6B8588", accent: "#1F3F42", text: "#FFFFFF", textDim: "#D6E2E4", light: "#B8CCCE" },
  cream:   { bg: "#FFE0A6", accent: "#B85C00", text: "#171A1F", textDim: "#7A5A20", light: "#FFF0CC" },
  siamese: { bg: "#E8D4B8", accent: "#B85C00", text: "#171A1F", textDim: "#7A6648", light: "#F4E8D2" },
  brown:   { bg: "#8C5A3A", accent: "#3A1F0A", text: "#FFF8EE", textDim: "#E8D2BD", light: "#C29980" },
  mixed:   { bg: "#0B7A6B", accent: "#FFB627", text: "#FFFFFF", textDim: "#C8E2DD", light: "#5CAEA0" },
};

const DEFAULT: CatPalette = PALETTES.mixed;

export function paletteForCat(primaryColor: string | null | undefined): CatPalette {
  if (!primaryColor) return DEFAULT;
  return PALETTES[primaryColor.toLowerCase()] ?? DEFAULT;
}

// Stable fake "N°042" Pokedex number from the cat's UUID. Mod by 1000 so
// the badge is always three digits (matches the spec from themes.jsx).
export function pokedexNumber(catId: string): string {
  const tail = catId.replace(/[^0-9a-f]/gi, "").slice(-3) || "000";
  const n = parseInt(tail, 16) % 1000;
  return n.toString().padStart(3, "0");
}

// Pose index for the CatGlyph illustration — three round-headed
// emoji-style poses (sit / loaf / peek). Stable per cat so a given cat
// always shows the same pose.
export function poseForCat(catId: string): 0 | 1 | 2 {
  const last = catId.charCodeAt(catId.length - 1) || 0;
  return (last % 3) as 0 | 1 | 2;
}
