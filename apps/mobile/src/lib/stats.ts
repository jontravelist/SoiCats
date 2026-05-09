// Single source of truth for the five-stat metadata. Matches the Soi Sunset
// design handoff: stat colours, emoji icons, framing copy.

import { colors } from "@/lib/theme";
import type { StatKey } from "@/lib/api";

export const STAT_META: Record<StatKey, { label: string; icon: string; specialty: string; low: string; high: string }> = {
  chonk: { label: "Chonk", icon: "🍙", specialty: "PEAK CHONK",     low: "Lean machine",   high: "Absolute unit" },
  spice: { label: "Spice", icon: "🌶️", specialty: "MAXIMUM SPICE",  low: "Soft soul",      high: "Spicy queen" },
  floof: { label: "Floof", icon: "☁️", specialty: "TOTAL FLOOF",    low: "Sleek",          high: "Cloud cat" },
  slink: { label: "Slink", icon: "🌑", specialty: "PURE SLINK",     low: "Solid presence", high: "Pure shadow" },
  vibes: { label: "Vibes", icon: "🧘", specialty: "BEST VIBES",     low: "Chaos energy",   high: "Buddha cat" },
};

export const STAT_COLORS: Record<StatKey, string> = {
  chonk: colors.accent,    // mango #FFB627
  spice: colors.pink,      // hot pink #FF477E
  floof: colors.secondary, // deep teal #0B7A6B
  slink: colors.text,      // charcoal #171A1F
  vibes: colors.primary,   // papaya #FF6B35
};
