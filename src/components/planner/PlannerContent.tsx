import { useCallback, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { ApiError } from '@/api/client';
import type {
  PlannerApplyResponse,
  PlannerConfig,
  PlannerPreview,
} from '@/api/types';
import { AppText, Button, Card, StateView } from '@/components/ui';
import { usePlannerMutations, usePlannerQuery } from '@/query/usePlanner';
import { useSettingsQuery } from '@/query/useSettingsQuery';
import { Spacing } from '@/theme/tokens';
import { NewProgramEditor } from './NewProgramEditor';
import { PlannerConfigEditor } from './PlannerConfigEditor';
import { PlannerFuelRatesCard } from './PlannerFuelRatesCard';
import { PlannerPreviewView } from './PlannerPreview';
import { PlannerSummaryCard } from './PlannerSummaryCard';
import { plannerConfigAffectsPlan, validatePlannerDraft } from './plannerDraft';

type PlannerMode = 'collapsed' | 'edit-config' | 'new-program' | 'preview';

export function PlannerContent() {
  const planner = usePlannerQuery();
  const settings = useSettingsQuery();
  const mutations = usePlannerMutations();
  const [mode, setMode] = useState<PlannerMode>('collapsed');
  const [draft, setDraft] = useState<PlannerConfig | null>(null);
  const [draftErrors, setDraftErrors] = useState<Record<string, string>>({});
  const [configError, setConfigError] = useState<string | null>(null);
  const [preview, setPreview] = useState<PlannerPreview | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const previewRequestId = useRef(0);
  const [result, setResult] = useState<{
    response: PlannerApplyResponse;
    intent: PlannerPreview['intent'];
  } | null>(null);
  const currentConfig = planner.state?.currentConfig ?? null;

  useFocusEffect(useCallback(() => () => setResult(null), []));

  if (planner.status === 'idle') return null;
  if (planner.status === 'loading') {
    return (
      <View style={styles.stateWrap}>
        <Card tone="subtle" style={styles.skeleton} />
        <StateView loading title="Loading planner…" />
      </View>
    );
  }
  if (planner.status === 'error' || planner.state == null) {
    return (
      <StateView
        title="Couldn’t load planner"
        message={planner.error ?? 'Something went wrong.'}
        onRetry={planner.reload}
        retryLabel="Retry"
        retryAccessibilityLabel="Retry loading planner"
      />
    );
  }

  const state = planner.state;
  const settingsReady = settings.status !== 'ready' || settings.settings?.diabetesMode !== false;

  const beginEdit = () => {
    if (currentConfig == null) return;
    setDraft({ ...currentConfig, runDays: [...currentConfig.runDays] });
    setDraftErrors({});
    setConfigError(null);
    setPreviewError(null);
    setMode('edit-config');
  };

  const beginNewProgram = () => {
    setDraft({ ...state.newProgramDraft, runDays: [...state.newProgramDraft.runDays] });
    setDraftErrors({});
    setConfigError(null);
    setPreviewError(null);
    setPreview(null);
    setResult(null);
    setMode('new-program');
  };

  const cancelDraft = () => {
    previewRequestId.current += 1;
    setDraft(null);
    setDraftErrors({});
    setConfigError(null);
    setPreviewError(null);
    setPreview(null);
    setMode('collapsed');
  };

  const validateDraft = (next: PlannerConfig, skipTimelineMatch = false) => {
    const errors = validatePlannerDraft(next, state.fitnessOptions, state.constraints, new Date(), { skipTimelineMatch });
    setDraftErrors(errors);
    return errors;
  };

  const saveConfig = async () => {
    if (draft == null) return;
    const errors = validateDraft(draft, state.plan.status === 'active');
    if (Object.keys(errors).length > 0) return;
    if (state.plan.status === 'active') {
      const unchanged = currentConfig != null && !plannerConfigAffectsPlan(currentConfig, draft);
      if (unchanged && state.plan.sync?.status !== 'dirty') {
        cancelDraft();
        return;
      }
      await requestPreview('update', draft);
      return;
    }
    try {
      await mutations.saveConfig.mutateAsync(draft);
      setMode('collapsed');
    } catch (error) {
      setConfigError(error instanceof Error ? error.message : 'Couldn’t save planner settings.');
      if (error instanceof ApiError && error.details?.fields) {
        setDraftErrors((previous) => ({ ...previous, ...error.details?.fields }));
      }
    }
  };

  const requestPreview = async (intent: 'start' | 'update', next: PlannerConfig) => {
    const requestId = ++previewRequestId.current;
    const errors = validateDraft(next, intent === 'update' && state.plan.status === 'active');
    if (Object.keys(errors).length > 0) return;
    setPreviewError(null);
    try {
      const nextPreview = await mutations.preview.mutateAsync({ intent, config: next });
      if (requestId !== previewRequestId.current) return;
      setPreview(nextPreview);
      setDraft(nextPreview.config);
      setMode('preview');
    } catch (error) {
      if (requestId !== previewRequestId.current) return;
      if (error instanceof ApiError && error.details?.fields) {
        setDraftErrors((previous) => ({ ...previous, ...error.details?.fields }));
      }
      setPreviewError(error instanceof Error ? error.message : 'Couldn’t preview plan.');
    }
  };

  const applyPreview = async () => {
    if (preview == null) return;
    previewRequestId.current += 1;
    const intent = preview.intent;
    setPreviewError(null);
    try {
      const response = await mutations.apply.mutateAsync({
        intent: preview.intent,
        config: preview.config,
        previewHash: preview.previewHash,
      });
      setResult({ response, intent });
      setMode('collapsed');
    } catch (error) {
      setPreviewError(error instanceof Error ? error.message : 'Couldn’t apply plan.');
    }
  };

  const retryPreview = () => {
    if (preview != null) void requestPreview(preview.intent, preview.config);
  };

  if (mode === 'edit-config' && draft != null) {
    return (
      <PlannerConfigEditor
        value={draft}
        errors={draftErrors}
        requestError={configError ?? previewError}
        saving={mutations.saveConfig.isPending || mutations.preview.isPending}
        onChange={(next) => {
          setDraft(next);
          setDraftErrors({});
          setConfigError(null);
          setPreviewError(null);
        }}
        onCancel={cancelDraft}
        onDone={() => void saveConfig()}
      />
    );
  }

  if (mode === 'new-program' && draft != null) {
    return (
      <NewProgramEditor
        value={draft}
        errors={draftErrors}
        fitnessOptions={state.fitnessOptions}
        constraints={state.constraints}
        previewing={mutations.preview.isPending}
        previewError={previewError}
        onChange={(next) => {
          setDraft(next);
          setDraftErrors({});
          setPreviewError(null);
        }}
        onCancel={cancelDraft}
        onPreview={() => void requestPreview('start', draft)}
      />
    );
  }

  if (mode === 'preview' && preview != null) {
    return (
      <PlannerPreviewView
        preview={preview}
        error={previewError}
        applying={mutations.apply.isPending}
        onEdit={() => {
          previewRequestId.current += 1;
          setDraft(preview.config);
          setDraftErrors({});
          setConfigError(null);
          setMode(preview.intent === 'start' ? 'new-program' : 'edit-config');
        }}
        onCancel={cancelDraft}
        onApply={() => void applyPreview()}
        onPreviewAgain={retryPreview}
      />
    );
  }

  const summaryConfig = currentConfig ?? state.newProgramDraft;
  const active = state.plan.status === 'active';
  return (
    <>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {result ? (
          <Card tone="brand" accessibilityLiveRegion="polite">
            <AppText tone="success" variant="label">
              {result.intent === 'start' ? 'Program started.' : 'Program updated.'}
            </AppText>
            {result.response.warnings.map((warning) => (
              <AppText key={warning.code} tone="warning">{warning.message}</AppText>
            ))}
          </Card>
        ) : null}
        {state.plan.status === 'complete' ? (
          <Card tone="brand">
            <AppText variant="subheading">
              {summaryConfig.raceName.trim() ? `${summaryConfig.raceName} is complete.` : 'Your program is complete.'}
            </AppText>
            <AppText tone="muted">Start a fresh plan for the next race without repeating account setup.</AppText>
          </Card>
        ) : (
          <PlannerSummaryCard
            config={summaryConfig}
            hasActivePlan={active}
            weeksToGo={state.plan.weeksToGo}
            onEdit={currentConfig == null ? undefined : beginEdit}
          />
        )}
        <Button
          label="Start New Program"
          variant={state.plan.status === 'complete' ? 'primary' : 'secondary'}
          onPress={beginNewProgram}
        />
        <PlannerFuelRatesCard fuelRates={state.fuelRates} enabled={settingsReady} />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  content: { gap: Spacing.lg, padding: Spacing.lg, paddingBottom: Spacing.xxl * 2 },
  stateWrap: { gap: Spacing.lg, padding: Spacing.lg },
  skeleton: { height: 100, opacity: 0.6 },
});
