import { Children } from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';
import { Spacing } from '@/theme/tokens';

export type GridProps = ViewProps;

export function Grid({ children, style, ...props }: GridProps) {
  return (
    <View {...props} style={[styles.grid, style]}>
      {Children.map(children, (child) => <View style={styles.cell}>{child}</View>)}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  cell: {
    minWidth: 112,
    flexBasis: 130,
    flexGrow: 1,
  },
});
