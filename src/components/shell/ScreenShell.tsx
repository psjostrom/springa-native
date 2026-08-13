import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { SpringaColors } from '@/theme/colors';
import { TopBar } from './TopBar';

type ScreenShellProps = {
  children: ReactNode;
};

export function ScreenShell({ children }: ScreenShellProps) {
  return (
    <View style={styles.root}>
      <TopBar />
      <View style={styles.body}>{children}</View>
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
});
