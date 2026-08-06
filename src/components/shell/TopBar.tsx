import { Settings, Sun } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SpringaColors } from '@/theme/colors';
import { BgPill } from './BgPill';

export function TopBar() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.bar, { paddingTop: insets.top + 12 }]}>
      <View style={styles.brand}>
        <Text style={styles.mark}>◆</Text>
        <Text style={styles.wordmark}>springa</Text>
      </View>
      <View style={styles.actions}>
        <BgPill />
        <Pressable onPress={() => {}} accessibilityRole="button" accessibilityLabel="Theme">
          <Sun size={20} color={SpringaColors.muted} />
        </Pressable>
        <Pressable onPress={() => {}} accessibilityRole="button" accessibilityLabel="Settings">
          <Settings size={20} color={SpringaColors.muted} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: SpringaColors.surface,
    borderBottomWidth: 1,
    borderBottomColor: SpringaColors.border,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  mark: {
    color: SpringaColors.brand,
    fontSize: 16,
  },
  wordmark: {
    color: SpringaColors.brand,
    fontSize: 20,
    fontWeight: '800',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
});
