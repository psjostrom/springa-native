import { StyleSheet, View, type ViewProps } from 'react-native';
import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react-native';
import { SpringaColors } from '@/theme/colors';
import { Spacing } from '@/theme/tokens';
import { AppText } from './AppText';

export type SectionProps = Omit<ViewProps, 'children'> & {
  title: string;
  children: ReactNode;
  icon?: LucideIcon;
  iconColor?: string;
};

export function Section({ title, children, icon: Icon, iconColor, style, ...props }: SectionProps) {
  return (
    <View style={[styles.section, style]} {...props}>
      {Icon ? (
        <View style={styles.heading}>
          <Icon color={iconColor ?? SpringaColors.muted} size={16} accessible={false} />
          <AppText variant="label" tone="muted" style={styles.headingLabel}>
            {title}
          </AppText>
        </View>
      ) : (
        <AppText variant="subheading">{title}</AppText>
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: Spacing.md },
  heading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  headingLabel: {
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
});
