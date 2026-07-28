// Single source of truth for the five-stat metadata. Matches the Soi Sunset
// design handoff: stat colours, emoji icons, framing copy.

import { colors } from "@/lib/theme";
import type { StatKey } from "@/lib/api";

export const STAT_META: Record<StatKey, { label: string; icon: string; specialty: string; low: string; high: string }> = {
  bork:  { label: "Bork",  icon: "🗣️", specialty: "MAX BORK",    low: "Silent type",    high: "Voice of the soi" },
  zoom:  { label: "Zoom",  icon: "⚡", specialty: "PEAK ZOOM",    low: "Full nap mode",  high: "Chases scooters" },
  floof: { label: "Floof", icon: "☁️", specialty: "TOTAL FLOOF",  low: "Sleek short",    high: "Cloud in dog form" },
  chill: { label: "Chill", icon: "🧘", specialty: "PURE CHILL",   low: "Hair-trigger",   high: "Buddha of the alley" },
  guard: { label: "Guard", icon: "🛡️", specialty: "BEST GUARD",   low: "Would greet a burglar", high: "Runs the block" },
};

export const STAT_COLORS: Record<StatKey, string> = {
  bork:  colors.pink,      // hot pink #FF477E
  zoom:  colors.accent,    // mango #FFB627
  floof: colors.secondary, // deep teal #0B7A6B
  chill: colors.text,      // charcoal #171A1F
  guard: colors.primary,   // papaya #FF6B35
};
