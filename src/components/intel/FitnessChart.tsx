import { Info } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, G, Line, Path, Text as SvgText } from 'react-native-svg';
import { AppText, Card } from '@/components/ui';
import { AppBottomSheet } from '@/components/ui/AppBottomSheet';
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
  ctl: { label: 'Fitness (CTL)', shortLabel: 'Fitness', color: SpringaColors.chartSecondary },
  atl: { label: 'Fatigue (ATL)', shortLabel: 'Fatigue', color: SpringaColors.chartPrimary },
  tsb: { label: 'Form (TSB)', shortLabel: 'Form', color: SpringaColors.brand },
};

export const FITNESS_TIME_WINDOWS = [
  { label: '3m', value: '90d' },
  { label: '6m', value: '180d' },
  { label: '1y', value: '1y' },
  { label: 'All', value: 'all' },
] as const;

type Props = {
  data: FitnessDataPoint[];
  timeWindow?: FitnessTimeWindow;
  onScrubbingChange?: (isScrubbing: boolean) => void;
};

export function FitnessChart({ data, timeWindow: externalTimeWindow, onScrubbingChange }: Props) {
  const [internalTimeWindow] = useState<FitnessTimeWindow>('90d');
  const timeWindow = externalTimeWindow ?? internalTimeWindow;
  const [isSheetOpen, setIsSheetOpen] = useState(false);
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
  const height = 150;
  const padding = { top: 12, right: 12, bottom: 22, left: 32 };
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
  const tickCount = 3;
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
    const parts = dateStr.split('-');
    const label = parts.length >= 3 ? `${parts[1]}/${parts[2]}` : dateStr;
    xTicks.push({ i: idx, label });
  }

  const zeroY = scaleY(0);
  const showZeroLine = visibleLines.has('tsb') && yMin < 0 && yMax > 0;

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
  const isScrubbing = scrubIdx !== null && filteredData[scrubIdx] != null;
  const activePoint = isScrubbing ? filteredData[scrubIdx!] : latestPoint;

  return (
    <>
      <Card tone="default">
      {/* Top Header: Current/Inspected values and Time Window selector */}
      <View style={styles.header}>
        <View style={styles.metricSummary}>
          <View style={styles.primaryMetricRow}>
            <AppText variant="heading" style={styles.primaryValue}>
              {activePoint.ctl}
            </AppText>
            <AppText variant="caption" tone="muted" style={styles.metricName}>
              Fitness
            </AppText>
          </View>
          <AppText variant="caption" tone="muted" style={styles.subMetricText}>
            {isScrubbing ? activePoint.date : 'Latest'} • Form{' '}
            <AppText
              variant="caption"
              style={[
                styles.subMetricHighlight,
                { color: SpringaColors.brand },
              ]}
            >
              {activePoint.tsb > 0 ? `+${activePoint.tsb}` : activePoint.tsb}
            </AppText>
            {' '}• Fatigue {activePoint.atl}
          </AppText>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Fitness and form explanation"
          onPress={() => setIsSheetOpen(true)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={styles.infoButton}
        >
          <Info size={18} color={SpringaColors.muted} />
        </Pressable>
      </View>

      {/* Line toggles */}
      <View style={styles.legendRow}>
        {(Object.keys(LINE_CONFIGS) as VisibleLine[]).map((line) => {
          const cfg = LINE_CONFIGS[line];
          const active = visibleLines.has(line);

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
                {cfg.shortLabel}
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
              strokeWidth={p.line === 'ctl' ? 2.5 : 1.75}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}

          {/* Active scrub cursor & indicators */}
          {isScrubbing && (
            <G>
              <Line
                x1={scaleX(scrubIdx!)}
                y1={padding.top}
                x2={scaleX(scrubIdx!)}
                y2={height - padding.bottom}
                stroke={SpringaColors.muted}
                strokeWidth={1}
                strokeDasharray="4 2"
                opacity={0.7}
              />
              {visibleLines.has('ctl') && (
                <Circle
                  cx={scaleX(scrubIdx!)}
                  cy={scaleY(activePoint.ctl)}
                  r={5}
                  fill={SpringaColors.chartSecondary}
                  stroke={SpringaColors.surface}
                  strokeWidth={2}
                />
              )}
              {visibleLines.has('atl') && (
                <Circle
                  cx={scaleX(scrubIdx!)}
                  cy={scaleY(activePoint.atl)}
                  r={4}
                  fill={SpringaColors.chartPrimary}
                  stroke={SpringaColors.surface}
                  strokeWidth={2}
                />
              )}
              {visibleLines.has('tsb') && (
                <Circle
                  cx={scaleX(scrubIdx!)}
                  cy={scaleY(activePoint.tsb)}
                  r={4}
                  fill={SpringaColors.brand}
                  stroke={SpringaColors.surface}
                  strokeWidth={2}
                />
              )}
            </G>
          )}
        </Svg>
      </View>
    </Card>

    <AppBottomSheet
      isPresented={isSheetOpen}
      onDismiss={() => setIsSheetOpen(false)}
    >
      <View style={styles.sheetContent}>
        <AppText variant="subheading" style={styles.sheetTitle}>
          Fitness, Fatigue & Form
        </AppText>
        <AppText variant="body" tone="muted" style={styles.sheetLead}>
          Modeled from your daily training load to track aerobic fitness and freshness over time.
        </AppText>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionDot, { backgroundColor: SpringaColors.chartSecondary }]} />
            <AppText variant="body" style={styles.metricTitle}>Fitness (CTL)</AppText>
          </View>
          <AppText variant="caption" tone="muted" style={styles.sectionBody}>
            42-day exponentially weighted moving average of your training load. Reflects your long-term aerobic conditioning and ability to handle training.
          </AppText>
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionDot, { backgroundColor: SpringaColors.chartPrimary }]} />
            <AppText variant="body" style={styles.metricTitle}>Fatigue (ATL)</AppText>
          </View>
          <AppText variant="caption" tone="muted" style={styles.sectionBody}>
            7-day exponentially weighted moving average of your training load. Measures acute stress from recent sessions. To build fitness, fatigue must temporarily exceed fitness.
          </AppText>
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionDot, { backgroundColor: SpringaColors.brand }]} />
            <AppText variant="body" style={styles.metricTitle}>Form (TSB)</AppText>
          </View>
          <AppText variant="caption" tone="muted" style={styles.sectionBody}>
            Fitness minus fatigue (CTL - ATL). Determines how fresh you are for racing or workouts.
          </AppText>
          <View style={styles.zoneList}>
            <View style={styles.zoneItem}>
              <View style={[styles.zoneDot, { backgroundColor: SpringaColors.chartSecondary }]} />
              <AppText variant="caption" style={styles.zoneName}>Fresh (&gt; +5)</AppText>
              <AppText variant="caption" tone="muted" style={styles.zoneDesc}>Ready to race and perform</AppText>
            </View>
            <View style={styles.zoneItem}>
              <View style={[styles.zoneDot, { backgroundColor: SpringaColors.brand }]} />
              <AppText variant="caption" style={styles.zoneName}>Neutral (-10 to +5)</AppText>
              <AppText variant="caption" tone="muted" style={styles.zoneDesc}>Balanced training state</AppText>
            </View>
            <View style={styles.zoneItem}>
              <View style={[styles.zoneDot, { backgroundColor: SpringaColors.success }]} />
              <AppText variant="caption" style={styles.zoneName}>Optimal (-30 to -10)</AppText>
              <AppText variant="caption" tone="muted" style={styles.zoneDesc}>Productive fitness building</AppText>
            </View>
            <View style={styles.zoneItem}>
              <View style={[styles.zoneDot, { backgroundColor: SpringaColors.error }]} />
              <AppText variant="caption" style={styles.zoneName}>High Risk (&lt; -30)</AppText>
              <AppText variant="caption" tone="muted" style={styles.zoneDesc}>Excessive fatigue; rest</AppText>
            </View>
          </View>
          <AppText variant="caption" tone="muted" style={styles.recoveryNote}>
            Include periodic rest weeks to recover from fatigue, absorb adaptations, and peak for goal events.
          </AppText>
        </View>

        <AppText variant="caption" tone="muted" style={styles.referenceText}>
          References: Science2Sport training load monitoring &amp; Joe Friel Training Stress Balance model.
        </AppText>
      </View>
    </AppBottomSheet>
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
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
    color: SpringaColors.chartSecondary,
    fontSize: 26,
    lineHeight: 30,
    fontWeight: '700',
  },
  metricName: {
    fontSize: 12,
  },
  subMetricText: {
    fontSize: 11,
  },
  subMetricHighlight: {
    fontWeight: '700',
  },
  infoButton: {
    padding: Spacing.xs,
  },
  sheetContent: {
    paddingVertical: Spacing.sm,
    gap: Spacing.md,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  sheetLead: {
    lineHeight: 20,
  },
  sectionCard: {
    backgroundColor: SpringaColors.surfaceAlt,
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  sectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  metricTitle: {
    fontWeight: '700',
  },
  sectionBody: {
    lineHeight: 18,
  },
  zoneList: {
    marginTop: Spacing.xs,
    gap: Spacing.xs,
    paddingTop: Spacing.xs,
    borderTopWidth: 1,
    borderTopColor: SpringaColors.border,
  },
  zoneItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  zoneDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  zoneName: {
    fontWeight: '600',
    minWidth: 125,
  },
  zoneDesc: {
    flex: 1,
  },
  recoveryNote: {
    marginTop: Spacing.xs,
    fontStyle: 'italic',
    lineHeight: 16,
  },
  referenceText: {
    fontSize: 10,
    lineHeight: 14,
    opacity: 0.7,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  legendChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.pill,
    borderWidth: 1,
    minHeight: 24,
    gap: 5,
  },
  legendChipActive: {
    backgroundColor: SpringaColors.surfaceAlt,
    borderColor: SpringaColors.border,
  },
  legendChipInactive: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
    opacity: 0.5,
  },
  legendDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  legendText: {
    fontSize: 11,
    fontWeight: '600',
  },
  chartContainer: {
    alignItems: 'center',
    position: 'relative',
  },
});
