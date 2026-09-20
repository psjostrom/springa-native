import { Activity, Gauge, Heart, Moon, Zap } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, Polyline, Rect } from 'react-native-svg';
import type { WellnessEntry } from '@/api/types';
import { AppText, Card } from '@/components/ui';
import { AppBottomSheet } from '@/components/ui/AppBottomSheet';
import {
  computeReadinessData,
  getReadinessExplanation,
  type MetricKey,
  type ReadinessBaseline,
} from '@/lib/readiness';
import { SpringaColors } from '@/theme/colors';
import { Radius, Spacing } from '@/theme/tokens';

type Props = {
  entries: WellnessEntry[];
};

function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) return null;

  const validData = data.filter((v) => v > 0);
  if (validData.length < 2) return null;

  const min = Math.min(...validData);
  const max = Math.max(...validData);
  const range = max - min || 1;

  const width = 60;
  const height = 20;
  const padding = 2;

  const points = validData
    .map((v, i) => {
      const x = padding + (i / (validData.length - 1)) * (width - 2 * padding);
      const y = height - padding - ((v - min) / range) * (height - 2 * padding);
      return `${x},${y}`;
    })
    .join(' ');

  const lastY =
    height -
    padding -
    ((validData[validData.length - 1] - min) / range) * (height - 2 * padding);

  return (
    <Svg width={width} height={height}>
      <Polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx={width - padding} cy={lastY} r={2} fill={color} />
    </Svg>
  );
}

function EnlargedSparkline({
  data,
  color,
  baseline,
}: {
  data: number[];
  color: string;
  baseline: ReadinessBaseline;
}) {
  const validData = data.filter((v) => v > 0);
  if (validData.length < 2) return null;

  const min = Math.min(...validData, baseline.mean - baseline.sd);
  const max = Math.max(...validData, baseline.mean + baseline.sd);
  const range = max - min || 1;

  const width = 260;
  const height = 60;
  const padding = 8;

  const scaleY = (v: number) =>
    height - padding - ((v - min) / range) * (height - 2 * padding);

  const points = validData
    .map((v, i) => {
      const x = padding + (i / (validData.length - 1)) * (width - 2 * padding);
      const y = scaleY(v);
      return `${x},${y}`;
    })
    .join(' ');

  const bandTop = scaleY(baseline.mean + 0.5 * baseline.sd);
  const bandBottom = scaleY(baseline.mean - 0.5 * baseline.sd);
  const bandHeight = Math.max(2, bandBottom - bandTop);

  const avg = Math.round(
    validData.reduce((a, b) => a + b, 0) / validData.length,
  );

  return (
    <View style={styles.enlargedChartContainer}>
      <Svg width={width} height={height}>
        {baseline.sd > 0 && (
          <Rect
            x={padding}
            y={bandTop}
            width={width - 2 * padding}
            height={bandHeight}
            fill={SpringaColors.surfaceAlt}
            opacity={0.8}
            rx={4}
          />
        )}
        <Polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {validData.map((v, i) => {
          const x =
            padding + (i / (validData.length - 1)) * (width - 2 * padding);
          const y = scaleY(v);
          const isLast = i === validData.length - 1;
          return (
            <Circle
              key={i}
              cx={x}
              cy={y}
              r={isLast ? 3.5 : 2}
              fill={color}
              opacity={isLast ? 1 : 0.6}
            />
          );
        })}
      </Svg>
      <View style={styles.chartLabels}>
        <AppText variant="caption" tone="muted">
          Min: {Math.round(min)}
        </AppText>
        <AppText variant="caption" tone="muted">
          Avg: {avg}
        </AppText>
        <AppText variant="caption" tone="muted">
          Max: {Math.round(max)}
        </AppText>
      </View>
    </View>
  );
}

