import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, G, Line, Path, Text as SvgText } from 'react-native-svg';
import { AppText, Card } from '@/components/ui';
import {
  type FitnessDataPoint,
  type FitnessTimeWindow,
  filterFitnessByWindow,
} from '@/lib/fitness';
import { SpringaColors } from '@/theme/colors';
import { Radius, Spacing } from '@/theme/tokens';

type VisibleLine = 'ctl' | 'atl' | 'tsb';

const LINE_CONFIGS: Record<
  VisibleLine,
  { label: string; shortLabel: string; color: string }
> = {
  ctl: { label: 'Fitness (CTL)', shortLabel: 'Fitness', color: SpringaColors.chartPrimary },
  atl: { label: 'Fatigue (ATL)', shortLabel: 'Fatigue', color: SpringaColors.muted },
  tsb: { label: 'Form (TSB)', shortLabel: 'Form', color: SpringaColors.success },
};

const TIME_WINDOWS: { label: string; value: FitnessTimeWindow }[] = [
  { label: '3m', value: '90d' },
  { label: '6m', value: '180d' },
  { label: '1y', value: '1y' },
  { label: 'All', value: 'all' },
];

type Props = {
  data: FitnessDataPoint[];
};

export function FitnessChart({ data }: Props) {
  const [timeWindow, setTimeWindow] = useState<FitnessTimeWindow>('90d');
  const [visibleLines, setVisibleLines] = useState<Set<VisibleLine>>(
    new Set(['ctl', 'atl', 'tsb']),
  );
  const [scrubIdx, setScrubIdx] = useState<number | null>(null);
  const [containerWidth, setContainerWidth] = useState<number>(320);

  const filteredData = useMemo(
    () => filterFitnessByWindow(data, timeWindow),
    [data, timeWindow],
  );

  if (filteredData.length === 0) return null;

  const toggleLine = (line: VisibleLine) => {
    setVisibleLines((prev) => {
      const next = new Set(prev);
      if (next.has(line)) {
        if (next.size === 1) return next;
        next.delete(line);
      } else {
        next.add(line);
      }
      return next;
    });
  };

  const width = 320;
  const height = 160;
  const padding = { top: 15, right: 15, bottom: 25, left: 35 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  let yMin = Infinity;
  let yMax = -Infinity;
  for (const dp of filteredData) {
    for (const line of visibleLines) {
      const val = dp[line];
      if (val < yMin) yMin = val;
      if (val > yMax) yMax = val;
    }
  }

  if (!Number.isFinite(yMin) || !Number.isFinite(yMax) || yMin === yMax) {
    yMin = 0;
    yMax = 100;
  } else {
    const yPad = Math.max(5, (yMax - yMin) * 0.1);
    yMin = Math.floor(yMin - yPad);
    yMax = Math.ceil(yMax + yPad);
  }

  const scaleX = (i: number) =>
    padding.left +
    (filteredData.length > 1 ? (i / (filteredData.length - 1)) * chartWidth : chartWidth / 2);

  const scaleY = (v: number) =>
    padding.top + (1 - (v - yMin) / (yMax - yMin)) * chartHeight;

  const paths: { line: VisibleLine; d: string; color: string }[] = [];
  for (const line of visibleLines) {
    const d = filteredData
      .map((dp, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(i)} ${scaleY(dp[line])}`)
      .join(' ');
    paths.push({ line, d, color: LINE_CONFIGS[line].color });
  }

  const yTicks: number[] = [];
  const tickCount = 4;
  for (let i = 0; i < tickCount; i++) {
    const val = Math.round(yMin + (i / (tickCount - 1)) * (yMax - yMin));
    yTicks.push(val);
  }

  const xTicks: { i: number; label: string }[] = [];
  const xTickCount = Math.min(5, filteredData.length);
  for (let t = 0; t < xTickCount; t++) {
    const idx = Math.round(
      xTickCount > 1
        ? (t / (xTickCount - 1)) * (filteredData.length - 1)
        : 0,
    );
    const dateStr = filteredData[idx]?.date ?? '';
    // Format YYYY-MM-DD -> MM/DD
    const parts = dateStr.split('-');
    const label = parts.length >= 3 ? `${parts[1]}/${parts[2]}` : dateStr;
    xTicks.push({ i: idx, label });
  }

  const zeroY = scaleY(0);
  const showZeroLine = yMin < 0 && yMax > 0;

  const handleTouch = (locationX: number) => {
    if (filteredData.length === 0 || containerWidth <= 0) return;
    const svgX = (locationX / containerWidth) * width;
    if (svgX < padding.left || svgX > width - padding.right) return;

    const frac = (svgX - padding.left) / chartWidth;
    const idx = Math.min(
      filteredData.length - 1,
      Math.max(0, Math.round(frac * (filteredData.length - 1))),
    );
    setScrubIdx(idx);
  };

  const latestPoint = filteredData[filteredData.length - 1];
  const activePoint =
    scrubIdx !== null && filteredData[scrubIdx]
      ? filteredData[scrubIdx]
      : latestPoint;

  return (
    <Card tone="default">
      <View style={styles.header}>
        <AppText variant="subheading">Fitness & Fatigue</AppText>
        <View style={styles.windowChips}>
          {TIME_WINDOWS.map((tw) => {
            const isSelected = timeWindow === tw.value;
            return (
              <Pressable
                key={tw.value}
                accessibilityRole="button"
                accessibilityLabel={`Time window ${tw.label}`}
                accessibilityState={{ selected: isSelected }}
                hitSlop={{ top: 12, bottom: 12, left: 2, right: 2 }}
                onPress={() => {
                  setTimeWindow(tw.value);
                  setScrubIdx(null);
                }}
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

      {/* Legend & Line toggles */}
      <View style={styles.legendRow}>
        {(Object.keys(LINE_CONFIGS) as VisibleLine[]).map((line) => {
          const cfg = LINE_CONFIGS[line];
          const active = visibleLines.has(line);
          const val = activePoint ? activePoint[line] : null;
          const formattedVal =
            val != null
              ? line === 'tsb' && val > 0
                ? `+${val}`
                : `${val}`
              : '--';

          return (
            <Pressable
              key={line}
              accessibilityRole="button"
              accessibilityLabel={`Toggle ${cfg.label}`}
              accessibilityState={{ selected: active }}
              onPress={() => toggleLine(line)}
              style={[
                styles.legendChip,
                active ? styles.legendChipActive : styles.legendChipInactive,
              ]}
            >
              <View
                style={[
                  styles.legendDot,
                  { backgroundColor: active ? cfg.color : SpringaColors.borderSubtle },
                ]}
              />
              <AppText
                variant="caption"
                tone={active ? 'primary' : 'muted'}
                style={styles.legendText}
              >
                {cfg.shortLabel}:{' '}
                <AppText
                  variant="caption"
                  style={[
                    styles.legendValue,
                    { color: active ? cfg.color : SpringaColors.muted },
                  ]}
                >
                  {formattedVal}
                </AppText>
              </AppText>
            </Pressable>
          );
        })}
      </View>

      <View
        style={styles.chartContainer}
        onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={(e) => handleTouch(e.nativeEvent.locationX)}
        onResponderMove={(e) => handleTouch(e.nativeEvent.locationX)}
        onResponderRelease={() => setScrubIdx(null)}
        onResponderTerminate={() => setScrubIdx(null)}
      >
        {scrubIdx !== null && activePoint ? (
          <View
            pointerEvents="none"
            style={[
              styles.tooltip,
              {
                left:
                  (scaleX(scrubIdx) / width) * containerWidth <
                  containerWidth / 2
                    ? (scaleX(scrubIdx) / width) * containerWidth + 8
                    : (scaleX(scrubIdx) / width) * containerWidth - 110,
              },
            ]}
          >
            <AppText variant="caption" tone="muted">
              {activePoint.date}
            </AppText>
            {visibleLines.has('ctl') && (
              <AppText
                variant="caption"
                style={{ color: SpringaColors.chartPrimary, fontWeight: '700' }}
              >
                Fitness: {activePoint.ctl}
              </AppText>
            )}
            {visibleLines.has('atl') && (
              <AppText
                variant="caption"
                style={{ color: SpringaColors.muted, fontWeight: '700' }}
              >
                Fatigue: {activePoint.atl}
              </AppText>
            )}
            {visibleLines.has('tsb') && (
              <AppText
                variant="caption"
                style={{ color: SpringaColors.success, fontWeight: '700' }}
              >
                Form: {activePoint.tsb > 0 ? `+${activePoint.tsb}` : activePoint.tsb}
              </AppText>
            )}
          </View>
        ) : null}

        <Svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Y grid lines and labels */}
          {yTicks.map((val) => {
            const y = scaleY(val);
            return (
              <G key={`y-${val}`}>
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
                  {val}
                </SvgText>
              </G>
            );
          })}

          {/* Zero line */}
          {showZeroLine ? (
            <Line
              x1={padding.left}
              y1={zeroY}
              x2={width - padding.right}
              y2={zeroY}
              stroke={SpringaColors.borderSubtle}
              strokeWidth={1}
              strokeDasharray="4 2"
            />
          ) : null}

          {/* X labels */}
          {xTicks.map((tick) => (
            <SvgText
              key={`x-${tick.i}`}
              x={scaleX(tick.i)}
              y={height - 6}
              fill={SpringaColors.muted}
              fontSize={10}
              textAnchor="middle"
            >
              {tick.label}
            </SvgText>
          ))}

          {/* Line paths */}
          {paths.map((p) => (
            <Path
              key={p.line}
              d={p.d}
              fill="none"
              stroke={p.color}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}

          {/* Active scrub crosshair & indicator */}
          {scrubIdx !== null && activePoint ? (
            <G>
              <Line
                x1={scaleX(scrubIdx)}
                y1={padding.top}
                x2={scaleX(scrubIdx)}
                y2={height - padding.bottom}
                stroke={SpringaColors.muted}
                strokeWidth={1}
                strokeDasharray="4 2"
                opacity={0.6}
              />
              {visibleLines.has('ctl') && (
                <Circle
                  cx={scaleX(scrubIdx)}
                  cy={scaleY(activePoint.ctl)}
                  r={4}
                  fill={SpringaColors.chartPrimary}
                  stroke={SpringaColors.surface}
                  strokeWidth={2}
                />
              )}
              {visibleLines.has('atl') && (
                <Circle
                  cx={scaleX(scrubIdx)}
                  cy={scaleY(activePoint.atl)}
                  r={4}
                  fill={SpringaColors.muted}
                  stroke={SpringaColors.surface}
                  strokeWidth={2}
                />
              )}
              {visibleLines.has('tsb') && (
                <Circle
                  cx={scaleX(scrubIdx)}
                  cy={scaleY(activePoint.tsb)}
                  r={4}
                  fill={SpringaColors.success}
                  stroke={SpringaColors.surface}
                  strokeWidth={2}
                />
              )}
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
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  windowChips: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  chip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    minHeight: 28,
    borderRadius: Radius.pill,
    backgroundColor: SpringaColors.surfaceAlt,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipText: {
    color: SpringaColors.muted,
  },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  legendChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: Radius.sm,
    borderWidth: 1,
    minHeight: 26,
    gap: Spacing.xs,
  },
  legendChipActive: {
    backgroundColor: SpringaColors.surfaceAlt,
    borderColor: SpringaColors.border,
  },
  legendChipInactive: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
  },
  legendDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  legendText: {
    fontSize: 11,
  },
  legendValue: {
    fontWeight: '700',
  },
  chartContainer: {
    alignItems: 'center',
    position: 'relative',
  },
  tooltip: {
    position: 'absolute',
    top: Spacing.xs,
    zIndex: 10,
    backgroundColor: SpringaColors.surfaceAlt,
    borderWidth: 1,
    borderColor: SpringaColors.border,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    minWidth: 105,
    gap: 2,
  },
});
