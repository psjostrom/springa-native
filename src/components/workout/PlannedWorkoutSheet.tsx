import { StyleSheet, Text, View } from 'react-native';
import { SpringaColors } from '@/theme/colors';

/** Placeholder body for planned / missed / race — filled in milestone 4. */
export function PlannedWorkoutSheet() {
  return (
    <View style={styles.box} accessibilityLabel="Planned workout details">
      <Text style={styles.text}>Planned workout</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    paddingVertical: 16,
    paddingHorizontal: 4,
  },
  text: {
    color: SpringaColors.muted,
    fontSize: 14,
  },
});
