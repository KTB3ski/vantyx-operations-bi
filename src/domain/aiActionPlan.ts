import { invoke } from '@tauri-apps/api/core';
import { formatCurrency, formatPercent } from './formatters';
import {
  getReportingViewLabel,
} from './reporting';
import { isTauriRuntime } from './storage';
import { EXPENSE_BREAKDOWN_FIELDS } from './expenseBreakdown';
import { OPERATING_AREA_DEFINITIONS } from './propertySetup';
import { operatingAreaVarianceDemoData } from './weeklyGopControl';
import { cleanActionPlanNote, type ActionPlanRecommendation } from './actionPlan';
import type {
  PeriodCalculation,
  PeriodInput,
  PeriodKey,
  ProjectionAdjustment,
  ProjectionCalculation,
  SnapshotDraft,
} from './types';

export type OpenAiActionPlanModel = 'gpt-5-mini' | 'gpt-5.2';

export interface AiSettings {
  apiKey: string;
  model: OpenAiActionPlanModel;
}

export interface AiActionPlanRequest {
  app: 'Vyntax';
  task: 'hotel_gop_action_plan';
  guardrails: string[];
  context: {
    property: string;
    operator: string;
    reportingView: string;
    period: string;
    status: string;
    targetGopPct: string;
    actualGopPct: string;
    actualGop: string;
    targetGop: string;
    currentGap: string;
    forecastedGapBeforeActionPlan: string;
    dailyRecoveryNeeded: string;
    revenueNeededAtRecoveryFlowThrough: string;
    recoveryFlowThroughPct: string;
    actualFlowThrough: string;
  };
  enabledOperatingAreas: string[];
  operatingAreaGaps: Array<{
    area: string;
    variance: string;
    note: string;
  }>;
  expenseBreakdown: Array<{
    label: string;
    amount: string;
  }>;
  baseRecommendations: Array<{
    recommendationId: string;
    title: string;
    lever: string;
    monthAmount: string;
    quarterAmount: string;
    yearAmount: string;
    note: string;
  }>;
}

export interface AiActionPlanDraftAction {
  recommendationId: string;
  title: string;
  note: string;
  priority: 'High' | 'Medium' | 'Low';
  timeframe: 'Today' | 'This Week' | 'Month-End';
  confidence: 'High' | 'Medium' | 'Low';
}

export interface AiActionPlanDraft {
  summary: string;
  actions: AiActionPlanDraftAction[];
}

export function createDefaultAiSettings(): AiSettings {
  return {
    apiKey: '',
    model: 'gpt-5-mini',
  };
}

function displayRecoveryRevenue(calculation: PeriodCalculation) {
  return calculation.revenueNeededAtFlowThrough.achievable
    ? formatCurrency(calculation.revenueNeededAtFlowThrough.amount)
    : calculation.revenueNeededAtFlowThrough.message ||
        'Revenue lift cannot close the gap at this flow-through.';
}

function displayActualFlow(calculation: PeriodCalculation) {
  if (calculation.actualFlow.message) return calculation.actualFlow.message;
  if (calculation.actualFlow.actualFlowThroughPct === null) {
    return 'Actual flow-through unavailable.';
  }
  return `${formatPercent(calculation.actualFlow.actualFlowThroughPct)} (${calculation.actualFlow.basisLabel})`;
}

function enabledAreaLabels(draft: SnapshotDraft) {
  const enabled = new Set(draft.propertySetup.enabledOperatingAreaIds);
  return OPERATING_AREA_DEFINITIONS.filter((area) => enabled.has(area.id)).map(
    (area) => area.label,
  );
}

function operatingAreaGaps(draft: SnapshotDraft) {
  const enabled = new Set(draft.propertySetup.enabledOperatingAreaIds);
  return operatingAreaVarianceDemoData
    .filter((area) => enabled.has(area.id) && area.variance < 0)
    .map((area) => ({
      area: area.area,
      variance: `-${formatCurrency(Math.abs(area.variance))}`,
      note: area.helperText,
    }));
}

function expenseBreakdown(input: PeriodInput) {
  return EXPENSE_BREAKDOWN_FIELDS.filter((field) => input[field.key] > 0).map(
    (field) => ({
      label: field.label,
      amount: formatCurrency(input[field.key]),
    }),
  );
}

