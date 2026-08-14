import { forwardRef, useState } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import { SpringaColors } from '@/theme/colors';
import { MinTouchTarget, Radius, Spacing, Typography } from '@/theme/tokens';
import { AppText } from './AppText';

export type TextFieldProps = TextInputProps & {
  error?: string;
};

export const TextField = forwardRef<TextInput, TextFieldProps>(function TextField(
  { error, editable = true, onBlur, onFocus, style, ...props },
  ref,
) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.field}>
      <TextInput
        {...props}
        ref={ref}
        editable={editable}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        placeholderTextColor={props.placeholderTextColor ?? SpringaColors.muted}
        selectionColor={SpringaColors.brand}
        style={[
          styles.input,
          focused && styles.focused,
          !editable && styles.disabled,
          error && styles.error,
          style,
        ]}
      />
      {error ? <AppText accessibilityRole="alert" accessible variant="caption" tone="error">{error}</AppText> : null}
    </View>
  );
});

const styles = StyleSheet.create({
  field: { gap: Spacing.xs },
  input: {
    minHeight: MinTouchTarget,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: SpringaColors.surfaceAlt,
    borderColor: SpringaColors.border,
    borderCurve: 'continuous',
    borderRadius: Radius.md,
    borderWidth: 1,
    color: SpringaColors.text,
    ...Typography.body,
  },
  focused: { borderColor: SpringaColors.brand },
  disabled: { opacity: 0.48 },
  error: { borderColor: SpringaColors.error },
});
