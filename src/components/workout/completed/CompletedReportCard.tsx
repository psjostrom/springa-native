import type { ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';
import type {
  CompletedBgScore,
  CompletedEntryTrendScore,
  CompletedRecoveryScore,
  CompletedWorkoutOverview,
} from '@/api/types';
import { AppText, Card, Grid } from '@/components/ui';
import { Spacing } from '@/theme/tokens';
import {
  bgJudgment,
  formatMmol,
  formatRatePerMin,
  formatSlopePerMin,
} from './completedOverviewPresentation';

type CompletedReportCardProps = {
  reportCard: CompletedWorkoutOverview['reportCard'];
};

type CellProps = {
  label: string;
  accessibilityLabel: string;
  judgment: string;
  tone: 'success' | 'warning' | 'error';
  value: string;
  unit?: string;
  caption?: string;
};

function ratingTone(rating: 'good' | 'ok' | 'bad'): CellProps['tone'] {
  switch (rating) {
    case 'good':
      return 'success';
    case 'ok':
      return 'warning';
    case 'bad':
      return 'error';
  }
}

function ReportCell({ label, accessibilityLabel, judgment, tone, value, unit, caption }: CellProps) {
  return (
    <View accessible accessibilityLabel={accessibilityLabel} style={styles.cell}>
      <View style={styles.topRow}>
        <AppText variant="caption" tone="muted">{label}</AppText>
        <AppText variant="label" tone={tone}>{judgment}</AppText>
      </View>
      <AppText variant="subheading" selectable>
        {unit ? `${value} ${unit}` : value}
      </AppText>
      {caption ? <AppText variant="caption" tone="muted">{caption}</AppText> : null}
    </View>
  );
}

function BgCell({ score }: { score: CompletedBgScore }) {
  const judgment = bgJudgment(score);
  return (
    <ReportCell
      label="Blood Glucose"
      accessibilityLabel={`Blood Glucose, ${judgment}, ${formatMmol(score.startBG)} to ${formatMmol(score.minBG)} mmol/L, worst rate ${formatRatePerMin(score.worstRate).replace('/min', ' per minute')}`}
      judgment={judgment}
      tone={ratingTone(score.rating)}
      value={`${formatMmol(score.startBG)} → ${formatMmol(score.minBG)}`}
      unit="mmol/L"
      caption={formatRatePerMin(score.worstRate)}
    />
  );
}

function EntryTrendCell({ score }: { score: CompletedEntryTrendScore }) {
  const slope = formatSlopePerMin(score.slope30m);
  return (
    <ReportCell
      label="Pre-Run trend"
      accessibilityLabel={`Pre-Run trend, ${score.label}, ${slope.replace('/min', ' mmol/L per minute')}`}
      judgment={slope}
      tone={ratingTone(score.rating)}
      value={score.label}
    />
  );
}

function RecoveryCell({ score }: { score: CompletedRecoveryScore }) {
  const nadir = formatMmol(score.nadir);
  const drop = score.drop30m.toFixed(1);
  return (
    <ReportCell
      label="Recovery"
      accessibilityLabel={`Recovery, ${score.label}, ${drop} mmol/L per 30 minutes, low ${nadir} mmol/L`}
      judgment={`low ${nadir}`}
      tone={ratingTone(score.rating)}
      value={score.label}
      caption={`${drop} mmol/L (30 min)`}
    />
  );
}

export function CompletedReportCard({
  reportCard,
}: CompletedReportCardProps): ReactElement | null {
  const { bg, entryTrend, recovery } = reportCard;
  if (bg == null && entryTrend == null && recovery == null) return null;

  return (
    <Card accessibilityLabel="Run report">
      <Grid>
        {bg != null ? <BgCell score={bg} /> : null}
        {entryTrend != null ? <EntryTrendCell score={entryTrend} /> : null}
        {recovery != null ? <RecoveryCell score={recovery} /> : null}
      </Grid>
    </Card>
  );
}

const styles = StyleSheet.create({
  cell: {
    gap: Spacing.xs,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
});