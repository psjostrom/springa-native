import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SpringaColors } from '@/theme/colors';
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
        {title ? <Text style={styles.title}>{title}</Text> : null}
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
    marginTop: 48,
    textAlign: 'center',
    color: SpringaColors.muted,
    fontSize: 18,
  },
});
