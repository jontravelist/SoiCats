// Soi Cats palette: warm, soi-side, slightly faded.
// Brand colour TBD with Jon — placeholder is mango orange.

export const colors = {
  bg:       "#FFF8EE",
  surface:  "#FFFFFF",
  border:   "#E8DFCC",
  text:     "#1B1B1B",
  textDim:  "#6E6E6E",
  primary:  "#E08A2B", // mango
  primaryDark: "#B86E1C",
  accent:   "#3D8C7A", // som tam green
  danger:   "#C0392B",
  warning:  "#E2A53A",
  success:  "#2E7D5B",
};

export const radius = {
  sm: 6,
  md: 10,
  lg: 16,
  pill: 999,
};

export const spacing = (n: number) => n * 4;

export const typography = {
  h1: { fontSize: 28, fontWeight: "700" as const },
  h2: { fontSize: 20, fontWeight: "600" as const },
  body: { fontSize: 16, fontWeight: "400" as const },
  small: { fontSize: 13, fontWeight: "400" as const },
  label: { fontSize: 12, fontWeight: "500" as const, letterSpacing: 0.4 },
};
