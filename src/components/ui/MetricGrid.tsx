import { Children, useState, type ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
  type LayoutChangeEvent,
  type PressableProps,
  type ViewProps,
} from 'react-native';
import { SpringaColors } from '@/theme/colors';
import { Radius, Spacing } from '@/theme/tokens';
import { AppText } from './AppText';

const MIN_METRIC_CELL_WIDTH = 144;

export type MetricCardProps = Omit<PressableProps, 'children'> & {
  label: string;
  value: string | number;
  unit?: string;
  judgment?: string;
  meter?: ReactNode;
};

export function MetricCard({
  label,
  value,
  unit,
  judgment,
  meter,
  style,
  ...props
}: MetricCardProps) {
  return (
    <Pressable
      accessibilityRole={props.onPress ? 'button' : undefined}
      style={(state) => [
        styles.card,
        state.pressed && props.onPress && styles.pressed,
        typeof style === 'function' ? style(state) : style,
      ]}
      {...props}
    >
      <AppText variant="caption" tone="muted">{label}</AppText>
      <View style={styles.valueRow}>
        <AppText variant="heading">{value}</AppText>
        {unit ? <AppText variant="label" tone="muted">{unit}</AppText> : null}
      </View>
      {judgment ? <AppText variant="caption" tone="muted">{judgment}</AppText> : null}
      {meter}
    </Pressable>
  );
}

export type MetricGridProps = ViewProps;

export function MetricGrid({ children, onLayout, style, ...props }: MetricGridProps) {
  const { fontScale } = useWindowDimensions();
  const [width, setWidth] = useState(0);
  const twoColumns = fontScale <= 1 && width >= MIN_METRIC_CELL_WIDTH * 2 + Spacing.md;
  const cellWidth = twoColumns ? (width - Spacing.md) / 2 : '100%';

  const handleLayout = (event: LayoutChangeEvent) => {
    setWidth(event.nativeEvent.layout.width);
    onLayout?.(event);
  };

  return (
    <View {...props} onLayout={handleLayout} style={[styles.grid, style]}>
      {Children.map(children, (child) => <View style={{ width: cellWidth }}>{child}</View>)}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  card: {
    minHeight: 112,
    gap: Spacing.xs,
    padding: Spacing.md,
    backgroundColor: SpringaColors.surfaceAlt,
    borderColor: SpringaColors.border,
    borderCurve: 'continuous',
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  valueRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', gap: Spacing.xs },
  pressed: { opacity: 0.72 },
});
