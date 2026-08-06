import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SpringaColors } from '@/theme/colors';

const MODES = ['Month', 'Week', 'Agenda'] as const;

export function ViewModeSwitcher() {
  return (
    <View style={styles.container}>
      {MODES.map((mode) => {
        const selected = mode === 'Agenda';
        const pill = (
          <View style={[styles.pill, selected ? styles.pillSelected : styles.pillIdle]}>
            <Text style={[styles.label, selected ? styles.labelSelected : styles.labelIdle]}>
              {mode}
            </Text>
          </View>
        );

        if (selected) {
          return (
            <View key={mode} style={styles.flex}>
              {pill}
            </View>
          );
        }

        return (
          <Pressable key={mode} style={styles.flex} onPress={() => {}}>
            {pill}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 6,
    padding: 2,
  },
  flex: {
    flex: 1,
  },
  pill: {
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillSelected: {
    backgroundColor: SpringaColors.brand,
  },
  pillIdle: {
    backgroundColor: SpringaColors.surfaceAlt,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
  labelSelected: {
    color: '#fff',
  },
  labelIdle: {
    color: SpringaColors.muted,
  },
});
