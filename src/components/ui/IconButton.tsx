import { Pressable, StyleSheet, type PressableProps } from 'react-native';
import { SpringaColors } from '@/theme/colors';
import { MinTouchTarget, Radius } from '@/theme/tokens';
import type { ButtonVariant } from './Button';

export type IconButtonProps = Omit<PressableProps, 'children' | 'accessibilityLabel'> & {
  accessibilityLabel: string;
  children: React.ReactNode;
  variant?: ButtonVariant;
};

export function IconButton({
  accessibilityLabel,
  children,
  variant = 'ghost',
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
        styles[variant],
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
  primary: { backgroundColor: SpringaColors.brandAction },
  secondary: {
    backgroundColor: SpringaColors.surfaceAlt,
    borderColor: SpringaColors.border,
    borderWidth: 1,
  },
  destructive: { backgroundColor: SpringaColors.tintError },
  ghost: { backgroundColor: 'transparent' },
  pressed: { opacity: 0.72 },
  disabled: { opacity: 0.48 },
});
