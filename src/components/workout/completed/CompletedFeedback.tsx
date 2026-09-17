import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { MessageSquare, Smile, ThumbsDown, ThumbsUp } from 'lucide-react-native';
import type { CalendarEvent, WorkoutProtocol } from '@/api/types';
import { AppText, Badge, Card, Section } from '@/components/ui';
import { formatFeel, getProtocolPills } from '@/domain/formatProtocol';
import { SpringaColors } from '@/theme/colors';
import { Radius, Spacing } from '@/theme/tokens';

export { formatFeel, formatMode, formatTiming } from '@/domain/formatProtocol';

export type CompletedFeedbackProps = {
  event: CalendarEvent;
  protocol?: WorkoutProtocol | null;
  feel?: number | null;
  rpe?: number | null;
  saveFeedback?: unknown;
  pending?: boolean;
  error?: string | null;
  onInputFocus?: unknown;
  onEdit?: () => void;
};

export function CompletedFeedback({
  event,
  protocol,
  feel,
  rpe,
  onEdit,
}: CompletedFeedbackProps) {
  const router = useRouter();
  const isRated =
    event.rating != null ||
    feel != null ||
    protocol != null ||
    Boolean(event.feedbackComment);

  const navigateToFeedback = () => {
    if (onEdit) {
      onEdit();
      return;
    }
    router.push({
      pathname: '/feedback',
      params: { activityId: event.activityId, eventId: event.id },
    });
  };

  const protocolPills = protocol ? getProtocolPills(protocol) : [];
  const comment = event.feedbackComment ?? protocol?.note;

  return (
    <Card style={styles.card}>
      <Section icon={MessageSquare} title="Feedback">
        <View style={styles.content}>
          {isRated ? (
            <View style={styles.ratedContainer}>
              {/* Rating / Feel row */}
              <View style={styles.ratingRow}>
                {feel != null ? (
                  <View style={styles.garminBadge} testID="garmin-feel-badge">
                    <Smile size={16} color={SpringaColors.brand} />
                    <AppText variant="label" tone="primary">
                      Garmin: {formatFeel(feel)}
                      {rpe != null ? ` · RPE ${rpe}/10` : ''}
                    </AppText>
                  </View>
                ) : event.rating ? (
                  <View style={styles.ratingBadge}>
                    {event.rating === 'good' ? (
                      <ThumbsUp size={16} color={SpringaColors.success} />
                    ) : (
                      <ThumbsDown size={16} color={SpringaColors.error} />
                    )}
                    <AppText
                      variant="label"
                      style={{
                        color:
                          event.rating === 'good'
                            ? SpringaColors.success
                            : SpringaColors.error,
                      }}
                    >
                      {event.rating === 'good' ? 'Good' : 'Bad'}
                    </AppText>
                  </View>
                ) : null}

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Edit feedback"
                  onPress={navigateToFeedback}
                  style={styles.editButton}
                  hitSlop={8}
                >
                  <AppText variant="caption" tone="primary" style={styles.editText}>
                    Edit
                  </AppText>
                </Pressable>
              </View>

              {/* Protocol pills */}
              {protocolPills.length > 0 && (
                <View style={styles.pillsRow}>
                  {protocolPills.map((pill, idx) => (
                    <Badge key={idx} label={pill} tone="neutral" />
                  ))}
                </View>
              )}

              {/* Note / Comment */}
              {comment ? (
                <AppText variant="body" tone="muted" style={styles.commentText}>
                  {comment}
                </AppText>
              ) : null}
            </View>
          ) : (
            <View style={styles.unratedRow}>
              <AppText variant="body" tone="muted" style={styles.unratedText}>
                Run not yet rated
              </AppText>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Rate run"
                onPress={navigateToFeedback}
                style={styles.rateButton}
              >
                <AppText variant="label" style={styles.rateButtonText}>
                  Rate
                </AppText>
              </Pressable>
            </View>
          )}
        </View>
      </Section>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  content: {
    marginTop: Spacing.xs,
  },
  ratedContainer: {
    gap: Spacing.sm,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  garminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  editButton: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: Radius.sm,
    backgroundColor: SpringaColors.surfaceAlt,
    borderColor: SpringaColors.border,
    borderWidth: 1,
  },
  editText: {
    color: SpringaColors.brandText,
    fontWeight: '600',
  },
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  commentText: {
    fontSize: 14,
    lineHeight: 20,
  },
  unratedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.xxs,
  },
  unratedText: {
    fontSize: 14,
  },
  rateButton: {
    backgroundColor: SpringaColors.success,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.md,
  },
  rateButtonText: {
    color: SpringaColors.bg,
    fontWeight: '700',
    fontSize: 14,
  },
});
