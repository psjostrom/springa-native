import { ActivityIndicator, Pressable, StyleSheet, type PressableProps } from 'react-native';
import { SpringaColors } from '@/theme/colors';
import { MinTouchTarget, Radius, Spacing } from '@/theme/tokens';
import { AppText } from './AppText';

export type ButtonVariant = 'primary' | 'secondary' | 'destructive' | 'ghost';
export type ButtonSize = 'default' | 'compact';

export type ButtonProps = Omit<PressableProps, 'children'> & {
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
};

export function Button({
  label,
  variant = 'primary',
  size = 'default',
  loading = false,
  disabled = false,
  style,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const textTone = variant === 'destructive' ? 'error' : variant === 'ghost' ? 'brand' : 'primary';

  return (
    <Pressable
      {...props}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      style={(state) => [
        styles.button,
        styles[size],
        styles[variant],
        state.pressed && styles.pressed,
        isDisabled && styles.disabled,
        typeof style === 'function' ? style(state) : style,
      ]}
    >
      {loading ? <ActivityIndicator color={toneColor(textTone)} size="small" /> : null}
      <AppText variant="label" tone={textTone}>{label}</AppText>
    </Pressable>
  );
}

function toneColor(tone: 'primary' | 'brand' | 'error') {
  return tone === 'brand'
    ? SpringaColors.brandText
    : tone === 'error'
      ? SpringaColors.error
      : SpringaColors.text;
}

const styles = StyleSheet.create({
  button: {
    minHeight: MinTouchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    borderCurve: 'continuous',
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.lg,
  },
  default: { minHeight: 52, paddingVertical: Spacing.md },
  compact: { paddingVertical: Spacing.sm },
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
