import { StyleSheet, View, type ViewProps } from 'react-native';
import type { ReactNode } from 'react';
import { Spacing } from '@/theme/tokens';
import { AppText } from './AppText';

export type SectionProps = Omit<ViewProps, 'children'> & {
  title: string;
  icon?: ReactNode;
  trailing?: ReactNode;
  children: ReactNode;
};

export function Section({ title, icon, trailing, children, style, ...props }: SectionProps) {
  return (
    <View style={[styles.section, style]} {...props}>
      <View style={styles.header}>
        {icon}
        <AppText variant="subheading" style={styles.title}>{title}</AppText>
        {trailing}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: Spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  title: { flex: 1 },
});
