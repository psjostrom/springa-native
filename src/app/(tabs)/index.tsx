import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { AgendaGate } from '@/components/agenda/AgendaGate';
import { AgendaList } from '@/components/agenda/AgendaList';
import { ScreenShell } from '@/components/shell/ScreenShell';
import { Card } from '@/components/ui';
import { Spacing } from '@/theme/tokens';

export default function CalendarScreen() {
  const router = useRouter();

  return (
    <ScreenShell>
      <View style={styles.body}>
        <AgendaGate>
          <Card style={styles.card}>
            <AgendaList
              onOpenWorkout={(eventId) => {
                router.push({ pathname: '/workout/[id]', params: { id: eventId } });
              }}
            />
          </Card>
        </AgendaGate>
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, padding: Spacing.xs, paddingBottom: Spacing.sm },
  card: { flex: 1 },
});
