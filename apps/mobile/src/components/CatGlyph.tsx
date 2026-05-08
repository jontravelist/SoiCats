import Svg, { Circle, Ellipse, G, Path } from "react-native-svg";

interface Props {
  color: string;
  secondary?: string;
  size?: number;
  pose?: 0 | 1 | 2;
}

// Cute round-headed emoji-style cat illustration. Three poses:
//   0 · sit / chonk — full body, fills the frame
//   1 · loaf — bread-shape, sleepy closed-arc eyes
//   2 · peek — head only, wide curious eyes
//
// Lifted (and translated to react-native-svg) from the design exploration
// in chats/chat1.md. Replaces the 🐈 emoji placeholders in PokedexCard,
// CatShareCard, and elsewhere — gives each cat a friendly mascot tied to
// their type palette.
export function CatGlyph({ color, secondary = "rgba(0,0,0,0.55)", size = 80, pose = 0 }: Props) {
  const eye = secondary;
  const shine = "rgba(255,255,255,0.92)";

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      {pose === 0 ? (
        <G>
          {/* sitting body */}
          <Ellipse cx="50" cy="74" rx="36" ry="22" fill={color} />
          {/* paws */}
          <Ellipse cx="35" cy="92" rx="9" ry="5" fill={color} />
          <Ellipse cx="65" cy="92" rx="9" ry="5" fill={color} />
          {/* tail flick */}
          <Path d="M82 78 Q96 70 92 54 Q88 62 84 68 Z" fill={color} />
          {/* head */}
          <Circle cx="50" cy="44" r="34" fill={color} />
          {/* outer ears */}
          <Path d="M22 24 Q18 4 38 16 Q40 22 36 32 Z" fill={color} />
          <Path d="M78 24 Q82 4 62 16 Q60 22 64 32 Z" fill={color} />
          {/* inner ears */}
          <Path d="M27 22 Q26 12 34 18 Q36 24 33 30 Z" fill={eye} opacity={0.4} />
          <Path d="M73 22 Q74 12 66 18 Q64 24 67 30 Z" fill={eye} opacity={0.4} />
          {/* eyes + shine */}
          <Ellipse cx="38" cy="44" rx="5" ry="6" fill={eye} />
          <Ellipse cx="62" cy="44" rx="5" ry="6" fill={eye} />
          <Circle cx="40" cy="42" r="1.8" fill={shine} />
          <Circle cx="64" cy="42" r="1.8" fill={shine} />
          {/* blush */}
          <Ellipse cx="28" cy="54" rx="5" ry="2.6" fill={eye} opacity={0.18} />
          <Ellipse cx="72" cy="54" rx="5" ry="2.6" fill={eye} opacity={0.18} />
          {/* nose */}
          <Path d="M46 56 L54 56 L50 60 Z" fill={eye} />
          {/* smile */}
          <Path d="M50 60 Q46 65 42 62 M50 60 Q54 65 58 62" fill="none" stroke={eye} strokeWidth={2} strokeLinecap="round" />
          {/* whiskers */}
          <Path d="M14 50 L34 52 M14 56 L34 56" stroke={eye} strokeWidth={1} strokeLinecap="round" opacity={0.6} />
          <Path d="M86 50 L66 52 M86 56 L66 56" stroke={eye} strokeWidth={1} strokeLinecap="round" opacity={0.6} />
        </G>
      ) : pose === 1 ? (
        <G>
          {/* loaf */}
          <Path d="M6 92 Q6 38 50 38 Q94 38 94 92 Q94 98 50 98 Q6 98 6 92 Z" fill={color} />
          {/* ears */}
          <Path d="M22 41 Q18 22 38 32 Q40 36 38 44 Z" fill={color} />
          <Path d="M78 41 Q82 22 62 32 Q60 36 62 44 Z" fill={color} />
          <Path d="M27 39 Q26 28 34 33 Q36 38 33 42 Z" fill={eye} opacity={0.4} />
          <Path d="M73 39 Q74 28 66 33 Q64 38 67 42 Z" fill={eye} opacity={0.4} />
          {/* sleepy closed-arc eyes */}
          <Path d="M30 60 Q38 68 46 60" fill="none" stroke={eye} strokeWidth={3} strokeLinecap="round" />
          <Path d="M54 60 Q62 68 70 60" fill="none" stroke={eye} strokeWidth={3} strokeLinecap="round" />
          {/* blush */}
          <Ellipse cx="22" cy="72" rx="6" ry="3" fill={eye} opacity={0.18} />
          <Ellipse cx="78" cy="72" rx="6" ry="3" fill={eye} opacity={0.18} />
          {/* nose + smile */}
          <Path d="M46 70 L54 70 L50 74 Z" fill={eye} />
          <Path d="M50 74 Q46 78 42.5 76 M50 74 Q54 78 57.5 76" fill="none" stroke={eye} strokeWidth={1.7} strokeLinecap="round" />
          {/* whiskers */}
          <Path d="M14 68 L32 70 M14 74 L32 74" stroke={eye} strokeWidth={1} strokeLinecap="round" opacity={0.55} />
          <Path d="M86 68 L68 70 M86 74 L68 74" stroke={eye} strokeWidth={1} strokeLinecap="round" opacity={0.55} />
        </G>
      ) : (
        <G>
          {/* head fills frame */}
          <Circle cx="50" cy="54" r="42" fill={color} />
          {/* ears */}
          <Path d="M16 28 Q12 6 36 20 Q40 28 38 38 Z" fill={color} />
          <Path d="M84 28 Q88 6 64 20 Q60 28 62 38 Z" fill={color} />
          <Path d="M22 26 Q22 12 32 22 Q34 30 30 36 Z" fill={eye} opacity={0.4} />
          <Path d="M78 26 Q78 12 68 22 Q66 30 70 36 Z" fill={eye} opacity={0.4} />
          {/* big curious eyes */}
          <Ellipse cx="36" cy="54" rx="6" ry="7" fill={eye} />
          <Ellipse cx="64" cy="54" rx="6" ry="7" fill={eye} />
          <Circle cx="38.5" cy="51.5" r="2.2" fill={shine} />
          <Circle cx="66.5" cy="51.5" r="2.2" fill={shine} />
          {/* blush */}
          <Ellipse cx="22" cy="66" rx="6" ry="3" fill={eye} opacity={0.18} />
          <Ellipse cx="78" cy="66" rx="6" ry="3" fill={eye} opacity={0.18} />
          {/* nose */}
          <Path d="M45 66 L55 66 L50 71 Z" fill={eye} />
          {/* smile */}
          <Path d="M50 71 Q45 76 41 73 M50 71 Q55 76 59 73" fill="none" stroke={eye} strokeWidth={2} strokeLinecap="round" />
          {/* whiskers */}
          <Path d="M8 62 L30 64 M8 68 L30 68" stroke={eye} strokeWidth={1.1} strokeLinecap="round" opacity={0.6} />
          <Path d="M92 62 L70 64 M92 68 L70 68" stroke={eye} strokeWidth={1.1} strokeLinecap="round" opacity={0.6} />
        </G>
      )}
    </Svg>
  );
}
