import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { G, Line, Path, Text as SvgText } from 'react-native-svg';
import { AppText, Card } from '@/components/ui';
import { formatPaceMinPerKm } from '@/components/workout/completed/completedOverviewPresentation';
import { SpringaColors } from '@/theme/colors';
import { Radius, Spacing } from '@/theme/tokens';

const TIME_WINDOWS = [
  { label: '1m', value: '30d' },
  { label: '3m', value: '90d' },
  { label: '6m', value: '180d' },
  { label: '1y', value: '1y' },
  { label: 'All', value: 'all' },
] as const;

type Props = {
  curve: { distance: number; pace: number }[];
  timeWindow: string;
  onTimeWindowChange: (window: string) => void;
};

function formatPace(paceMinPerKm: number): string {
  return formatPaceMinPerKm(paceMinPerKm);
}

export function PaceCurvesChart({
  curve: rawCurve,
  timeWindow,
  onTimeWindowChange,
}: Props) {
  const curve = (rawCurve || []).filter((p) => p.distance >= 1000);

  const width = 320;
  const height = 160;
  const padding = { top: 15, right: 15, bottom: 25, left: 40 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const minDist = 1000;
  const maxDist =
    curve.length > 0 ? Math.max(5000, curve[curve.length - 1].distance) : 10000;

  // Y-axis: inverted (faster / lower pace at top)
  const yMin = 3.5;
  const yMax = 8.0;

  const scaleX = (d: number) =>
    padding.left + ((d - minDist) / (maxDist - minDist)) * chartWidth;

  const scaleY = (p: number) =>
    padding.top + ((p - yMin) / (yMax - yMin)) * chartHeight;

  const pathD =
    curve.length > 0
      ? curve
          .map(
            (pt, i) =>
              `${i === 0 ? 'M' : 'L'} ${scaleX(pt.distance)} ${scaleY(pt.pace)}`,
          )
          .join(' ')
      : '';

  const yTicks = [4.0, 5.0, 6.0, 7.0];
  const maxKm = Math.floor(maxDist / 1000);
  const xStep = maxKm > 10 ? 5 : 2;
  const xTicks: number[] = [];
  for (let km = 1; km <= maxKm; km += xStep) {
    xTicks.push(km * 1000);
  }

  return (
    <Card tone="default">
      <View style={styles.header}>
        <AppText variant="subheading">Pace Curve</AppText>
        <View style={styles.windowChips}>
          {TIME_WINDOWS.map((tw) => {
            const isSelected =
              timeWindow === tw.value ||
              (tw.value === 'all' && timeWindow === 'all');
            return (
              <Pressable
                key={tw.value}
                accessibilityRole="button"
                accessibilityLabel={`Time window ${tw.label}`}
                accessibilityState={{ selected: isSelected }}
                hitSlop={8}
                onPress={() => onTimeWindowChange(tw.value)}
                style={[
                  styles.chip,
                  isSelected && { backgroundColor: SpringaColors.brand },
                ]}
              >
                <AppText
                  variant="caption"
                  style={[
                    styles.chipText,
                    isSelected && { color: SpringaColors.text, fontWeight: '700' },
                  ]}
                >
                  {tw.label}
                </AppText>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.chartContainer}>
        <Svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Y grid lines and labels */}
          {yTicks.map((p) => {
            const y = scaleY(p);
            return (
              <G key={`y-${p}`}>
                <Line
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  stroke={SpringaColors.border}
                  strokeWidth={1}
                />
                <SvgText
                  x={padding.left - 6}
                  y={y + 4}
                  fill={SpringaColors.muted}
                  fontSize={10}
                  textAnchor="end"
                >
                  {formatPace(p)}
                </SvgText>
              </G>
            );
          })}

          {/* X grid labels */}
          {xTicks.map((d) => {
            const x = scaleX(d);
            const km = d / 1000;
            return (
              <SvgText
                key={`x-${d}`}
                x={x}
                y={height - 6}
                fill={SpringaColors.muted}
                fontSize={10}
                textAnchor="middle"
              >
                {km}k
              </SvgText>
            );
          })}

          {/* Curve */}
          {pathD ? (
            <Path
              d={pathD}
              fill="none"
              stroke={SpringaColors.chartPrimary}
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : null}
        </Svg>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  windowChips: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  chip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: Radius.pill,
    backgroundColor: SpringaColors.surfaceAlt,
  },
  chipText: {
    color: SpringaColors.muted,
  },
  chartContainer: {
    alignItems: 'center',
  },
});
