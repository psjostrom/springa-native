import type { ReactElement } from 'react';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { CalendarEvent } from '@/api/types';
import { AppText, Button, Card, Section, TextField } from '@/components/ui';
import { SpringaColors } from '@/theme/colors';
import { MinTouchTarget, Radius, Spacing } from '@/theme/tokens';

type CompletedFeedbackProps = {
  event: CalendarEvent;
  saveFeedback: (input: { rating: 'good' | 'bad'; comment: string }) => void;
  pending: boolean;
  error: string | null;
};

function RatingButton({
  label,
  selected,
  disabled,
  onPress,
}: {
  label: 'Good' | 'Bad';
  selected: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.rating, selected && styles.ratingSelected, disabled && styles.ratingDisabled]}
    >
      <AppText variant="label" tone={selected ? 'brand' : 'primary'}>{label}</AppText>
    </Pressable>
  );
}

export function CompletedFeedback({
  event,
  saveFeedback,
  pending,
  error,
}: CompletedFeedbackProps): ReactElement | null {
  const [rating, setRating] = useState<'good' | 'bad' | null>(null);
  const [comment, setComment] = useState('');

  if (event.rating != null) {
    return (
      <Section title="Feedback">
        <Card accessibilityLabel="Run feedback" style={styles.savedRow}>
          <AppText
            variant="subheading"
            tone={event.rating === 'good' ? 'success' : 'error'}
            selectable
          >
            {event.rating === 'good' ? 'Good' : 'Bad'}
          </AppText>
          {event.feedbackComment ? (
            <AppText tone="muted" selectable>{event.feedbackComment}</AppText>
          ) : null}
        </Card>
      </Section>
    );
  }

  const save = () => {
    if (rating == null || pending) return;
    saveFeedback({ rating, comment: comment.trim() });
  };

  return (
    <Section title="Feedback">
      <Card accessibilityLabel="Run feedback form" style={styles.form}>
        <View style={styles.ratingRow}>
          <RatingButton
            label="Good"
            selected={rating === 'good'}
            disabled={pending}
            onPress={() => setRating('good')}
          />
          <RatingButton
            label="Bad"
            selected={rating === 'bad'}
            disabled={pending}
            onPress={() => setRating('bad')}
          />
        </View>
        <TextField
          accessibilityLabel="Feedback comment"
          placeholder="Optional comment"
          multiline
          value={comment}
          onChangeText={setComment}
          editable={!pending}
        />
        <Button
          label="Save"
          onPress={save}
          disabled={rating == null}
          loading={pending}
        />
        {error ? (
          <AppText accessibilityRole="alert" tone="error">{error}</AppText>
        ) : null}
      </Card>
    </Section>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: Spacing.md,
  },
  savedRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  ratingRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  rating: {
    minHeight: MinTouchTarget,
    minWidth: MinTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderCurve: 'continuous',
    borderRadius: Radius.md,
    borderColor: SpringaColors.border,
    borderWidth: 1,
    paddingHorizontal: Spacing.lg,
  },
  ratingSelected: {
    borderColor: SpringaColors.brand,
  },
  ratingDisabled: {
    opacity: 0.48,
  },
});
