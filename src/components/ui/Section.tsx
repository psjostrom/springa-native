import { StyleSheet, View, type ViewProps } from 'react-native';
import type { ReactNode } from 'react';
import { Spacing } from '@/theme/tokens';
import { AppText } from './AppText';

export type SectionProps = Omit<ViewProps, 'children'> & {
  title: string;
  children: ReactNode;
};

export function Section({ title, children, style, ...props }: SectionProps) {
  return (
    <View style={[styles.section, style]} {...props}>
      <AppText variant="subheading">{title}</AppText>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: Spacing.md },
});
