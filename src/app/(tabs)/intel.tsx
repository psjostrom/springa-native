import { StyleSheet, Text } from 'react-native';
import { ScreenShell } from '@/components/shell/ScreenShell';
import { SpringaColors } from '@/theme/colors';

export default function IntelScreen() {
  return (
    <ScreenShell>
      <Text style={styles.title}>Intel</Text>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  title: {
    marginTop: 48,
    textAlign: 'center',
    color: SpringaColors.muted,
    fontSize: 18,
  },
});
