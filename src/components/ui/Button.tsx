import { ActivityIndicator, Pressable, StyleSheet, type PressableProps } from 'react-native';
import { SpringaColors } from '@/theme/colors';
import { Radius, Spacing } from '@/theme/tokens';
import { AppText } from './AppText';

export type ButtonVariant = 'primary' | 'secondary' | 'destructive';

export type ButtonProps = Omit<PressableProps, 'children'> & {
  label: string;
  variant?: ButtonVariant;
  loading?: boolean;
};

export function Button({
  label,
  variant = 'primary',
  loading = false,
  disabled = false,
  style,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const textTone = variant === 'destructive' ? 'error' : 'primary';

  return (
    <Pressable
      {...props}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      style={(state) => [
        styles.button,
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

function toneColor(tone: 'primary' | 'error') {
  return tone === 'error' ? SpringaColors.error : SpringaColors.text;
}

const styles = StyleSheet.create({
  button: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    borderCurve: 'continuous',
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  primary: { backgroundColor: SpringaColors.brandAction },
  secondary: {
    backgroundColor: SpringaColors.surfaceAlt,
    borderColor: SpringaColors.border,
    borderWidth: 1,
  },
  destructive: { backgroundColor: SpringaColors.tintError },
  pressed: { opacity: 0.72 },
  disabled: { opacity: 0.48 },
});
