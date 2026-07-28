import Svg, { Circle, Ellipse, G, Path } from "react-native-svg";

interface Props {
  color: string;
  secondary?: string;
  size?: number;
  pose?: 0 | 1 | 2;
}

// Cute round-headed cartoon soi dog. Three poses:
//   0 · sit — full body, wagging tail, alert floppy ears
//   1 · lie — flopped over, sleepy closed eyes, ears splayed
//   2 · perk — head only, head-tilt curiosity, tongue peeking
//
// Distinctive dog features baked in:
//   - floppy droopy ears
//   - long muzzle stub with a chunky black nose
//   - pink tongue in poses 0 + 2 (dogs pant)
//   - longer swooping tail
//   - no whiskers
export function DogGlyph({ color, secondary = "rgba(0,0,0,0.6)", size = 80, pose = 0 }: Props) {
  const eye = secondary;
  const shine = "rgba(255,255,255,0.92)";
  const tongue = "#FF6B85";

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      {pose === 0 ? (
        <G>
          {/* wagging tail — swoops up and back over the body */}
          <Path d="M84 74 Q100 60 92 44 Q86 54 82 62 Z" fill={color} />
          {/* sitting body — narrower shoulders, wider haunches */}
          <Ellipse cx="50" cy="76" rx="34" ry="20" fill={color} />
          {/* front paws */}
          <Ellipse cx="38" cy="94" rx="8" ry="4" fill={color} />
          <Ellipse cx="62" cy="94" rx="8" ry="4" fill={color} />
          {/* head — round */}
          <Circle cx="50" cy="42" r="32" fill={color} />
          {/* floppy ears — droop down past cheekline */}
          <Path d="M20 32 Q14 12 30 20 Q34 40 30 54 Q22 52 20 32 Z" fill={color} />
          <Path d="M80 32 Q86 12 70 20 Q66 40 70 54 Q78 52 80 32 Z" fill={color} />
          {/* inner ear shadow */}
          <Path d="M24 32 Q22 20 28 24 Q30 40 26 48 Z" fill={eye} opacity={0.28} />
          <Path d="M76 32 Q78 20 72 24 Q70 40 74 48 Z" fill={eye} opacity={0.28} />
          {/* eyes */}
          <Circle cx="38" cy="40" r="4.6" fill={eye} />
          <Circle cx="62" cy="40" r="4.6" fill={eye} />
          <Circle cx="39.5" cy="38.5" r="1.6" fill={shine} />
          <Circle cx="63.5" cy="38.5" r="1.6" fill={shine} />
          {/* eyebrow spots (giving-a-look energy) */}
          <Ellipse cx="34" cy="32" rx="4" ry="2" fill={eye} opacity={0.35} />
          <Ellipse cx="66" cy="32" rx="4" ry="2" fill={eye} opacity={0.35} />
          {/* muzzle — soft rounded pad */}
          <Ellipse cx="50" cy="56" rx="14" ry="10" fill="#FFFFFF" opacity={0.35} />
          {/* nose — chunky black */}
          <Ellipse cx="50" cy="52" rx="5.5" ry="4" fill={eye} />
          <Ellipse cx="48.5" cy="51" rx="1.4" ry="1" fill={shine} opacity={0.9} />
          {/* mouth split down + smile */}
          <Path d="M50 56 L50 62" stroke={eye} strokeWidth={1.6} strokeLinecap="round" />
          <Path d="M50 62 Q44 66 40 63 M50 62 Q56 66 60 63" fill="none" stroke={eye} strokeWidth={1.9} strokeLinecap="round" />
          {/* tongue peeking */}
          <Path d="M46 63 Q50 70 54 63 Q54 66 50 66 Q46 66 46 63 Z" fill={tongue} />
        </G>
      ) : pose === 1 ? (
        <G>
          {/* long horizontal lying body — sausage shape */}
          <Path d="M6 78 Q6 58 22 56 Q34 54 50 56 Q78 56 92 66 Q98 74 92 82 Q80 92 40 92 Q10 92 6 78 Z" fill={color} />
          {/* head resting on the ground, slightly right */}
          <Circle cx="72" cy="66" r="22" fill={color} />
          {/* floppy ears splayed on the ground */}
          <Path d="M56 62 Q42 66 44 82 Q54 80 60 74 Z" fill={color} />
          <Path d="M88 62 Q100 66 96 80 Q86 78 82 72 Z" fill={color} />
          <Path d="M58 66 Q50 68 52 78 Q58 76 60 72 Z" fill={eye} opacity={0.28} />
          {/* tail curled at the other end */}
          <Path d="M10 74 Q0 62 8 54 Q14 64 16 72 Z" fill={color} />
          {/* sleepy closed-arc eyes */}
          <Path d="M62 64 Q66 68 70 64" fill="none" stroke={eye} strokeWidth={2.4} strokeLinecap="round" />
          <Path d="M76 64 Q80 68 84 64" fill="none" stroke={eye} strokeWidth={2.4} strokeLinecap="round" />
          {/* muzzle pad */}
          <Ellipse cx="72" cy="74" rx="10" ry="7" fill="#FFFFFF" opacity={0.32} />
          {/* nose */}
          <Ellipse cx="72" cy="72" rx="3.8" ry="2.8" fill={eye} />
          {/* mouth — small content curl */}
          <Path d="M72 75 Q70 78 68 76" fill="none" stroke={eye} strokeWidth={1.6} strokeLinecap="round" />
          {/* zzz */}
          <Path d="M28 40 L38 40 L28 50 L38 50" fill="none" stroke={eye} strokeWidth={1.8} strokeLinecap="round" opacity={0.6} />
        </G>
      ) : (
        <G>
          {/* head fills frame — slightly larger */}
          <Circle cx="50" cy="52" r="40" fill={color} />
          {/* head-tilt floppy ears — one longer than the other */}
          <Path d="M14 40 Q6 14 28 26 Q34 48 30 62 Q18 58 14 40 Z" fill={color} />
          <Path d="M86 40 Q92 20 74 28 Q68 48 72 60 Q82 56 86 40 Z" fill={color} />
          <Path d="M20 40 Q16 24 24 30 Q28 46 24 56 Z" fill={eye} opacity={0.28} />
          <Path d="M80 40 Q82 24 76 30 Q74 46 78 56 Z" fill={eye} opacity={0.28} />
          {/* big curious eyes */}
          <Circle cx="36" cy="50" r="5.6" fill={eye} />
          <Circle cx="64" cy="50" r="5.6" fill={eye} />
          <Circle cx="38" cy="48" r="2" fill={shine} />
          <Circle cx="66" cy="48" r="2" fill={shine} />
          {/* eyebrow spot on one side (head tilt = quizzical) */}
          <Ellipse cx="32" cy="40" rx="4.5" ry="2.4" fill={eye} opacity={0.35} />
          <Ellipse cx="68" cy="40" rx="4.5" ry="2.4" fill={eye} opacity={0.35} />
          {/* muzzle pad */}
          <Ellipse cx="50" cy="66" rx="16" ry="12" fill="#FFFFFF" opacity={0.32} />
          {/* nose */}
          <Ellipse cx="50" cy="62" rx="6" ry="4.5" fill={eye} />
          <Ellipse cx="48.5" cy="60.5" rx="1.6" ry="1.1" fill={shine} opacity={0.9} />
          {/* mouth split + smile */}
          <Path d="M50 66 L50 72" stroke={eye} strokeWidth={1.8} strokeLinecap="round" />
          <Path d="M50 72 Q44 76 40 73 M50 72 Q56 76 60 73" fill="none" stroke={eye} strokeWidth={2} strokeLinecap="round" />
          {/* tongue lolling */}
          <Path d="M46 73 Q50 82 54 73 Q54 78 50 78 Q46 78 46 73 Z" fill={tongue} />
        </G>
      )}
    </Svg>
  );
}
