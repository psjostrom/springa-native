import { StyleSheet, View } from 'react-native';
import { AgendaGate } from '@/components/agenda/AgendaGate';
import { AgendaList } from '@/components/agenda/AgendaList';
import { ScreenShell } from '@/components/shell/ScreenShell';
import { SpringaColors } from '@/theme/colors';

export default function CalendarScreen() {
  return (
    <ScreenShell>
      <View style={styles.body}>
        <AgendaGate>
          <View style={styles.card}>
            <AgendaList />
          </View>
        </AgendaGate>
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, padding: 4, paddingBottom: 8 },
  card: {
    flex: 1,
    backgroundColor: SpringaColors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: SpringaColors.border,
    padding: 8,
  },
});
