import { Host, Switch } from '@expo/ui';
import { Pressable, StyleSheet, View } from 'react-native';
import type { PlannerConfig, PlannerWeekday } from '@/api/types';
import { AppText, Section } from '@/components/ui';
import { SpringaColors } from '@/theme/colors';
import { Radius, Spacing } from '@/theme/tokens';
import {
  PLANNER_DAYS,
  setClubDay,
  setClubEnabled,
  setClubType,
  setLongRunDay,
  speedDayLabel,
  toggleRunDay,
} from './plannerDraft';

type PlannerScheduleEditorProps = {
  value: PlannerConfig;
  onChange: (value: PlannerConfig) => void;
  errors?: Record<string, string>;
};

function DayChip({
  day,
  label,
  selected,
  disabled,
  accessibilityLabel,
  onPress,
}: {
  day: PlannerWeekday;
  label: string;
  selected: boolean;
  disabled?: boolean;
  accessibilityLabel: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected, ...(disabled ? { disabled: true } : {}) }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.chip, selected && styles.selectedChip, disabled && styles.disabledChip]}
    >
      <AppText tone={selected ? 'primary' : 'muted'} variant="label">{label}</AppText>
    </Pressable>
  );
}

export function PlannerScheduleEditor({ value, onChange, errors = {} }: PlannerScheduleEditorProps) {
  const clubEnabled = value.clubDay != null;
  return (
    <View style={styles.root}>
      <Section title="Run days">
        <View style={styles.chips}>
          {PLANNER_DAYS.map((item) => (
            <DayChip
              key={item.day}
              day={item.day}
              label={item.shortLabel}
              selected={value.runDays.includes(item.day)}
              accessibilityLabel={`${item.label} run day`}
              onPress={() => onChange(toggleRunDay(value, item.day))}
            />
          ))}
        </View>
        {errors.runDays ? <AppText tone="error" variant="caption">{errors.runDays}</AppText> : null}
      </Section>

      {value.clubType !== 'long' ? (
        <Section title="Long run day">
          <View style={styles.chips}>
            {PLANNER_DAYS.filter((item) => value.runDays.includes(item.day)).map((item) => (
              <DayChip
                key={item.day}
                day={item.day}
                label={item.shortLabel}
                selected={value.longRunDay === item.day}
                accessibilityLabel={`${item.label} long run day`}
                onPress={() => onChange(setLongRunDay(value, item.day))}
              />
            ))}
          </View>
          {speedDayLabel(value) ? <AppText tone="muted" variant="caption">{speedDayLabel(value)}</AppText> : null}
          {errors.longRunDay ? <AppText tone="error" variant="caption">{errors.longRunDay}</AppText> : null}
        </Section>
      ) : null}

      <View style={styles.clubSection}>
        <View style={styles.switchRow}>
          <AppText variant="subheading">Club run</AppText>
          <Host
            colorScheme="dark"
            seedColor={SpringaColors.brand}
            style={styles.switchHost}
            accessible
            accessibilityRole="switch"
            accessibilityLabel="Club run"
            accessibilityState={{ checked: clubEnabled }}
            onAccessibilityTap={() => onChange(setClubEnabled(value, !clubEnabled))}
          >
            <Switch
              value={clubEnabled}
              onValueChange={(enabled) => onChange(setClubEnabled(value, enabled))}
              testID="planner-club-switch"
            />
          </Host>
        </View>
        {clubEnabled ? (
          <>
            <View style={styles.chips}>
              {PLANNER_DAYS.filter((item) => value.runDays.includes(item.day)).map((item) => (
                <DayChip
                  key={item.day}
                  day={item.day}
                  label={item.shortLabel}
                  selected={value.clubDay === item.day}
                  disabled={value.clubType !== 'long' && item.day === value.longRunDay}
                  accessibilityLabel={`${item.label} club day`}
                  onPress={() => onChange(setClubDay(value, item.day))}
                />
              ))}
            </View>
            <View style={styles.chips}>
              {(['long', 'speed', 'varies'] as const).map((type) => (
                <Pressable
                  key={type}
                  accessibilityRole="button"
                  accessibilityLabel={`${type} club run`}
                  accessibilityState={{ selected: value.clubType === type }}
                  onPress={() => onChange(setClubType(value, type))}
                  style={[styles.chip, value.clubType === type && styles.selectedChip]}
                >
                  <AppText tone={value.clubType === type ? 'primary' : 'muted'} variant="label">
                    {type === 'long' ? 'Long run' : type === 'speed' ? 'Speed work' : 'Varies'}
                  </AppText>
                </Pressable>
              ))}
            </View>
            <AppText tone="muted" variant="caption">
              {value.clubType === 'speed'
                ? 'Springa skips its own speed session.'
                : value.clubType === 'long'
                  ? `Club day (${PLANNER_DAYS.find((item) => item.day === value.clubDay)?.shortLabel ?? ''}) is the long run day.`
                  : 'Club day varies between long and quality work.'}
            </AppText>
            {errors.clubDay ? <AppText tone="error" variant="caption">{errors.clubDay}</AppText> : null}
            {errors.clubType ? <AppText tone="error" variant="caption">{errors.clubType}</AppText> : null}
          </>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: Spacing.xl },
  clubSection: { gap: Spacing.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: {
    minHeight: 44,
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: SpringaColors.surfaceAlt,
    borderColor: SpringaColors.border,
    borderWidth: 1,
  },
  disabledChip: { opacity: 0.48 },
  selectedChip: { backgroundColor: SpringaColors.brandAction, borderColor: SpringaColors.brand },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.md },
  switchHost: { width: 64, height: 48, alignItems: 'flex-end', justifyContent: 'center' },
});
