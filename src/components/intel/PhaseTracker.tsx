import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppBottomSheet } from '@/components/ui/AppBottomSheet';
import { AppText, Badge, Card } from '@/components/ui';
import {
  formatRaceDate,
  getPhaseDefinitions,
  isRecoveryWeek,
  weeksUntil,
  type PhaseInfo,
} from '@/lib/phases';
import { SpringaColors } from '@/theme/colors';
import { Radius, Spacing } from '@/theme/tokens';

type Props = {
  phaseInfo: PhaseInfo | null;
  raceDate?: string;
  includeBasePhase?: boolean;
};

export function PhaseTracker({ phaseInfo, raceDate, includeBasePhase }: Props) {
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  if (!phaseInfo) return null;

  const totalWeeks = phaseInfo.totalWeeks;
  const currentWeek = phaseInfo.week;
  const phases = getPhaseDefinitions(totalWeeks, includeBasePhase ?? false);
  const recovery = isRecoveryWeek(currentWeek, totalWeeks, includeBasePhase ?? false);
  const weeksLeft = raceDate ? weeksUntil(raceDate) : null;
  const currentDef =
    phaseInfo.name === 'Pre-Plan' || phaseInfo.name === 'Post-Race' || currentWeek < 1
      ? null
      : phases.find((p) => currentWeek >= p.startWeek && currentWeek <= p.endWeek) ??
        phases.find(
          (p) => p.name === phaseInfo.name || p.displayName === phaseInfo.name,
        ) ??
        null;

  return (
    <>
      <Card tone="default">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${phaseInfo.name}, Week ${phaseInfo.week} of ${phaseInfo.totalWeeks}. Tap for phase details.`}
          onPress={() => setIsSheetOpen(true)}
          style={({ pressed }) => [pressed && styles.pressed]}
        >
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <AppText variant="subheading">{phaseInfo.name}</AppText>
              {recovery && <Badge label="Recovery" tone="warning" />}
            </View>
            <AppText variant="caption" tone="muted">
              Week {phaseInfo.week} of {phaseInfo.totalWeeks}
            </AppText>
          </View>
          <View
            style={styles.track}
            accessibilityRole="progressbar"
            accessibilityLabel={`${phaseInfo.name} phase progress`}
            accessibilityValue={{
              min: 0,
              max: 100,
              now: Math.min(100, Math.max(0, phaseInfo.progressPercent)),
            }}
          >
            <View
              style={[
                styles.fill,
                { width: `${Math.min(100, Math.max(0, phaseInfo.progressPercent))}%` },
              ]}
            />
          </View>
        </Pressable>
      </Card>

      <AppBottomSheet
        isPresented={isSheetOpen}
        onDismiss={() => setIsSheetOpen(false)}
      >
        <View style={styles.sheetContent}>
          {raceDate && weeksLeft != null && weeksLeft > 0 && (
            <View style={styles.countdownRow}>
              <AppText variant="caption" style={styles.countdownText}>
                {weeksLeft} {weeksLeft === 1 ? 'week' : 'weeks'} to race day • {formatRaceDate(raceDate)}
              </AppText>
            </View>
          )}

          {currentDef && (
            <View style={styles.currentPhaseCard}>
              <View style={styles.currentPhaseTitleRow}>
                <AppText variant="subheading" style={{ color: SpringaColors.brand }}>
                  {currentDef.displayName}
                </AppText>
                {recovery && <Badge label="Recovery Week" tone="warning" />}
              </View>
              <AppText variant="body" tone="muted" style={styles.phaseDescription}>
                {currentDef.description}
              </AppText>
              <View style={styles.focusList}>
                {currentDef.focus.map((item, idx) => (
                  <View key={idx} style={styles.focusItem}>
                    <View style={styles.bulletDot} />
                    <AppText variant="caption" style={styles.focusText}>
                      {item}
                    </AppText>
                  </View>
                ))}
              </View>
            </View>
          )}

          <View style={styles.allPhasesSection}>
            <AppText variant="caption" tone="muted" style={styles.sectionTitle}>
              TRAINING PHASES
            </AppText>
            <View style={styles.phasesTimeline}>
              {phases.map((phase) => {
                const isCurrent =
                  currentWeek >= phase.startWeek && currentWeek <= phase.endWeek;
                const isPast = currentWeek > phase.endWeek;
                return (
                  <View key={phase.name} style={styles.timelineRow}>
                    <View
                      style={[
                        styles.timelineDot,
                        isCurrent && styles.timelineDotActive,
                        isPast && styles.timelineDotPast,
                      ]}
                    />
                    <View style={styles.timelineContent}>
                      <View style={styles.timelineHeader}>
                        <AppText
                          variant="body"
                          style={[
                            styles.phaseNameText,
                            isCurrent && { color: SpringaColors.brand, fontWeight: '700' },
                          ]}
                        >
                          {phase.displayName}
                        </AppText>
                        <AppText variant="caption" tone="muted">
                          {phase.startWeek === phase.endWeek
                            ? `Week ${phase.startWeek}`
                            : `Weeks ${phase.startWeek}–${phase.endWeek}`}
                        </AppText>
                      </View>
                      <AppText variant="caption" tone="muted" numberOfLines={2}>
                        {phase.description}
                      </AppText>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        </View>
      </AppBottomSheet>
    </>
  );
}

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  track: {
    height: 6,
    backgroundColor: SpringaColors.surfaceAlt,
    borderRadius: Radius.pill,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: SpringaColors.brand,
    borderRadius: Radius.pill,
  },
  sheetContent: {
    paddingVertical: Spacing.sm,
    gap: Spacing.md,
  },
  countdownRow: {
    paddingBottom: Spacing.xs,
  },
  countdownText: {
    color: SpringaColors.brand,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  currentPhaseCard: {
    backgroundColor: SpringaColors.surfaceAlt,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: SpringaColors.border,
    gap: Spacing.xs,
  },
  currentPhaseTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  phaseDescription: {
    lineHeight: 20,
    marginTop: Spacing.xxs,
  },
  focusList: {
    marginTop: Spacing.xs,
    gap: Spacing.xxs,
  },
  focusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  bulletDot: {
    width: 5,
    height: 5,
    borderRadius: Radius.pill,
    backgroundColor: SpringaColors.brand,
  },
  focusText: {
    color: SpringaColors.text,
  },
  allPhasesSection: {
    marginTop: Spacing.xs,
    gap: Spacing.xs,
  },
  sectionTitle: {
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  phasesTimeline: {
    gap: Spacing.sm,
    marginTop: Spacing.xxs,
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: Radius.pill,
    backgroundColor: SpringaColors.borderSubtle,
    marginTop: 5,
  },
  timelineDotActive: {
    backgroundColor: SpringaColors.brand,
    width: 12,
    height: 12,
    marginTop: 4,
  },
  timelineDotPast: {
    backgroundColor: SpringaColors.success,
  },
  timelineContent: {
    flex: 1,
    gap: 2,
  },
  timelineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  phaseNameText: {
    fontWeight: '600',
  },
});
