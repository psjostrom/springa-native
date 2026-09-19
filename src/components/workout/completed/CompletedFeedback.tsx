import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { MessageSquare, Pencil, ThumbsDown, ThumbsUp } from 'lucide-react-native';
import type { CalendarEvent, WorkoutProtocol } from '@/api/types';
import { AppText, Badge, Card, IconButton, Section } from '@/components/ui';
import { formatFeel, getProtocolPills } from '@/domain/formatProtocol';
import { SpringaColors } from '@/theme/colors';
import { Radius, Spacing } from '@/theme/tokens';

export { formatFeel, formatMode, formatTiming } from '@/domain/formatProtocol';

export type CompletedFeedbackProps = {
  event: CalendarEvent;
  protocol?: WorkoutProtocol | null;
  feel?: number | null;
  rpe?: number | null;
  onEdit?: () => void;
};

export function CompletedFeedback({
  event,
  protocol,
  feel: feelProp,
  rpe: rpeProp,
  onEdit,
}: CompletedFeedbackProps) {
  const router = useRouter();
  const feel = feelProp ?? event.feel ?? protocol?.feel;
  const rpe = rpeProp ?? event.rpe ?? protocol?.rpe;
  const isRated =
    event.isRated ??
    (feel != null || event.rating != null || protocol != null || Boolean(event.feedbackComment));
  const protocolPills = protocol ? getProtocolPills(protocol) : [];
  const comment = event.feedbackComment ?? protocol?.note;

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
                    <AppText variant="subheading" tone="primary">
                      Garmin: {formatFeel(feel)}
                      {rpe != null ? ` · RPE ${rpe}/10` : ''}
                    </AppText>
                  </View>
                ) : event.rating === 'good' || event.rating === 'bad' ? (
                  <View style={styles.ratingBadge}>
                    {event.rating === 'good' ? (
                      <ThumbsUp size={16} color={SpringaColors.success} />
                    ) : (
                      <ThumbsDown size={16} color={SpringaColors.error} />
                    )}
                    <AppText
                      variant="subheading"
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
                ) : event.rating === 'skipped' ? (
                  <View style={styles.ratingBadge}>
                    <Badge label="Rating skipped" tone="neutral" />
                  </View>
                ) : null}

                <IconButton
                  accessibilityLabel="Edit feedback"
                  onPress={navigateToFeedback}
                >
                  <Pencil color={SpringaColors.muted} size={16} />
                </IconButton>
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
