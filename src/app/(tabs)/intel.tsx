import { StyleSheet } from 'react-native';
import { ScreenShell } from '@/components/shell/ScreenShell';
import { AppText } from '@/components/ui';
import { Spacing } from '@/theme/tokens';

export default function IntelScreen() {
  return (
    <ScreenShell>
      <AppText variant="subheading" tone="muted" style={styles.title}>Intel</AppText>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  title: {
    marginTop: Spacing.xxl,
    textAlign: 'center',
  },
});
