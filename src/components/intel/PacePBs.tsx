import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import type { BestEffort, PaceCurveData } from '@/api/types';
import { AppText } from '@/components/ui';
import { SpringaColors } from '@/theme/colors';
import { Radius, Spacing } from '@/theme/tokens';

import { formatPaceMinPerKm } from '@/components/workout/completed/completedOverviewPresentation';

type Props = {
  bestEfforts: BestEffort[];
  longestRun?: PaceCurveData['longestRun'];
};

function formatTime(seconds: number): string {
  const rounded = Math.round(seconds);
  const hrs = Math.floor(rounded / 3600);
  const mins = Math.floor((rounded % 3600) / 60);
  const secs = rounded % 60;
  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatPace(paceMinPerKm: number): string {
  return `${formatPaceMinPerKm(paceMinPerKm)}/km`;
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '';
  return dateStr.split('T')[0];
}

export function PacePBs({ bestEfforts, longestRun }: Props) {
  const router = useRouter();

  if ((!bestEfforts || bestEfforts.length === 0) && !longestRun) return null;

  const navigateToWorkout = (
    activityId?: string,
    activityName?: string,
    activityDate?: string,
  ) => {
    if (!activityId) return;
    router.push({
      pathname: '/workout/[id]',
      params: {
        id: activityId,
        name: activityName ?? '',
        date: activityDate ?? '',
      },
    });
  };

  return (
    <View style={styles.grid}>
      {bestEfforts.map((pb) => {
        const canPress = Boolean(pb.activityId);
        return (
          <Pressable
            key={pb.label || pb.distance}
            disabled={!canPress}
            onPress={() =>
              navigateToWorkout(pb.activityId, pb.activityName, pb.activityDate)
            }
            accessibilityRole={canPress ? 'button' : undefined}
            accessibilityLabel={
              canPress ? `View ${pb.label} effort workout` : undefined
            }
            style={({ pressed }) => [
              styles.card,
              canPress && pressed && styles.cardPressed,
            ]}
          >
            <AppText variant="caption" style={styles.distanceLabel}>
              {pb.label.toUpperCase()}
            </AppText>
            <AppText variant="heading" style={styles.timeText}>
              {formatTime(pb.timeSeconds)}
            </AppText>
            <AppText variant="caption" tone="muted" style={styles.paceText}>
              {formatPace(pb.pace)}
            </AppText>
            {pb.activityName ? (
              <AppText
                variant="caption"
                tone="muted"
                numberOfLines={1}
                style={styles.activityText}
              >
                {pb.activityName}
              </AppText>
            ) : null}
            {pb.activityDate ? (
              <AppText variant="caption" tone="muted" style={styles.dateText}>
                {formatDate(pb.activityDate)}
              </AppText>
            ) : null}
          </Pressable>
        );
      })}

      {longestRun && (
        <Pressable
          key="longest-run"
          disabled={!longestRun.activityId}
          onPress={() =>
            navigateToWorkout(
              longestRun.activityId,
              longestRun.activityName,
              longestRun.activityDate,
            )
          }
          accessibilityRole={longestRun.activityId ? 'button' : undefined}
          accessibilityLabel={
            longestRun.activityId ? 'View longest run workout' : undefined
          }
          style={({ pressed }) => [
            styles.card,
            Boolean(longestRun.activityId) && pressed && styles.cardPressed,
          ]}
        >
          <AppText variant="caption" style={styles.distanceLabel}>
            LONGEST RUN
          </AppText>
          <AppText variant="heading" style={styles.timeText}>
            {(longestRun.distance / 1000).toFixed(1)} km
          </AppText>
          {longestRun.movingTime ? (
            <AppText variant="caption" tone="muted" style={styles.paceText}>
              {formatTime(longestRun.movingTime)}
            </AppText>
          ) : null}
          {longestRun.activityName ? (
            <AppText
              variant="caption"
              tone="muted"
              numberOfLines={1}
              style={styles.activityText}
            >
              {longestRun.activityName}
            </AppText>
          ) : null}
          {longestRun.activityDate ? (
            <AppText variant="caption" tone="muted" style={styles.dateText}>
              {formatDate(longestRun.activityDate)}
            </AppText>
          ) : null}
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  card: {
    width: '48%',
    backgroundColor: SpringaColors.surfaceAlt,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: SpringaColors.border,
  },
  distanceLabel: {
    color: SpringaColors.brand,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: Spacing.xxs,
  },
  timeText: {
    color: SpringaColors.text,
    marginBottom: Spacing.xxs,
  },
  paceText: {
    marginBottom: Spacing.xs,
  },
  activityText: {
    fontSize: 11,
  },
  dateText: {
    fontSize: 10,
    marginTop: Spacing.xxs,
  },
  cardPressed: {
    opacity: 0.7,
  },
});
