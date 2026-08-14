import { Pressable, StyleSheet, View } from 'react-native';
import type { CalendarEvent } from '@/api/types';
import { AppText, Badge, Card } from '@/components/ui';
import { formatDuration, formatHrMin } from '@/domain/format';
import { getCardStatus, getEventIcon } from '@/domain/eventStatus';
import { SpringaColors } from '@/theme/colors';
import { Radius, Spacing, Typography } from '@/theme/tokens';

type AgendaEventCardProps = {
  event: CalendarEvent;
  onPress?: (event: CalendarEvent) => void;
};

function formatPaceMinPerKm(paceMinPerKm: number): string {
  const totalSeconds = Math.round(paceMinPerKm * 60);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function statusBorderColor(status: ReturnType<typeof getCardStatus>): string {
  switch (status) {
    case 'completed':
      return SpringaColors.success;
    case 'missed':
      return SpringaColors.error;
    case 'race':
      return SpringaColors.error;
    default:
      return SpringaColors.brand;
  }
}

export function AgendaEventCard({ event, onPress }: AgendaEventCardProps) {
  const status = getCardStatus(event);
  const weekday = event.date
    .toLocaleDateString('en-GB', { weekday: 'short' })
    .toUpperCase();
  const day = event.date.toLocaleDateString('en-GB', { day: 'numeric' });
  const month = event.date.toLocaleDateString('en-GB', { month: 'short' });
  const missed = status === 'missed';
  const planned = status === 'planned' || status === 'race';
  const completed = status === 'completed';

  const durationLabel =
    event.duration == null
      ? null
      : completed
        ? formatDuration(event.duration)
        : formatHrMin(Math.round(event.duration / 60));

  const distanceKm =
    event.distance != null && event.distance > 0
      ? Math.round((event.distance / 1000) * 10) / 10
      : null;
  const hasFuel = event.fuelRate != null || event.prescribedCarbsG != null;
  const hasMetrics = durationLabel != null || distanceKm != null;

  return (
    <Pressable
      onPress={() => {
        onPress?.(event);
      }}
      accessibilityRole="button"
      accessibilityLabel={`Open workout ${event.name}`}
      style={styles.pressable}
    >
      <Card
        style={[
          styles.card,
          { borderLeftColor: statusBorderColor(status) },
          missed && styles.cardMissed,
        ]}
      >
        <View style={styles.dateCol}>
          <AppText variant="caption" tone="muted" style={styles.weekday}>{weekday}</AppText>
          <AppText variant="heading">{day}</AppText>
          <AppText variant="caption" tone="muted">{month}</AppText>
        </View>

        <View style={styles.body}>
          <View style={styles.titleRow}>
            <AppText style={styles.icon}>{getEventIcon(event)}</AppText>
            <AppText
              variant="label"
              style={[styles.title, missed && styles.titleMissed]}
              numberOfLines={1}
            >
              {event.name}
            </AppText>
          </View>

          {planned && (hasMetrics || hasFuel) ? (
            <View style={styles.chips}>
              {hasMetrics ? (
                <Badge
                  label={[
                    durationLabel != null ? `~${durationLabel}` : null,
                    distanceKm != null ? `${distanceKm} km` : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                />
              ) : null}
              {hasFuel ? (
                <Badge
                  tone="warning"
                  label={[
                    event.fuelRate != null ? `${event.fuelRate}g/h` : null,
                    event.prescribedCarbsG != null
                      ? `${event.prescribedCarbsG}g total`
                      : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                />
              ) : null}
            </View>
          ) : null}

          {completed ? (
            <View style={styles.stats}>
              {durationLabel != null ? (
                <AppText variant="caption">{durationLabel}</AppText>
              ) : null}
              {distanceKm != null ? (
                <AppText variant="caption">{distanceKm} km</AppText>
              ) : null}
              {event.pace != null ? (
                <AppText variant="caption">
                  {formatPaceMinPerKm(event.pace)}
                  <AppText variant="caption" tone="muted"> /km</AppText>
                </AppText>
              ) : null}
              {event.avgHr != null ? (
                <AppText variant="caption">
                  {event.avgHr}
                  <AppText variant="caption" tone="muted"> bpm</AppText>
                </AppText>
              ) : null}
            </View>
          ) : null}
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: { marginBottom: Spacing.sm },
  card: {
    flexDirection: 'row',
    gap: Spacing.md,
    borderRadius: Radius.md,
    borderLeftWidth: 3,
    overflow: 'hidden',
  },
  cardMissed: {
    borderColor: SpringaColors.error + '4D',
    backgroundColor: SpringaColors.tintError + '4D',
    opacity: 0.6,
  },
  dateCol: {
    width: 44,
    alignItems: 'center',
  },
  weekday: {
    textTransform: 'uppercase',
  },
  body: {
    flex: 1,
    minWidth: 0,
    gap: Spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  icon: {
    fontSize: Typography.body.fontSize,
  },
  title: {
    flex: 1,
  },
  titleMissed: {
    textDecorationLine: 'line-through',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  stats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
});
