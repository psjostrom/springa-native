import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, G, Line, Path, Text as SvgText } from 'react-native-svg';
import { AppText, Card } from '@/components/ui';
import { formatPaceMinPerKm } from '@/components/workout/completed/completedOverviewPresentation';
import { SpringaColors } from '@/theme/colors';
import { Spacing } from '@/theme/tokens';

export const PACE_TIME_WINDOWS = [
  { label: '1m', value: '30d' },
  { label: '3m', value: '90d' },
  { label: '6m', value: '180d' },
  { label: '1y', value: '1y' },
  { label: 'All', value: 'all' },
] as const;

type Props = {
  curve: { distance: number; pace: number }[];
  onScrubbingChange?: (isScrubbing: boolean) => void;
};

function formatPace(paceMinPerKm: number): string {
  return formatPaceMinPerKm(paceMinPerKm);
}

function formatDistance(distM: number): string {
  if (distM < 1000) return `${Math.round(distM)}m`;
  const km = distM / 1000;
  return `${km >= 10 ? km.toFixed(0) : km.toFixed(1)} km`;
}

export function PaceCurvesChart({
  curve: rawCurve,
  onScrubbingChange,
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
  let yMin = 3.5;
  let yMax = 8.0;

  if (curve.length > 0) {
    const paces = curve.map((c) => c.pace);
    const minPace = Math.min(...paces);
    const maxPace = Math.max(...paces);
    if (minPace === maxPace) {
      yMin = Math.max(2.0, minPace - 0.5);
      yMax = Math.max(yMin + 1.0, minPace + 0.5);
    } else {
      const paddingY = Math.max(0.2, (maxPace - minPace) * 0.15);
      yMin = Math.max(2.0, minPace - paddingY);
      yMax = Math.max(yMin + 0.5, maxPace + paddingY);
    }
  }

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

  const yTicks: number[] = [];
  const minTick = Math.ceil(yMin);
  const maxTick = Math.floor(yMax);
  const tickStep = maxTick - minTick > 5 ? 2 : 1;
  for (let t = minTick; t <= maxTick; t += tickStep) {
    yTicks.push(t);
  }
  if (yTicks.length === 0) {
    yTicks.push(Number(yMin.toFixed(1)), Number(yMax.toFixed(1)));
  }
  const maxKm = Math.floor(maxDist / 1000);
  const xStep = maxKm > 10 ? 5 : 2;
  const xTicks: number[] = [];
  for (let km = 1; km <= maxKm; km += xStep) {
    xTicks.push(km * 1000);
  }

  const [scrubIdx, setScrubIdx] = useState<number | null>(null);
  const [containerWidth, setContainerWidth] = useState<number>(width);

  const handleTouch = (locationX: number) => {
    if (curve.length === 0 || containerWidth <= 0) return;
    const svgX = (locationX / containerWidth) * width;
    const frac = Math.min(1, Math.max(0, (svgX - padding.left) / chartWidth));
    const targetDist = minDist + frac * (maxDist - minDist);

    let bestIdx = 0;
    let bestDiff = Infinity;
    for (let i = 0; i < curve.length; i++) {
      const diff = Math.abs(curve[i].distance - targetDist);
      if (diff < bestDiff) {
        bestDiff = diff;
        bestIdx = i;
      }
    }
    setScrubIdx(bestIdx);
  };

  const activePoint =
    scrubIdx !== null && curve[scrubIdx] ? curve[scrubIdx] : null;

  const paces = curve.map((c) => c.pace);
  const minPace = paces.length > 0 ? Math.min(...paces) : null;

  return (
    <Card tone="default">
      <View style={styles.header}>
        <View style={styles.metricSummary}>
          <View style={styles.primaryMetricRow}>
            <AppText variant="heading" style={styles.primaryValue}>
              {activePoint
                ? `${formatPace(activePoint.pace)}/km`
                : minPace != null
                  ? `${formatPace(minPace)}/km`
                  : 'Pace Curve'}
            </AppText>
            <AppText variant="caption" tone="muted" style={styles.metricName}>
              {activePoint ? 'Pace' : 'Best Pace'}
            </AppText>
          </View>
          <AppText variant="caption" tone="muted" style={styles.subMetricText}>
            {activePoint
              ? `${formatDistance(activePoint.distance)} • Inspected`
              : `${formatDistance(minDist)} – ${formatDistance(maxDist)} curve`}
          </AppText>
        </View>
      </View>

      <View
        style={styles.chartContainer}
        onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderTerminationRequest={() => false}
        onResponderGrant={(e) => {
          onScrubbingChange?.(true);
          handleTouch(e.nativeEvent.locationX);
        }}
        onResponderMove={(e) => handleTouch(e.nativeEvent.locationX)}
        onResponderRelease={() => {
          setScrubIdx(null);
          onScrubbingChange?.(false);
        }}
        onResponderTerminate={() => {
          setScrubIdx(null);
          onScrubbingChange?.(false);
        }}
      >
        <Svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
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

          {/* Active scrub crosshair & indicator */}
          {activePoint ? (
            <G>
              <Line
                x1={scaleX(activePoint.distance)}
                y1={padding.top}
                x2={scaleX(activePoint.distance)}
                y2={height - padding.bottom}
                stroke={SpringaColors.muted}
                strokeWidth={1}
                strokeDasharray="4 2"
                opacity={0.6}
              />
              <Circle
                cx={scaleX(activePoint.distance)}
                cy={scaleY(activePoint.pace)}
                r={5}
                fill={SpringaColors.chartPrimary}
                stroke={SpringaColors.surface}
                strokeWidth={2}
              />
            </G>
          ) : null}
        </Svg>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  metricSummary: {
    gap: 2,
  },
  primaryMetricRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.xs,
  },
  primaryValue: {
    color: SpringaColors.chartPrimary,
    fontSize: 24,
    lineHeight: 28,
    fontWeight: '700',
  },
  metricName: {
    fontSize: 12,
  },
  subMetricText: {
    fontSize: 11,
  },
  chartContainer: {
    alignItems: 'center',
    position: 'relative',
  },
});
