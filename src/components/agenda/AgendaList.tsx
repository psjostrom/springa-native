import { History, Plus } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  AGENDA_EVENTS,
  MOCK_TODAY,
  hasEventOnDay,
  splitAgendaEvents,
} from '@/fixtures/agenda';
import { SpringaColors } from '@/theme/colors';
import { AgendaEventCard } from './AgendaEventCard';

export function AgendaList() {
  const { earlier, upcoming } = splitAgendaEvents(AGENDA_EVENTS, MOCK_TODAY);
  const showGenerateToday = !hasEventOnDay(AGENDA_EVENTS, MOCK_TODAY);
  const earlierLabel =
    earlier.length === 1
      ? '1 earlier workout'
      : `${earlier.length} earlier workouts`;

  return (
    <View style={styles.list}>
      {earlier.length > 0 ? (
        <Pressable onPress={() => {}} style={styles.earlierRow}>
          <History size={16} color={SpringaColors.muted} />
          <Text style={styles.earlierText}>{earlierLabel}</Text>
        </Pressable>
      ) : null}

      {showGenerateToday ? (
        <Pressable onPress={() => {}} style={styles.generateRow}>
          <Plus size={16} color={SpringaColors.muted} />
          <Text style={styles.generateText}>Generate workout for today</Text>
        </Pressable>
      ) : null}

      {upcoming.map((event) => (
        <AgendaEventCard key={event.id} event={event} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 8,
    backgroundColor: 'transparent',
  },
  earlierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  earlierText: {
    fontSize: 13,
    color: SpringaColors.muted,
  },
  generateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: SpringaColors.border,
  },
  generateText: {
    fontSize: 13,
    color: SpringaColors.muted,
  },
});
