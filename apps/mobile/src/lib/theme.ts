// เติมแมว palette: Fruitopia-inspired.
// Pale mint canvas, white cards with a soft shadow, dark forest-green text,
// chunky leaf-green CTAs, bold blue secondary, mango orange as the
// cat-mascot accent. All shapes are extra rounded.

export const colors = {
  bg:           "#D7EFE8", // pale mint
  surface:      "#FFFFFF",
  surfaceAlt:   "#C8E5DD", // slightly deeper mint, for chip backgrounds
  border:       "#B8D9CF",
  text:         "#1F4D3F", // dark forest green
  textDim:      "#5A8377",
  primary:      "#5CB85C", // leaf green — main CTA
  primaryDark:  "#4A9A4A",
  secondary:    "#3D6BD6", // bold blue — secondary CTA
  secondaryDark:"#2E5BC6",
  accent:       "#FF8B3D", // mango orange — used sparingly for cat-themed accents
  accentSoft:   "#FFE0CC",
  danger:       "#E54C3D",
  warning:      "#F4C430",
  success:      "#5CB85C",
};

export const radius = {
  sm:   12,
  md:   18,
  lg:   24,
  xl:   32,
  pill: 999,
};

export const spacing = (n: number) => n * 4;

// Soft, low-opacity drop shadows. Cards are airy; nothing heavy.
export const shadow = {
  card: {
    shadowColor: "#1F4D3F",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 16,
    elevation: 4,
  },
  button: {
    shadowColor: "#1F4D3F",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 4,
  },
};

export const typography = {
  // Slightly heavier headline weight gives a Fruitopia-style chunky feel
  // without needing a custom font file.
  display: { fontSize: 44, fontWeight: "900" as const, letterSpacing: -1 },
  h1:      { fontSize: 28, fontWeight: "800" as const, letterSpacing: -0.5 },
  h2:      { fontSize: 22, fontWeight: "700" as const },
  h3:      { fontSize: 18, fontWeight: "700" as const },
  body:    { fontSize: 16, fontWeight: "500" as const },
  small:   { fontSize: 13, fontWeight: "500" as const },
  label:   { fontSize: 12, fontWeight: "700" as const, letterSpacing: 0.5, textTransform: "uppercase" as const },
};
