import { Settings } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/auth/AuthContext';
import { AppText, IconButton } from '@/components/ui';
import { SpringaColors } from '@/theme/colors';
import { IconSize, Spacing } from '@/theme/tokens';
import { BgPill } from './BgPill';
import { SpringaMark } from './SpringaMark';

export function TopBar() {
  const insets = useSafeAreaInsets();
  const { signOut } = useAuth();

  return (
    <View style={[styles.bar, { paddingTop: insets.top + Spacing.md }]}>
      <View style={styles.brand}>
        <SpringaMark size={IconSize.lg} />
        <AppText variant="heading" tone="brand" style={styles.wordmark}>
          springa
        </AppText>
      </View>
      <View style={styles.actions}>
        <BgPill />
        <IconButton
          onPress={() => {
            void signOut();
          }}
          accessibilityLabel="Sign out"
        >
          <Settings size={IconSize.md} color={SpringaColors.muted} />
        </IconButton>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: SpringaColors.surface,
    borderBottomWidth: 1,
    borderBottomColor: SpringaColors.border,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  wordmark: {
    // Android adds extra ascent padding that drops glyphs vs a centered mark.
    includeFontPadding: false,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
});
