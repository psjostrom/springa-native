import { ScrollView, StyleSheet, View } from 'react-native';
import { AgendaList } from '@/components/agenda/AgendaList';
import { ViewModeSwitcher } from '@/components/agenda/ViewModeSwitcher';
import { ScreenShell } from '@/components/shell/ScreenShell';
import { SpringaColors } from '@/theme/colors';

export default function CalendarScreen() {
  return (
    <ScreenShell>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <ViewModeSwitcher />
        </View>
        <View style={styles.card}>
          <AgendaList />
        </View>
      </ScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  content: { padding: 4, paddingBottom: 24, gap: 6 },
  card: {
    backgroundColor: SpringaColors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: SpringaColors.border,
    padding: 8,
  },
});
