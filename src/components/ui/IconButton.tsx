import { Pressable, StyleSheet, type PressableProps } from 'react-native';
import { MinTouchTarget, Radius } from '@/theme/tokens';

export type IconButtonProps = Omit<PressableProps, 'children' | 'accessibilityLabel'> & {
  accessibilityLabel: string;
  children: React.ReactNode;
};

export function IconButton({
  accessibilityLabel,
  children,
  disabled,
  style,
  ...props
}: IconButtonProps) {
  return (
    <Pressable
      {...props}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      disabled={disabled}
      style={(state) => [
        styles.button,
        state.pressed && styles.pressed,
        disabled && styles.disabled,
        typeof style === 'function' ? style(state) : style,
      ]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: MinTouchTarget,
    height: MinTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderCurve: 'continuous',
    borderRadius: Radius.pill,
  },
  pressed: { opacity: 0.72 },
  disabled: { opacity: 0.48 },
});
