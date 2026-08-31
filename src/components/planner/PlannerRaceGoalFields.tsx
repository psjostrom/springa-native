import DateTimePicker from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import type { PlannerConfig } from '@/api/types';
import { AppText, Section, TextField } from '@/components/ui';
import { SpringaColors } from '@/theme/colors';
import { Radius, Spacing } from '@/theme/tokens';
import { setRaceDate } from './plannerDraft';

type PlannerRaceGoalFieldsProps = {
  value: PlannerConfig;
  onChange: (value: PlannerConfig) => void;
  errors?: Record<string, string>;
};

function dateFromValue(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year || 2026, (month || 1) - 1, day || 1, 12);
}

function dateOnly(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function PlannerRaceGoalFields({ value, onChange, errors = {} }: PlannerRaceGoalFieldsProps) {
  const [pickerVisible, setPickerVisible] = useState(false);
  const [raceDistanceText, setRaceDistanceText] = useState(String(value.raceDist));
  return (
    <Section title="Race goal">
      <TextField
        accessibilityLabel="Race name"
        autoCapitalize="words"
        onChangeText={(raceName) => onChange({ ...value, raceName })}
        placeholder="Race name (optional)"
        value={value.raceName}
        error={errors.raceName}
      />
      <TextField
        accessibilityLabel="Race distance"
        keyboardType="decimal-pad"
        onChangeText={(text) => {
          setRaceDistanceText(text);
          const normalized = text.replace(',', '.');
          const next = Number(normalized);
          if (Number.isFinite(next) && !normalized.endsWith('.')) {
            onChange({ ...value, raceDist: next });
          }
        }}
        onBlur={() => setRaceDistanceText(String(value.raceDist))}
        value={raceDistanceText}
        error={errors.raceDist}
      />
      <View style={styles.dateField}>
        <AppText variant="label">Race date</AppText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Choose race date"
          onPress={() => setPickerVisible(true)}
          style={styles.dateButton}
        >
          <AppText>{value.raceDate}</AppText>
        </Pressable>
        {errors.raceDate ? <AppText tone="error" variant="caption">{errors.raceDate}</AppText> : null}
      </View>
      {pickerVisible ? (
        <DateTimePicker
          accessibilityLabel="Choose race date"
          value={dateFromValue(value.raceDate)}
          mode="date"
          display="default"
          onChange={(_event, selectedDate) => {
            if (Platform.OS === 'android') setPickerVisible(false);
            if (selectedDate) onChange(setRaceDate(value, dateOnly(selectedDate), new Date()));
          }}
          onDismiss={() => setPickerVisible(false)}
        />
      ) : null}
    </Section>
  );
}

const styles = StyleSheet.create({
  dateField: { gap: Spacing.xs },
  dateButton: {
    minHeight: 52,
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    borderColor: SpringaColors.border,
    borderWidth: 1,
    backgroundColor: SpringaColors.surfaceAlt,
  },
});
