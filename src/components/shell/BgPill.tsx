import { StyleSheet, Text, View } from 'react-native';
import { SpringaColors } from '@/theme/colors';

export function BgPill() {
  const color = SpringaColors.success;
  return (
    <View
      style={[
        styles.pill,
        {
          borderColor: color + '40',
          backgroundColor: color + '15',
        },
      ]}>
      <Text style={[styles.text, { color }]}>6.2 → 2m ago</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
  },
  text: { fontSize: 14, fontWeight: '600' },
});