export function buildAiActionPlanRequest(
  draft: SnapshotDraft,
  periodInputs: Record<PeriodKey, PeriodInput>,
  calculations: Record<PeriodKey, PeriodCalculation>,
  projections: Record<PeriodKey, ProjectionCalculation>,
  reportingPeriodKey: PeriodKey,
  baseRecommendations: ActionPlanRecommendation[],
): AiActionPlanRequest {
  const input = periodInputs[reportingPeriodKey];
  const calculation = calculations[reportingPeriodKey];
  const projection = projections[reportingPeriodKey];

  return {
    app: 'Vyntax',
    task: 'hotel_gop_action_plan',
    guardrails: [
      'Use only the facts and base recommendations provided by Vyntax.',
      'Do not invent new dollar impacts, forecasts, property facts, or departments.',
      'Keep recommendations practical for a hotel operator or AGM.',
      'Use calm executive language. Do not use alarmist wording.',
      'Preserve the meaning of each recommendation; improve clarity and priority only.',
      'Write like an analyst: state the operational reason, owner/action, timing, and verification point.',
      'Do not recommend generic cuts that could harm guest service without tying them to the provided variance.',
    ],
    context: {
      property: draft.propertyLocation || 'Not set',
      operator: draft.operatorName || 'Not set',
      reportingView: getReportingViewLabel(
        draft.reportingView,
        draft.ptdPeriodName,
      ),
      period: draft.reportingMonth || draft.weekEnding || 'Current period',
      status: calculation.status,
      targetGopPct: formatPercent(calculation.targetGopPctUsed),
      actualGopPct: formatPercent(calculation.actualGopPct),
      actualGop: formatCurrency(calculation.actualGop),
      targetGop: formatCurrency(calculation.targetGop),
      currentGap: formatCurrency(Math.max(calculation.dollarGap, 0)),
      forecastedGapBeforeActionPlan: formatCurrency(
        Math.max(projection.projectedRemainingGap, 0),
      ),
      dailyRecoveryNeeded: formatCurrency(calculation.dailyRecoveryNeeded),
      revenueNeededAtRecoveryFlowThrough: displayRecoveryRevenue(calculation),
      recoveryFlowThroughPct: formatPercent(input.flowThroughPct),
      actualFlowThrough: displayActualFlow(calculation),
    },
    enabledOperatingAreas: enabledAreaLabels(draft),
    operatingAreaGaps: operatingAreaGaps(draft),
    expenseBreakdown: expenseBreakdown(input),
    baseRecommendations: baseRecommendations.map((recommendation) => ({
      recommendationId: recommendation.recommendationId,
      title: recommendation.description,
      lever: recommendation.type,
      monthAmount: formatCurrency(recommendation.monthImpact),
      quarterAmount: formatCurrency(recommendation.quarterImpact),
      yearAmount: formatCurrency(recommendation.yearImpact),
      note: recommendation.notes,
    })),
  };
}

export function mergeAiActionPlanDraft(
  baseRecommendations: ActionPlanRecommendation[],
  draft: AiActionPlanDraft,
): ActionPlanRecommendation[] {
  const actionById = new Map(
    draft.actions.map((action) => [action.recommendationId, action]),
  );

  return baseRecommendations.map((recommendation) => {
    const aiAction = actionById.get(recommendation.recommendationId);
    if (!aiAction) return recommendation;

    return {
      ...recommendation,
      description: aiAction.title.trim() || recommendation.description,
      notes: cleanActionPlanNote(aiAction.note.trim() || recommendation.notes),
    };
  });
}

export async function draftAiActionPlan(
  settings: AiSettings,
  payload: AiActionPlanRequest,
): Promise<AiActionPlanDraft> {
  const apiKey = settings.apiKey.trim();
  if (!apiKey) {
    throw new Error('Plan Assist access is not configured.');
  }
  if (!isTauriRuntime()) {
    throw new Error('Enhanced action planning runs through the Vyntax desktop app.');
  }

  return invoke<AiActionPlanDraft>('generate_ai_action_plan', {
    apiKey,
    model: settings.model,
    payload,
  });
}

export function toProjectionAdjustments(
  recommendations: ActionPlanRecommendation[],
  createId: () => string,
): ProjectionAdjustment[] {
  return recommendations.map((recommendation) => ({
    id: createId(),
    ...recommendation,
  }));
}
