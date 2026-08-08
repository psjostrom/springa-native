import { StyleSheet, Text, View } from 'react-native';
import { SpringaColors } from '@/theme/colors';

/** Placeholder body for completed — filled in milestone 5. */
export function CompletedWorkoutSheet() {
  return (
    <View style={styles.box} accessibilityLabel="Completed workout details">
      <Text style={styles.text}>Completed workout</Text>
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
