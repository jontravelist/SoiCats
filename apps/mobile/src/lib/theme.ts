// Soi Sunset palette per the design exploration in chat (locked in by Jon).
// Warm tropical: papaya / mango / deep teal on cream, charcoal ink.
//
// Display + body fonts here are placeholders — once we ship a dev build via
// EAS we can load Sigmar/Fredoka/Plus Jakarta Sans via expo-font. Until
// then system bold carries the vibe acceptably.

export const colors = {
  bg:           "#FFF8EE", // soft cream
  bgAlt:        "#FFE2CC", // pink peach
  surface:      "#FFFFFF",
  surfaceAlt:   "#FFEDDA",
  border:       "#F2E4D2",
  text:         "#171A1F", // cool charcoal — not brown, per Jon's note
  textDim:      "#6B7280", // slate gray
  primary:      "#FF6B35", // papaya
  primaryDark:  "#B8351E",
  primaryInk:   "#FFFFFF",
  secondary:    "#0B7A6B", // deep teal
  secondaryDark:"#075044",
  accent:       "#FFB627", // mango
  accentSoft:   "#FFEDDA",
  pink:         "#FF477E",
  danger:       "#D42E2E",
  warning:      "#FFB627",
  success:      "#0B7A6B",
};

export const radius = {
  sm:   12,
  md:   18,
  lg:   22,
  xl:   28,
  pill: 999,
};

export const spacing = (n: number) => n * 4;

// Two-tier shadow stack — sunset uses a subtle bottom offset (like a sticker
// pressed onto cream) plus a softer ambient diffusion.
export const shadow = {
  card: {
    shadowColor: "#171A1F",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  button: {
    shadowColor: "#171A1F",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 4,
  },
};

export const typography = {
  // Sigmar / Fredoka land here once expo-font is wired in a dev build.
  display: { fontSize: 44, fontWeight: "900" as const, letterSpacing: -1 },
  h1:      { fontSize: 28, fontWeight: "800" as const, letterSpacing: -0.5 },
  h2:      { fontSize: 22, fontWeight: "700" as const },
  h3:      { fontSize: 18, fontWeight: "700" as const },
  body:    { fontSize: 16, fontWeight: "500" as const },
  small:   { fontSize: 13, fontWeight: "500" as const },
  label:   { fontSize: 11, fontWeight: "800" as const, letterSpacing: 1.4, textTransform: "uppercase" as const },
};
