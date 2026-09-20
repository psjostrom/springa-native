import { Activity, Award, Layers, TrendingUp } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { BgCompact } from '@/components/intel/BgCompact';
import { IntelSectionHeading } from '@/components/intel/IntelSectionHeading';
import { PaceCurvesChart } from '@/components/intel/PaceCurvesChart';
import { PacePBs } from '@/components/intel/PacePBs';
import { PaceSuggestionBanner } from '@/components/intel/PaceSuggestionBanner';
import { PhaseTracker } from '@/components/intel/PhaseTracker';
import { ReadinessPanel } from '@/components/intel/ReadinessPanel';
import { VolumeCompact } from '@/components/intel/VolumeCompact';
import { IntervalsGate } from '@/components/shell/IntervalsGate';
import { ScreenShell } from '@/components/shell/ScreenShell';
import { StateView } from '@/components/ui';
import { getMonday, getPhaseInfo } from '@/lib/phases';
import { useBgModelQuery } from '@/query/useBgModelQuery';
import { useCalendarEvents } from '@/query/useCalendarEvents';
import { usePaceCurvesQuery } from '@/query/usePaceCurvesQuery';
import { usePaceSuggestionQuery } from '@/query/usePaceSuggestionQuery';
import { useSettingsQuery } from '@/query/useSettingsQuery';
import { useWellnessQuery } from '@/query/useWellnessQuery';
import { Spacing } from '@/theme/tokens';

export default function IntelScreen() {
  const { settings, reload: reloadSettings } = useSettingsQuery();
  const { entries: wellnessEntries, reload: reloadWellness } = useWellnessQuery();
  const [timeWindow, setTimeWindow] = useState('all');
  const { data: paceCurveData, reload: reloadPaceCurves } =
    usePaceCurvesQuery(timeWindow);
  const {
    categories: bgCategories,
    activitiesAnalyzed,
    reload: reloadBgModel,
  } = useBgModelQuery(settings?.diabetesMode);
  const {
    events,
    isLoading: calendarLoading,
    isError: calendarError,
    error: calendarErrorMessage,
    reload: reloadCalendar,
    fetchOlder,
    hasOlder,
  } = useCalendarEvents();
  const {
    suggestion: paceSuggestion,
    accept: acceptPaceSuggestion,
    dismiss: dismissPaceSuggestion,
    isAccepting: isAcceptingPace,
    isDismissing: isDismissingPace,
    reload: reloadPaceSuggestion,
  } = usePaceSuggestionQuery();

  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (hasOlder && !calendarLoading) {
      void fetchOlder();
    }
  }, [hasOlder, calendarLoading, fetchOlder]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        reloadSettings(),
        reloadWellness(),
        reloadPaceCurves(),
        reloadBgModel(),
        reloadCalendar(),
        reloadPaceSuggestion(),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [
    reloadSettings,
    reloadWellness,
    reloadPaceCurves,
    reloadBgModel,
    reloadCalendar,
    reloadPaceSuggestion,
  ]);

  const phaseInfo = useMemo(
    () =>
      getPhaseInfo(
        settings?.raceDate,
        settings?.totalWeeks,
        settings?.includeBasePhase,
      ),
    [settings?.raceDate, settings?.totalWeeks, settings?.includeBasePhase],
  );

  const volumeData = useMemo(() => {
    const now = new Date();
    const monday = getMonday(now);
    const sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    let actualMeters = 0;
    let targetMeters = 0;
    let completedRuns = 0;
    let totalRuns = 0;

    for (const e of events) {
      const eventDate = new Date(e.date);
      if (eventDate >= monday && eventDate <= sunday) {
        if (e.type === 'completed') {
          actualMeters += e.distance ?? 0;
          completedRuns++;
        } else if (e.type === 'planned' || e.type === 'race') {
          targetMeters += e.distance ?? 0;
          totalRuns++;
        }
      }
    }

    const totalTargetMeters = actualMeters + targetMeters;

    return {
      actualKm: Math.round((actualMeters / 1000) * 10) / 10,
      targetKm: Math.round((totalTargetMeters / 1000) * 10) / 10,
      completedRuns,
      totalRuns: completedRuns + totalRuns,
    };
  }, [events]);

  const hasCompletedRuns = useMemo(
    () => events.some((e) => e.type === 'completed'),
    [events],
  );

  return (
    <ScreenShell>
      <IntervalsGate>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        >
          {calendarError && (
            <StateView
              title="Couldn’t load calendar"
              message={calendarErrorMessage ?? 'Failed to load calendar events.'}
              onRetry={reloadCalendar}
              retryLabel="Retry"
              retryAccessibilityLabel="Retry loading calendar"
            />
          )}

          {!calendarLoading &&
            !calendarError &&
            !hasCompletedRuns &&
            (!wellnessEntries || wellnessEntries.length === 0) && (
              <StateView
                title="No runs yet"
                message="Complete your first run to unlock training insights"
              />
            )}

          {phaseInfo && (
            <View style={styles.section}>
              <IntelSectionHeading icon={Layers} label="Phase" />
              <PhaseTracker phaseInfo={phaseInfo} />
            </View>
          )}

          {wellnessEntries && wellnessEntries.length > 0 && (
            <View style={styles.section}>
              <IntelSectionHeading icon={Activity} label="Readiness" />
              <ReadinessPanel entries={wellnessEntries} />
            </View>
          )}

          {paceSuggestion && (
            <View style={styles.section}>
              <PaceSuggestionBanner
                suggestion={paceSuggestion}
                onAccept={() =>
                  acceptPaceSuggestion(
                    paceSuggestion.suggestedAbilitySecs,
                    paceSuggestion.currentAbilityDist,
                  )
                }
                onDismiss={dismissPaceSuggestion}
                isAccepting={isAcceptingPace}
                isDismissing={isDismissingPace}
              />
            </View>
          )}

          <View style={styles.section}>
            <IntelSectionHeading icon={TrendingUp} label="Volume" />
            <VolumeCompact
              actualKm={volumeData.actualKm}
              targetKm={volumeData.targetKm}
              completedRuns={volumeData.completedRuns}
              totalRuns={volumeData.totalRuns}
              loading={calendarLoading}
            />
          </View>

          {Boolean(settings?.diabetesMode) &&
            bgCategories &&
            bgCategories.length > 0 && (
              <View style={styles.section}>
                <IntelSectionHeading
                  icon={Activity}
                  label="Blood Glucose"
                  meta={
                    activitiesAnalyzed
                      ? `${activitiesAnalyzed} runs analyzed`
                      : undefined
                  }
                />
                <BgCompact categories={bgCategories} />
              </View>
            )}

          {paceCurveData &&
            paceCurveData.bestEfforts &&
            paceCurveData.bestEfforts.length > 0 && (
              <View style={styles.section}>
                <IntelSectionHeading icon={Award} label="Personal Bests" />
                <PacePBs
                  bestEfforts={paceCurveData.bestEfforts}
                  longestRun={paceCurveData.longestRun}
                />
                <View style={styles.chartSpacer} />
                <PaceCurvesChart
                  curve={paceCurveData.curve}
                  timeWindow={timeWindow}
                  onTimeWindowChange={setTimeWindow}
                />
              </View>
            )}
        </ScrollView>
      </IntervalsGate>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xl,
    gap: Spacing.xl,
  },
  section: {
    gap: Spacing.xs,
  },
  chartSpacer: {
    height: Spacing.sm,
  },
});
