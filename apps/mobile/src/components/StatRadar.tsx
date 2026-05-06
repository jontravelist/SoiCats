import Svg, { Circle, Line, Polygon, Text as SvgText } from "react-native-svg";
import { View } from "react-native";
import { colors } from "@/lib/theme";
import type { StatKey } from "@/lib/api";

const STATS: { key: StatKey; label: string }[] = [
  { key: "chonk", label: "Chonk" },
  { key: "spice", label: "Spice" },
  { key: "floof", label: "Floof" },
  { key: "slink", label: "Slink" },
  { key: "vibes", label: "Vibes" },
];

interface Props {
  size?: number;
  values: Partial<Record<StatKey, number | null>>;  // 1..5 expected
  strokeColor?: string;
  fillColor?: string;
}

// Hand-rolled radar chart for the five cat stats. Five axes evenly spaced;
// rings at 1..5 for reference; shaded polygon from the values.
export function StatRadar({ size = 240, values, strokeColor, fillColor }: Props) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 28;
  const stroke = strokeColor ?? colors.primary;
  const fill = fillColor ?? colors.primary;

  // Convert (axis index, score 1..5) to (x, y).
  const point = (i: number, score: number) => {
    const angle = (-Math.PI / 2) + (i * 2 * Math.PI) / STATS.length;
    const dist = (score / 5) * r;
    return { x: cx + dist * Math.cos(angle), y: cy + dist * Math.sin(angle) };
  };

  const polygonPoints = STATS.map((s, i) => {
    const v = values[s.key];
    const score = v == null ? 0 : v;
    const p = point(i, score);
    return `${p.x},${p.y}`;
  }).join(" ");

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        {/* Reference rings 1..5 */}
        {[1, 2, 3, 4, 5].map((step) => (
          <Circle
            key={step}
            cx={cx}
            cy={cy}
            r={(step / 5) * r}
            stroke={colors.border}
            strokeWidth={1}
            fill="none"
          />
        ))}

        {/* Axes + labels */}
        {STATS.map((s, i) => {
          const tip = point(i, 5);
          const labelP = point(i, 5.55);
          return (
            <>
              <Line
                key={`axis-${s.key}`}
                x1={cx}
                y1={cy}
                x2={tip.x}
                y2={tip.y}
                stroke={colors.border}
                strokeWidth={1}
              />
              <SvgText
                key={`label-${s.key}`}
                x={labelP.x}
                y={labelP.y}
                fontSize={11}
                fontWeight="700"
                fill={colors.textDim}
                textAnchor="middle"
                alignmentBaseline="middle"
              >
                {s.label}
              </SvgText>
            </>
          );
        })}

        {/* Data polygon */}
        <Polygon
          points={polygonPoints}
          stroke={stroke}
          strokeWidth={2}
          fill={fill}
          fillOpacity={0.25}
        />
      </Svg>
    </View>
  );
}
