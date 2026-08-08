import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { CalendarEvent } from '@/api/types';
import { formatDuration, formatHrMin } from '@/domain/format';
import { getCardStatus, getEventIcon } from '@/domain/eventStatus';
import { SpringaColors } from '@/theme/colors';

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
      onPress={() => onPress?.(event)}
      accessibilityRole="button"
      accessibilityLabel={`Open workout ${event.name}`}
      style={[
        styles.card,
        { borderLeftColor: statusBorderColor(status) },
        missed && styles.cardMissed,
      ]}
    >
      <View style={styles.dateCol}>
        <Text style={styles.weekday}>{weekday}</Text>
        <Text style={styles.day}>{day}</Text>
        <Text style={styles.month}>{month}</Text>
      </View>

      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={styles.icon}>{getEventIcon(event)}</Text>
          <Text style={[styles.title, missed && styles.titleMissed]} numberOfLines={1}>
            {event.name}
          </Text>
        </View>

        {planned && (hasMetrics || hasFuel) ? (
          <View style={styles.chips}>
            {hasMetrics ? (
              <View style={styles.chip}>
                <Text style={styles.chipText}>
                  {[
                    durationLabel != null ? `~${durationLabel}` : null,
                    distanceKm != null ? `${distanceKm} km` : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </Text>
              </View>
            ) : null}
            {hasFuel ? (
              <View style={[styles.chip, styles.fuelChip]}>
                <Text style={styles.chipText}>
                  {[
                    event.fuelRate != null ? `${event.fuelRate}g/h` : null,
                    event.prescribedCarbsG != null
                      ? `${event.prescribedCarbsG}g total`
                      : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {completed ? (
          <View style={styles.stats}>
            {durationLabel != null ? (
              <Text style={styles.stat}>
                <Text style={styles.statValue}>{durationLabel}</Text>
              </Text>
            ) : null}
            {distanceKm != null ? (
              <Text style={styles.stat}>
                <Text style={styles.statValue}>{distanceKm} km</Text>
              </Text>
            ) : null}
            {event.pace != null ? (
              <Text style={styles.stat}>
                <Text style={styles.statValue}>{formatPaceMinPerKm(event.pace)}</Text>
                <Text style={styles.statUnit}> /km</Text>
              </Text>
            ) : null}
            {event.avgHr != null ? (
              <Text style={styles.stat}>
                <Text style={styles.statValue}>{event.avgHr}</Text>
                <Text style={styles.statUnit}> bpm</Text>
              </Text>
            ) : null}
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: 10,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: SpringaColors.border,
    borderLeftWidth: 3,
    backgroundColor: SpringaColors.surface,
    overflow: 'hidden',
    marginBottom: 8,
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
    fontSize: 12,
    color: SpringaColors.muted,
    textTransform: 'uppercase',
  },
  day: {
    fontSize: 22,
    fontWeight: '700',
    color: SpringaColors.text,
  },
  month: {
    fontSize: 12,
    color: SpringaColors.muted,
  },
  body: {
    flex: 1,
    minWidth: 0,
    gap: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  icon: {
    fontSize: 16,
  },
  title: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: SpringaColors.text,
  },
  titleMissed: {
    textDecorationLine: 'line-through',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    backgroundColor: SpringaColors.surfaceAlt,
    borderWidth: 1,
    borderColor: SpringaColors.border,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  fuelChip: {
    backgroundColor: SpringaColors.tintWarning,
    borderColor: SpringaColors.warning + '4D',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '500',
    color: SpringaColors.text,
  },
  stats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  stat: {
    fontSize: 13,
    color: SpringaColors.muted,
  },
  statValue: {
    fontWeight: '600',
    color: SpringaColors.text,
  },
  statUnit: {
    color: SpringaColors.muted,
  },
});
