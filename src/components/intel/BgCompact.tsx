import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppBottomSheet } from '@/components/ui/AppBottomSheet';
import { AppText, Badge } from '@/components/ui';
import type { CategoryBGResponse } from '@/lib/bgModel';
import { SpringaColors } from '@/theme/colors';
import { Radius, Spacing } from '@/theme/tokens';

type Props = {
  categories: CategoryBGResponse[];
};

const CATEGORY_NAMES: Record<string, string> = {
  easy: 'Easy',
  long: 'Long',
  interval: 'Interval',
};

const CATEGORY_EXPLANATIONS: Record<string, string> = {
  easy: 'During easy aerobic running, muscles consume glucose steadily. A modest drop rate indicates basal insulin and fueling are well balanced.',
  long: 'Extended endurance efforts steadily deplete glycogen, driving higher glucose uptake. Planned carb intake helps prevent late-run drops.',
  interval: 'High intensity intervals trigger adrenaline and stress hormones, which can transiently stabilize or spike BG before sharper post-effort drops.',
};

export function BgCompact({ categories }: Props) {
  const [selectedCat, setSelectedCat] = useState<CategoryBGResponse | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  if (!categories || categories.length === 0) return null;

  return (
    <>
      <View style={styles.container}>
        {categories.map((cat) => {
          // medianRate is in mmol/L per minute -> convert to mmol/hr
          const ratePerHour = cat.medianRate * 60;
          const formattedRate =
            ratePerHour > 0
              ? `+${ratePerHour.toFixed(1)}`
              : ratePerHour.toFixed(1);

          let color: string = SpringaColors.success;
          let stability = 'Stable';
          if (ratePerHour < -3) {
            color = SpringaColors.error;
            stability = 'Fast drop';
          } else if (ratePerHour < -1) {
            color = SpringaColors.warning;
            stability = 'Moderate';
          }

          const label = CATEGORY_NAMES[cat.category] ?? cat.category.toUpperCase();

          return (
            <Pressable
              key={cat.category}
              accessibilityRole="button"
              accessibilityLabel={`${label} runs, ${formattedRate} mmol/L/h, ${stability}`}
              onPress={() => {
                setSelectedCat(cat);
                setIsSheetOpen(true);
              }}
              style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
            >
              <AppText variant="caption" tone="muted" style={styles.categoryLabel}>
                {label.toUpperCase()}
              </AppText>
              <View style={styles.rateRow}>
                <AppText variant="heading" style={{ color }}>
                  {formattedRate}
                </AppText>
                <AppText variant="caption" tone="muted" style={styles.unit}>
                  mmol/L/h
                </AppText>
              </View>
              <AppText variant="caption" style={{ color, fontWeight: '600' }}>
                {stability}
              </AppText>
              {cat.avgFuelRate != null && (
                <AppText variant="caption" tone="muted" style={styles.fuelRate}>
                  {cat.avgFuelRate} g/h
                </AppText>
              )}
            </Pressable>
          );
        })}
      </View>

      <AppBottomSheet
        isPresented={isSheetOpen}
        onDismiss={() => setIsSheetOpen(false)}
        onDismissComplete={() => setSelectedCat(null)}
      >
        <View style={styles.sheetContent}>
          {selectedCat ? (() => {
            const ratePerHour = selectedCat.medianRate * 60;
            const formattedRate =
              ratePerHour > 0
                ? `+${ratePerHour.toFixed(1)}`
                : ratePerHour.toFixed(1);

            let color: string = SpringaColors.success;
            let stability = 'Stable';
            let tone: 'success' | 'warning' | 'error' = 'success';
            if (ratePerHour < -3) {
              color = SpringaColors.error;
              stability = 'Fast drop';
              tone = 'error';
            } else if (ratePerHour < -1) {
              color = SpringaColors.warning;
              stability = 'Moderate drop';
              tone = 'warning';
            }

            const label = CATEGORY_NAMES[selectedCat.category] ?? selectedCat.category;
            const explanation = CATEGORY_EXPLANATIONS[selectedCat.category] ?? '';

            return (
              <>
                <View style={styles.sheetHeader}>
                  <AppText variant="subheading">
                    {label} Runs
                  </AppText>
                  <Badge label={stability} tone={tone} />
                </View>

                <View style={styles.rateHighlight}>
                  <AppText variant="heading" style={{ color, fontSize: 32 }}>
                    {formattedRate}
                  </AppText>
                  <AppText variant="body" tone="muted">
                    mmol/L/h
                  </AppText>
                </View>

                <AppText variant="body" tone="muted" style={styles.explanationText}>
                  {explanation}
                </AppText>

                <View style={styles.statsCard}>
                  <View style={styles.statRow}>
                    <AppText variant="caption" tone="muted">
                      Runs analyzed
                    </AppText>
                    <AppText variant="body" style={styles.statValue}>
                      {selectedCat.activityCount}
                    </AppText>
                  </View>
                  <View style={styles.divider} />
                  <View style={styles.statRow}>
                    <AppText variant="caption" tone="muted">
                      Telemetry data points
                    </AppText>
                    <AppText variant="body" style={styles.statValue}>
                      {selectedCat.sampleCount}
                    </AppText>
                  </View>
                  {selectedCat.avgFuelRate != null && (
                    <>
                      <View style={styles.divider} />
                      <View style={styles.statRow}>
                        <AppText variant="caption" tone="muted">
                          Average fuel intake
                        </AppText>
                        <AppText variant="body" style={styles.statValue}>
                          {selectedCat.avgFuelRate} g/h
                        </AppText>
                      </View>
                    </>
                  )}
                  <View style={styles.divider} />
                  <View style={styles.statRow}>
                    <AppText variant="caption" tone="muted">
                      Model confidence
                    </AppText>
                    <Badge
                      label={selectedCat.confidence.toUpperCase()}
                      tone={
                        selectedCat.confidence === 'high'
                          ? 'success'
                          : selectedCat.confidence === 'medium'
                          ? 'warning'
                          : 'neutral'
                      }
                    />
                  </View>
                </View>
              </>
            );
          })() : null}
        </View>
      </AppBottomSheet>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  card: {
    flex: 1,
    backgroundColor: SpringaColors.surfaceAlt,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: SpringaColors.border,
    alignItems: 'flex-start',
  },
  cardPressed: {
    opacity: 0.8,
  },
  categoryLabel: {
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: Spacing.xs,
  },
  rateRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 3,
    marginBottom: Spacing.xxs,
  },
  unit: {
    fontSize: 10,
  },
  fuelRate: {
    marginTop: Spacing.xxs,
  },
  sheetContent: {
    paddingVertical: Spacing.sm,
    gap: Spacing.md,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rateHighlight: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.xs,
  },
  explanationText: {
    lineHeight: 20,
  },
  statsCard: {
    backgroundColor: SpringaColors.surfaceAlt,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: SpringaColors.border,
    gap: Spacing.xs,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.xxs,
  },
  statValue: {
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: SpringaColors.border,
  },
});
