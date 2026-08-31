import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { ApiError } from '@/api/client';
import type { ApiErrorDetails } from '@/api/errors';
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
import { PlannerUpdateChoiceSheet } from './PlannerUpdateChoiceSheet';
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
  const [previewErrorDetails, setPreviewErrorDetails] = useState<ApiErrorDetails | null>(null);
  const [savedConfig, setSavedConfig] = useState<PlannerConfig | null>(null);
  const [updateChoicePresented, setUpdateChoicePresented] = useState(false);
  const [result, setResult] = useState<PlannerApplyResponse | null>(null);
  const currentConfig = planner.state?.currentConfig ?? null;

  useEffect(() => setSavedConfig(null), [currentConfig]);

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
  const effectiveConfig = savedConfig ?? currentConfig;

  const beginEdit = () => {
    if (effectiveConfig == null) return;
    setDraft({ ...effectiveConfig, runDays: [...effectiveConfig.runDays] });
    setDraftErrors({});
    setConfigError(null);
    setPreviewError(null);
    setPreviewErrorDetails(null);
    setMode('edit-config');
  };

  const beginNewProgram = () => {
    setDraft({ ...state.newProgramDraft, runDays: [...state.newProgramDraft.runDays] });
    setDraftErrors({});
    setConfigError(null);
    setPreviewError(null);
    setPreviewErrorDetails(null);
    setPreview(null);
    setResult(null);
    setMode('new-program');
  };

  const validateDraft = (next: PlannerConfig, isNew = mode === 'new-program') => {
    const errors = validatePlannerDraft(next, state.fitnessOptions, state.constraints, new Date(), isNew);
    setDraftErrors(errors);
    return errors;
  };

  const saveConfig = async () => {
    if (draft == null) return;
    const errors = validateDraft(draft, false);
    if (Object.keys(errors).length > 0) return;
    const planChanged = effectiveConfig != null && plannerConfigAffectsPlan(effectiveConfig, draft);
    try {
      await mutations.saveConfig.mutateAsync(draft);
      setSavedConfig(draft);
      setMode('collapsed');
      if (planChanged && state.plan.status === 'active' && (state.plan.weeksToGo ?? 0) > 0) {
        setUpdateChoicePresented(true);
      }
    } catch (error) {
      setConfigError(error instanceof Error ? error.message : 'Couldn’t save planner settings.');
      if (error instanceof ApiError && error.details?.fields) {
        setDraftErrors((previous) => ({ ...previous, ...error.details?.fields }));
      }
    }
  };

  const requestPreview = async (intent: 'start' | 'update', next: PlannerConfig) => {
    const errors = validateDraft(next, intent === 'start');
    if (Object.keys(errors).length > 0) return;
    setPreviewError(null);
    setPreviewErrorDetails(null);
    try {
      const nextPreview = await mutations.preview.mutateAsync({ intent, config: next });
      setPreview(nextPreview);
      setDraft(nextPreview.config);
      setMode('preview');
    } catch (error) {
      if (error instanceof ApiError && error.details?.fields) {
        setDraftErrors((previous) => ({ ...previous, ...error.details?.fields }));
      }
      setPreviewErrorDetails(error instanceof ApiError ? error.details ?? null : null);
      setPreviewError(error instanceof Error ? error.message : 'Couldn’t preview plan.');
    }
  };

  const applyPreview = async () => {
    if (preview == null) return;
    setPreviewError(null);
    setPreviewErrorDetails(null);
    try {
      const response = await mutations.apply.mutateAsync({
        intent: preview.intent,
        config: preview.config,
        previewHash: preview.previewHash,
      });
      setResult(response);
      setMode('collapsed');
    } catch (error) {
      setPreviewErrorDetails(error instanceof ApiError ? error.details ?? null : null);
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
        requestError={configError}
        fitnessOptions={state.fitnessOptions}
        constraints={state.constraints}
        saving={mutations.saveConfig.isPending}
        onChange={(next) => {
          setDraft(next);
          setDraftErrors({});
          setConfigError(null);
        }}
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
          setPreviewErrorDetails(null);
        }}
        onCancel={() => {
          setDraft(null);
          setDraftErrors({});
          setConfigError(null);
          setPreviewError(null);
          setPreviewErrorDetails(null);
          setMode('collapsed');
        }}
        onPreview={() => void requestPreview('start', draft)}
      />
    );
  }

  if (mode === 'preview' && preview != null) {
    return (
      <PlannerPreviewView
        preview={preview}
        error={previewError}
        errorDetails={previewErrorDetails}
        applying={mutations.apply.isPending}
        onEdit={() => {
          setDraft(preview.config);
          setDraftErrors({});
          setConfigError(null);
          setMode(preview.intent === 'start' ? 'new-program' : 'edit-config');
        }}
        onCancel={() => {
          setPreview(null);
          setPreviewError(null);
          setPreviewErrorDetails(null);
          setMode('collapsed');
        }}
        onApply={() => void applyPreview()}
        onPreviewAgain={retryPreview}
      />
    );
  }

  const summaryConfig = effectiveConfig ?? state.newProgramDraft;
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
              {result.action === 'replace-plan' ? 'Program started.' : 'Workouts updated.'}
            </AppText>
            {result.warnings.map((warning) => (
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
            onEdit={effectiveConfig == null ? undefined : beginEdit}
          />
        )}
        <Button
          label="Start New Program"
          variant={state.plan.status === 'complete' ? 'primary' : 'secondary'}
          onPress={beginNewProgram}
        />
        {active && state.plan.sync?.status === 'dirty' ? (
          <Card tone="brand">
            <AppText variant="label">
              {state.plan.sync.dirtyKind === 'target-only' ? 'Targets changed' : 'Schedule changed'}
            </AppText>
            <Button label="Preview update" onPress={() => void requestPreview('update', effectiveConfig ?? state.newProgramDraft)} />
          </Card>
        ) : null}
        {previewError && !mutations.preview.isPending ? (
          <Card tone="subtle">
            <AppText accessibilityRole="alert" tone="error">{previewError}</AppText>
            {active ? (
              <Button
                label="Preview update"
                variant="secondary"
                onPress={() => void requestPreview('update', effectiveConfig ?? state.newProgramDraft)}
              />
            ) : null}
          </Card>
        ) : null}
        <PlannerFuelRatesCard fuelRates={state.fuelRates} enabled={settingsReady} />
      </ScrollView>
      <PlannerUpdateChoiceSheet
        isPresented={updateChoicePresented}
        onDismiss={() => setUpdateChoicePresented(false)}
        onKeep={() => setUpdateChoicePresented(false)}
        onPreview={() => {
          setUpdateChoicePresented(false);
          const configToUse = effectiveConfig ?? state.newProgramDraft;
          void requestPreview('update', configToUse);
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  content: { gap: Spacing.lg, padding: Spacing.lg, paddingBottom: Spacing.xxl * 2 },
  stateWrap: { gap: Spacing.lg, padding: Spacing.lg },
  skeleton: { height: 100, opacity: 0.6 },
});
