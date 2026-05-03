// Soi Cats palette: warm, juicy, playful — Fruitopia-style.
// Big rounded shapes, soft shadows, fruit-bowl colours.
// Final brand colour TBD with Jon (BRIEF section 20); this is the dev default.

export const colors = {
  bg:         "#FFF4E6", // warm cream
  surface:    "#FFFFFF",
  surfaceAlt: "#FFE9CF", // peachy chip background
  border:     "#F2DCB8",
  text:       "#2A1A0F", // warm dark brown — never pure black
  textDim:    "#7C6A5A",
  primary:    "#FF8B3D", // mango orange
  primaryDark:"#E66A1A",
  accent:     "#4CB97A", // som tam green
  accentSoft: "#D7F1E1",
  danger:     "#E54C3D", // tomato
  warning:    "#F4C430", // ripe yellow
  success:    "#4CB97A",
};

export const radius = {
  sm:   12,
  md:   18,
  lg:   24,
  xl:   32,
  pill: 999,
};

export const spacing = (n: number) => n * 4;

// Soft, low-opacity shadow for cards and buttons. Use sparingly so the
// app doesn't look like a 2014 Material Design refugee.
export const shadow = {
  card: {
    shadowColor: "#2A1A0F",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  button: {
    shadowColor: "#FF8B3D",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 4,
  },
};

export const typography = {
  h1:    { fontSize: 32, fontWeight: "800" as const, letterSpacing: -0.5 },
  h2:    { fontSize: 22, fontWeight: "700" as const },
  h3:    { fontSize: 18, fontWeight: "700" as const },
  body:  { fontSize: 16, fontWeight: "500" as const },
  small: { fontSize: 13, fontWeight: "500" as const },
  label: { fontSize: 12, fontWeight: "700" as const, letterSpacing: 0.5, textTransform: "uppercase" as const },
};