export function ReadinessPanel({ entries }: Props) {
  const [selectedMetric, setSelectedMetric] = useState<{
    key: MetricKey;
    label: string;
    value: number;
    baseline: ReadinessBaseline;
    sparkline: number[];
    color: string;
  } | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const openMetric = (metric: {
    key: MetricKey;
    label: string;
    value: number;
    baseline: ReadinessBaseline;
    sparkline: number[];
    color: string;
  }) => {
    setSelectedMetric(metric);
    setIsSheetOpen(true);
  };

  const handleDismiss = () => {
    setIsSheetOpen(false);
  };

  const handleDismissComplete = () => {
    setSelectedMetric(null);
  };

  const data = computeReadinessData(entries);
  if (!data) {
    return (
      <Card tone="default">
        <AppText variant="body" tone="muted" style={styles.centerText}>
          No wellness data available
        </AppText>
      </Card>
    );
  }

  const { readiness, isComputed, hrv, restingHR, sleep, sleepLabel, sleepUnit, tsb } =
    data;

  let readinessTone: 'success' | 'warning' | 'error' = 'success';
  let readinessLabel = 'Ready to train';
  let readinessBg: string = SpringaColors.tintSuccess;

  if (readiness != null) {
    if (readiness >= 70) {
      readinessTone = 'success';
      readinessLabel = 'Ready to train';
      readinessBg = SpringaColors.tintSuccess;
    } else if (readiness >= 50) {
      readinessTone = 'success';
      readinessLabel = 'Good to go';
      readinessBg = SpringaColors.tintSuccess;
    } else if (readiness >= 30) {
      readinessTone = 'warning';
      readinessLabel = 'Monitor recovery';
      readinessBg = SpringaColors.tintWarning;
    } else {
      readinessTone = 'error';
      readinessLabel = 'Recovery day';
      readinessBg = SpringaColors.tintError;
    }
  }

  let tsbLabel = 'Neutral';
  let tsbToneColor: string = SpringaColors.muted;
  let tsbBg: string = SpringaColors.surfaceAlt;
  if (tsb != null) {
    if (tsb < -20) {
      tsbLabel = 'Fatigued';
      tsbToneColor = SpringaColors.error;
      tsbBg = SpringaColors.tintError;
    } else if (tsb < -10) {
      tsbLabel = 'Loading';
      tsbToneColor = SpringaColors.warning;
      tsbBg = SpringaColors.tintWarning;
    } else if (tsb < 5) {
      tsbLabel = 'Neutral';
      tsbToneColor = SpringaColors.muted;
      tsbBg = SpringaColors.surfaceAlt;
    } else if (tsb < 15) {
      tsbLabel = 'Fresh';
      tsbToneColor = SpringaColors.success;
      tsbBg = SpringaColors.tintSuccess;
    } else {
      tsbLabel = 'Peaked';
      tsbToneColor = SpringaColors.success;
      tsbBg = SpringaColors.tintSuccess;
    }
  }

  const tsbNormalized =
    tsb != null ? Math.max(0, Math.min(100, ((tsb + 30) / 50) * 100)) : 50;

  const detailInfo = selectedMetric
    ? getReadinessExplanation(
        selectedMetric.key,
        selectedMetric.value,
        selectedMetric.baseline,
      )
    : null;

  return (
    <View style={styles.container}>
      {readiness != null && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Readiness: ${readiness}, ${readinessLabel}`}
          onPress={() =>
            openMetric({
              key: 'readiness',
              label: 'Readiness',
              value: readiness,
              baseline: { mean: 50, sd: 20 },
              sparkline: [],
              color:
                readinessTone === 'success'
                  ? SpringaColors.success
                  : readinessTone === 'warning'
                    ? SpringaColors.warning
                    : SpringaColors.error,
            })
          }
          style={[styles.banner, { backgroundColor: readinessBg }]}
        >
          <Gauge size={24} color={SpringaColors.text} />
          <View style={styles.bannerInfo}>
            <AppText variant="subheading">{readinessLabel}</AppText>
            <AppText variant="caption" tone="muted">
              {isComputed
                ? 'Based on HRV, HR, sleep, form'
                : 'From wearable'}
            </AppText>
          </View>
          <AppText variant="title" style={styles.readinessScore}>
            {readiness}
          </AppText>
        </Pressable>
      )}

      <View style={styles.metricsRow}>
        {hrv != null && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`HRV ${hrv} ms`}
            onPress={() =>
              openMetric({
                key: 'hrv',
                label: 'HRV',
                value: hrv,
                baseline: data.hrvBaseline,
                sparkline: data.hrvSparkline,
                color: SpringaColors.chartPrimary,
              })
            }
            style={styles.metricCard}
          >
            <View style={styles.metricHeader}>
              <Activity size={14} color={SpringaColors.chartPrimary} />
              <AppText variant="caption" tone="muted" style={styles.metricLabel}>
                HRV
              </AppText>
            </View>
            <View style={styles.metricBottom}>
              <View style={styles.metricValueWrap}>
                <AppText variant="subheading">{hrv}</AppText>
                <AppText variant="caption" tone="muted" style={styles.metricUnit}>
                  ms
                </AppText>
              </View>
              <Sparkline
                data={data.hrvSparkline}
                color={SpringaColors.chartPrimary}
              />
            </View>
          </Pressable>
        )}

        {restingHR != null && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Resting HR ${restingHR} bpm`}
            onPress={() =>
              openMetric({
                key: 'rhr',
                label: 'Resting HR',
                value: restingHR,
                baseline: data.rhrBaseline,
                sparkline: data.hrSparkline,
                color: SpringaColors.brand,
              })
            }
            style={styles.metricCard}
          >
            <View style={styles.metricHeader}>
              <Heart size={14} color={SpringaColors.brand} />
              <AppText variant="caption" tone="muted" style={styles.metricLabel}>
                RHR
              </AppText>
            </View>
            <View style={styles.metricBottom}>
              <View style={styles.metricValueWrap}>
                <AppText variant="subheading">{restingHR}</AppText>
                <AppText variant="caption" tone="muted" style={styles.metricUnit}>
                  bpm
                </AppText>
              </View>
              <Sparkline data={data.hrSparkline} color={SpringaColors.brand} />
            </View>
          </Pressable>
        )}

        {sleep != null && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Sleep ${sleep} ${sleepUnit}`}
            onPress={() =>
              openMetric({
                key: 'sleep',
                label: sleepLabel,
                value: sleep,
                baseline:
                  sleep > 12 ? { mean: 75, sd: 15 } : { mean: 7.5, sd: 1.2 },
                sparkline: data.sleepSparkline,
                color: SpringaColors.muted,
              })
            }
            style={styles.metricCard}
          >
            <View style={styles.metricHeader}>
              <Moon size={14} color={SpringaColors.muted} />
              <AppText variant="caption" tone="muted" style={styles.metricLabel}>
                SLEEP
              </AppText>
            </View>
            <View style={styles.metricBottom}>
              <View style={styles.metricValueWrap}>
                <AppText variant="subheading">{sleep}</AppText>
                {sleepUnit ? (
                  <AppText variant="caption" tone="muted" style={styles.metricUnit}>
                    {sleepUnit}
                  </AppText>
                ) : null}
              </View>
              <Sparkline data={data.sleepSparkline} color={SpringaColors.muted} />
            </View>
          </Pressable>
        )}
      </View>

      {tsb != null && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Form TSB: ${tsb > 0 ? '+' : ''}${tsb}, ${tsbLabel}`}
          onPress={() =>
            openMetric({
              key: 'tsb',
              label: 'Form (TSB)',
              value: tsb,
              baseline: { mean: 0, sd: 15 },
              sparkline: [],
              color: tsbToneColor,
            })
          }
          style={[styles.tsbCard, { backgroundColor: tsbBg }]}
        >
          <View style={styles.tsbHeader}>
            <View style={styles.tsbLeft}>
              <Zap size={14} color={tsbToneColor} />
              <AppText variant="caption" tone="muted" style={styles.metricLabel}>
                FORM (TSB)
              </AppText>
            </View>
            <AppText
              variant="caption"
              style={{ color: tsbToneColor, fontWeight: '700' }}
            >
              {tsbLabel}
            </AppText>
          </View>

          <View style={styles.tsbBody}>
            <AppText variant="heading" style={{ color: tsbToneColor }}>
              {tsb > 0 ? `+${tsb}` : tsb}
            </AppText>
            <View style={styles.tsbTrack}>
              <View style={styles.tsbGradientBar} />
              <View
                style={[
                  styles.tsbDot,
                  { left: `${tsbNormalized}%` },
                ]}
              />
            </View>
          </View>
        </Pressable>
      )}

      <AppBottomSheet
        isPresented={isSheetOpen}
        onDismiss={handleDismiss}
        onDismissComplete={handleDismissComplete}
      >
        <View style={styles.sheetContent}>
          {selectedMetric && detailInfo && (
            <>
              <AppText variant="subheading" style={{ color: selectedMetric.color }}>
                {selectedMetric.label}: {selectedMetric.value}
              </AppText>
              <AppText variant="body" tone="muted" style={styles.sheetDefinition}>
                {detailInfo.definition}
              </AppText>
              <View
                style={[
                  styles.sheetContextBox,
                  { borderLeftColor: selectedMetric.color },
                ]}
              >
                <AppText variant="body" style={{ color: selectedMetric.color }}>
                  {detailInfo.context}
                </AppText>
              </View>

              {selectedMetric.sparkline.length >= 2 && (
                <View style={styles.sheetGraphSection}>
                  <AppText variant="caption" tone="muted" style={styles.graphTitle}>
                    LAST 14 DAYS
                  </AppText>
                  <EnlargedSparkline
                    data={selectedMetric.sparkline}
                    color={selectedMetric.color}
                    baseline={selectedMetric.baseline}
                  />
                </View>
              )}
            </>
          )}
        </View>
      </AppBottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.sm,
  },
  centerText: {
    textAlign: 'center',
    paddingVertical: Spacing.md,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: SpringaColors.border,
  },
  bannerInfo: {
    flex: 1,
  },
  readinessScore: {
    fontWeight: '800',
    color: SpringaColors.text,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  metricCard: {
    flex: 1,
    backgroundColor: SpringaColors.surfaceAlt,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: SpringaColors.border,
    justifyContent: 'space-between',
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  metricLabel: {
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  metricBottom: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  metricValueWrap: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.xxs,
  },
  metricUnit: {
    fontSize: 10,
  },
  tsbCard: {
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: SpringaColors.border,
  },
  tsbHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  tsbLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  tsbBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  tsbTrack: {
    flex: 1,
    height: 8,
    backgroundColor: SpringaColors.bg,
    borderRadius: Radius.pill,
    position: 'relative',
    justifyContent: 'center',
  },
  tsbGradientBar: {
    ...StyleSheet.absoluteFill,
    backgroundColor: SpringaColors.borderSubtle,
    borderRadius: Radius.pill,
  },
  tsbDot: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: Radius.pill,
    backgroundColor: SpringaColors.text,
    marginLeft: -6,
  },
  sheetContent: {
    paddingVertical: Spacing.sm,
    gap: Spacing.md,
  },
  sheetDefinition: {
    lineHeight: 20,
  },
  sheetContextBox: {
    paddingLeft: Spacing.md,
    borderLeftWidth: 3,
    paddingVertical: Spacing.xs,
  },
  sheetGraphSection: {
    marginTop: Spacing.sm,
    alignItems: 'center',
    gap: Spacing.xs,
  },
  graphTitle: {
    alignSelf: 'flex-start',
    letterSpacing: 0.5,
    fontWeight: '600',
  },
  enlargedChartContainer: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  chartLabels: {
    width: 260,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
