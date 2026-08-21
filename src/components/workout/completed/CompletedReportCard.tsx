import type { ReactElement, ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Droplets } from 'lucide-react-native';
import type {
  CompletedBgScore,
  CompletedEntryTrendScore,
  CompletedRecoveryScore,
  CompletedWorkoutOverview,
} from '@/api/types';
import { AppText, Card, Section } from '@/components/ui';
import { SpringaColors } from '@/theme/colors';
import { Radius, Spacing } from '@/theme/tokens';
import {
  bgJudgment,
  formatFiveMinuteChange,
  formatMmol,
} from './completedOverviewPresentation';

type CompletedReportCardProps = {
  reportCard: CompletedWorkoutOverview['reportCard'];
};

type Tone = 'success' | 'warning' | 'error';

function ratingTone(rating: 'good' | 'ok' | 'bad'): Tone {
  switch (rating) {
    case 'good':
      return 'success';
    case 'ok':
      return 'warning';
    case 'bad':
      return 'error';
  }
}

function ReportPanel({
  title,
  judgment,
  tone,
  accessibilityLabel,
  children,
}: {
  title: string;
  judgment: string;
  tone: Tone;
  accessibilityLabel: string;
  children: ReactNode;
}) {
  return (
    <View accessible accessibilityLabel={accessibilityLabel} style={styles.panel}>
      <View style={styles.panelHeader}>
        <AppText variant="caption" tone="muted" style={styles.panelTitle}>{title}</AppText>
        <AppText variant="label" tone={tone} style={styles.judgment}>{judgment}</AppText>
      </View>
      {children}
    </View>
  );
}

function GlucoseMetric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <AppText variant="caption" tone="muted">{label}</AppText>
      <AppText variant="subheading" selectable style={styles.value}>{value}</AppText>
    </View>
  );
}

function DuringRunPanel({ score }: { score: CompletedBgScore }) {
  const judgment = bgJudgment(score);
  const start = `${formatMmol(score.startBG)} mmol/L`;
  const lowest = `${formatMmol(score.minBG)} mmol/L`;
  const change = `${formatFiveMinuteChange(score.worstRate)} mmol/L`;

  return (
    <ReportPanel
      title="During run"
      judgment={judgment}
      tone={ratingTone(score.rating)}
      accessibilityLabel={`During run, ${judgment}, start ${start}, lowest ${lowest}, steepest 5-minute change ${change}`}
    >
      <View style={styles.metricRow}>
        <GlucoseMetric label="Start" value={start} />
        <GlucoseMetric label="Lowest" value={lowest} />
      </View>
      <GlucoseMetric label="Steepest 5-min change" value={change} />
    </ReportPanel>
  );
}

function BeforeRunPanel({ score }: { score: CompletedEntryTrendScore }) {
  const change = `${formatFiveMinuteChange(score.slope30m)} mmol/L`;
  return (
    <ReportPanel
      title="Before run"
      judgment={score.label}
      tone={ratingTone(score.rating)}
      accessibilityLabel={`Before run, ${score.label}, 5-minute change ${change}`}
    >
      <GlucoseMetric label="5-min change" value={change} />
    </ReportPanel>
  );
}

function AfterRunPanel({ score }: { score: CompletedRecoveryScore }) {
  const change = `${score.drop30m.toFixed(1)} mmol/L`;
  const lowest = `${formatMmol(score.nadir)} mmol/L`;
  return (
    <ReportPanel
      title="After run"
      judgment={score.label}
      tone={ratingTone(score.rating)}
      accessibilityLabel={`After run, ${score.label}, first 30-minute change ${change}, lowest after run ${lowest}`}
    >
      <View style={styles.metricRow}>
        <GlucoseMetric label="First 30 min" value={change} />
        <GlucoseMetric label="Lowest after run" value={lowest} />
      </View>
    </ReportPanel>
  );
}

export function CompletedReportCard({
  reportCard,
}: CompletedReportCardProps): ReactElement | null {
  const { bg, entryTrend, recovery } = reportCard;
  if (bg == null && entryTrend == null && recovery == null) return null;

  return (
    <Section title="Blood Glucose" icon={Droplets} iconColor={SpringaColors.chartSecondary}>
      <Card accessibilityLabel="Run report" style={styles.report}>
        {bg != null ? <DuringRunPanel score={bg} /> : null}
        {entryTrend != null ? <BeforeRunPanel score={entryTrend} /> : null}
        {recovery != null ? <AfterRunPanel score={recovery} /> : null}
      </Card>
    </Section>
  );
}

const styles = StyleSheet.create({
  report: {
    gap: Spacing.sm,
  },
  panel: {
    minWidth: 0,
    gap: Spacing.sm,
    padding: Spacing.md,
    backgroundColor: SpringaColors.surfaceAlt,
    borderCurve: 'continuous',
    borderRadius: Radius.md,
  },
  panelHeader: {
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  panelTitle: {
    flexShrink: 1,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  judgment: {
    flexShrink: 1,
    textAlign: 'right',
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  metric: {
    flex: 1,
    minWidth: 0,
    gap: Spacing.xs,
  },
  value: {
    fontVariant: ['tabular-nums'],
  },
});
