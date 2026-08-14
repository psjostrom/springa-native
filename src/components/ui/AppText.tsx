import { Text, type TextProps } from 'react-native';
import { SpringaColors } from '@/theme/colors';
import { Typography } from '@/theme/tokens';

export type AppTextVariant = keyof typeof Typography;
export type AppTextTone = 'primary' | 'muted' | 'brand' | 'success' | 'warning' | 'error';

export type AppTextProps = TextProps & {
  variant?: AppTextVariant;
  tone?: AppTextTone;
};

const toneColors = {
  primary: SpringaColors.text,
  muted: SpringaColors.muted,
  brand: SpringaColors.brandText,
  success: SpringaColors.success,
  warning: SpringaColors.warning,
  error: SpringaColors.error,
} as const;

export function AppText({ variant = 'body', tone = 'primary', style, ...props }: AppTextProps) {
  return <Text style={[Typography[variant], { color: toneColors[tone] }, style]} {...props} />;
}
