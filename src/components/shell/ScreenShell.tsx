import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/ui';
import { SpringaColors } from '@/theme/colors';
import { Spacing } from '@/theme/tokens';
import { TopBar } from './TopBar';

type ScreenShellProps = {
  children: ReactNode;
  title?: string;
};

export function ScreenShell({ children, title }: ScreenShellProps) {
  return (
    <View style={styles.root}>
      <TopBar />
      <View style={styles.body}>
        {title ? (
          <AppText variant="subheading" tone="muted" style={styles.title}>
            {title}
          </AppText>
        ) : null}
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: SpringaColors.bg,
  },
  body: {
    flex: 1,
  },
  title: {
    marginTop: Spacing.xxl,
    textAlign: 'center',
  },
});
