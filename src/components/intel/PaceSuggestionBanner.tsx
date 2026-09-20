import { StyleSheet, View } from 'react-native';
import { AppText, Button, Card } from '@/components/ui';
import type { PaceSuggestion } from '@/api/types';
import { SpringaColors } from '@/theme/colors';
import { Spacing } from '@/theme/tokens';

function formatTime(totalSecs: number): string {
  const m = Math.floor(totalSecs / 60);
  const s = totalSecs % 60;
  if (m >= 60) {
    const h = Math.floor(m / 60);
    const rm = m % 60;
    return `${h}:${String(rm).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${m}:${String(s).padStart(2, '0')}`;
}

function distanceLabel(km: number): string {
  if (Math.abs(km - 5) < 0.5) return '5K';
  if (Math.abs(km - 10) < 0.5) return '10K';
  if (Math.abs(km - 21.0975) < 0.5) return 'Half';
  if (Math.abs(km - 42.195) < 0.5) return 'Marathon';
  return `${km}km`;
}

function getSuggestionMessage(suggestion: PaceSuggestion): string {
  if (suggestion.message) return suggestion.message;
  const {
    direction,
    suggestedAbilitySecs,
    currentAbilitySecs,
    currentAbilityDist,
    z4ImprovementSecPerKm,
    cardiacCostChangePercent,
    raceResult,
    pbEvidence,
  } = suggestion;

  const isImprovement = direction === 'improvement';
  const label = distanceLabel(currentAbilityDist);

  if (raceResult?.distanceMatch) {
    const diff = Math.abs(currentAbilitySecs - raceResult.duration);
    const faster = raceResult.duration < currentAbilitySecs;
    return `You finished in ${formatTime(raceResult.duration)} — ${formatTime(diff)} ${faster ? 'faster' : 'slower'} than your current ${label} ability (${formatTime(currentAbilitySecs)}). Suggested: ${label} in ${formatTime(suggestedAbilitySecs)}.`;
  }
  if (pbEvidence) {
    return `Your best ${label} effort was ${formatTime(pbEvidence.timeSeconds)} (${Math.round(pbEvidence.ageDays)} days ago). Suggested: ${label} in ${formatTime(suggestedAbilitySecs)} (was ${formatTime(currentAbilitySecs)}).`;
  }
  if (z4ImprovementSecPerKm != null) {
    const abs = Math.round(Math.abs(z4ImprovementSecPerKm));
    return isImprovement
      ? `Your interval pace has improved by ${abs} sec/km over recent weeks. Suggested: ${label} in ${formatTime(suggestedAbilitySecs)}.`
      : `Your interval pace has slowed by ${abs} sec/km over recent weeks. Suggested: ${label} in ${formatTime(suggestedAbilitySecs)}.`;
  }
  if (cardiacCostChangePercent != null) {
    const abs = Math.abs(cardiacCostChangePercent);
    return isImprovement
      ? `Your easy runs show ${abs.toFixed(0)}% better efficiency. Suggested: ${label} in ${formatTime(suggestedAbilitySecs)}.`
      : `Your easy runs show ${abs.toFixed(0)}% higher effort. Suggested: ${label} in ${formatTime(suggestedAbilitySecs)}.`;
  }
  return `Suggested: ${label} in ${formatTime(suggestedAbilitySecs)} (was ${formatTime(currentAbilitySecs)}).`;
}

type Props = {
  suggestion: PaceSuggestion | null;
  onAccept?: () => void;
  onDismiss?: () => void;
  isAccepting?: boolean;
  isDismissing?: boolean;
};

export function PaceSuggestionBanner({
  suggestion,
  onAccept,
  onDismiss,
  isAccepting,
  isDismissing,
}: Props) {
  if (!suggestion) return null;

  return (
    <Card tone="brand" style={styles.card}>
      <AppText variant="subheading" style={styles.title}>
        Pace update available
      </AppText>
      <AppText variant="body" tone="muted" style={styles.message}>
        {getSuggestionMessage(suggestion)}
      </AppText>

      <View style={styles.actions}>
        <Button
          label="Update paces"
          onPress={onAccept}
          loading={isAccepting}
          disabled={isAccepting || isDismissing}
          variant="primary"
        />
        {onDismiss && (
          <Button
            label="Not now"
            onPress={onDismiss}
            loading={isDismissing}
            disabled={isAccepting || isDismissing}
            variant="secondary"
          />
        )}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: SpringaColors.tintBrand,
    borderColor: SpringaColors.brand,
    gap: Spacing.sm,
  },
  title: {
    color: SpringaColors.brandText,
  },
  message: {
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
});
