import type { ReactElement } from 'react';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { MessageSquare, ThumbsDown, ThumbsUp } from 'lucide-react-native';
import type { CalendarEvent } from '@/api/types';
import { AppText, Button, Card, Section, TextField } from '@/components/ui';
import { SpringaColors } from '@/theme/colors';
import { MinTouchTarget, Radius, Spacing } from '@/theme/tokens';

type CompletedFeedbackProps = {
  event: CalendarEvent;
  saveFeedback: (input: { rating: 'good' | 'bad'; comment: string }) => void;
  pending: boolean;
  error: string | null;
  onInputFocus?: (input: TextInput) => void;
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
  const Icon = label === 'Good' ? ThumbsUp : ThumbsDown;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.rating, selected && styles.ratingSelected, disabled && styles.ratingDisabled]}
    >
      <Icon
        color={selected ? SpringaColors.brandText : SpringaColors.muted}
        size={20}
        accessible={false}
      />
    </Pressable>
  );
}

export function CompletedFeedback({
  event,
  saveFeedback,
  pending,
  error,
  onInputFocus,
}: CompletedFeedbackProps): ReactElement | null {
  const commentRef = useRef<TextInput>(null);
  const [rating, setRating] = useState<'good' | 'bad' | null>(null);
  const [comment, setComment] = useState('');

  if (event.rating != null) {
    return (
      <Section title="Feedback" icon={MessageSquare} iconColor={SpringaColors.muted}>
        <Card accessibilityLabel="Run feedback" style={styles.savedRow}>
          {event.rating === 'good' ? (
            <ThumbsUp color={SpringaColors.success} size={20} accessible={false} />
          ) : (
            <ThumbsDown color={SpringaColors.error} size={20} accessible={false} />
          )}
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
    <Section title="Feedback" icon={MessageSquare} iconColor={SpringaColors.muted}>
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
          ref={commentRef}
          accessibilityLabel="Feedback comment"
          placeholder="Optional comment..."
          multiline
          value={comment}
          onChangeText={setComment}
          onFocus={() => {
            if (commentRef.current != null) onInputFocus?.(commentRef.current);
          }}
          editable={!pending}
        />
        <Button
          label="Save"
          onPress={save}
          disabled={rating == null}
          loading={pending}
          style={styles.saveButton}
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
  saveButton: {
    alignSelf: 'flex-start',
    minWidth: MinTouchTarget,
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
    paddingHorizontal: Spacing.sm,
    gap: Spacing.xs,
  },
  ratingSelected: {
    borderColor: SpringaColors.brand,
  },
  ratingDisabled: {
    opacity: 0.48,
  },
});
