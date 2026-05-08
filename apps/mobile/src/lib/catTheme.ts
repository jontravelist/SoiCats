// Pokedex-style colour theming per cat. Maps the cat's primary_color string
// to a coordinated palette (background, accent, text) so list cards and
// profile cards feel like trading-card-game layouts.

export interface CatPalette {
  bg: string;       // card / hero background
  accent: string;   // banner + bar fills + section labels
  light: string;    // pale tint for chips
  text: string;     // primary text colour over `bg`
  textDim: string;  // secondary text over `bg`
}

const PALETTES: Record<string, CatPalette> = {
  black:  { bg: "#3D3852", accent: "#A78BFF", light: "#5C5478", text: "#FFFFFF", textDim: "#CFC9DD" },
  white:  { bg: "#F4E89A", accent: "#E0A93D", light: "#FFF4C2", text: "#3A2E0A", textDim: "#7A6724" },
  grey:   { bg: "#7E8FA6", accent: "#365787", light: "#A8B6CC", text: "#FFFFFF", textDim: "#E0E7F1" },
  orange: { bg: "#FF8B3D", accent: "#B84A0F", light: "#FFC79A", text: "#3D1F00", textDim: "#7A3D00" },
  ginger: { bg: "#FF8B3D", accent: "#B84A0F", light: "#FFC79A", text: "#3D1F00", textDim: "#7A3D00" },
  brown:  { bg: "#9C6E3F", accent: "#5C3A1A", light: "#C9A576", text: "#FFFFFF", textDim: "#F1DDB6" },
  cream:  { bg: "#F2DCB8", accent: "#B88A3D", light: "#FFEBC9", text: "#3D2A0A", textDim: "#7A5A24" },
  mixed:  { bg: "#5CB89A", accent: "#1F6E4F", light: "#9FE0CC", text: "#FFFFFF", textDim: "#CCEBDF" },
};

const DEFAULT: CatPalette = PALETTES.mixed;

export function paletteForCat(primaryColor: string | null | undefined): CatPalette {
  if (!primaryColor) return DEFAULT;
  return PALETTES[primaryColor.toLowerCase()] ?? DEFAULT;
}

// Stable fake "N°042" Pokedex number from the cat's UUID — last three hex
// chars converted to decimal (0..4095). Looks like Pokedex flavour without
// requiring a sequential discovery_number column.
export function pokedexNumber(catId: string): string {
  const tail = catId.replace(/[^0-9a-f]/gi, "").slice(-3) || "000";
  const n = parseInt(tail, 16);
  return n.toString().padStart(3, "0");
}
