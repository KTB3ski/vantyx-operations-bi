import { formatCurrency, formatPercent } from './formatters';
import { EXPENSE_BREAKDOWN_FIELDS } from './expenseBreakdown';
import { operatingAreaVarianceDemoData } from './weeklyGopControl';
import type {
  PeriodCalculation,
  PeriodInput,
  PeriodKey,
  ProjectionCalculation,
  SnapshotDraft,
} from './types';

export type AnalystTone = 'recover' | 'protected' | 'steady' | 'needs-data';
export type AnalystConfidence = 'High' | 'Medium' | 'Low';

export interface AnalystEvidenceItem {
  label: string;
  value: string;
  detail: string;
  tone: 'positive' | 'watch' | 'neutral';
}

export interface VyntaxAnalystBriefing {
  tone: AnalystTone;
  headline: string;
  summary: string;
  primaryRecommendation: string;
  confidence: AnalystConfidence;
  confidenceReason: string;
  evidence: AnalystEvidenceItem[];
  nextSteps: string[];
}

export interface BuildVyntaxAnalystBriefingInput {
  draft: SnapshotDraft;
  periodInputs: Record<PeriodKey, PeriodInput>;
  calculations: Record<PeriodKey, PeriodCalculation>;
  projections: Record<PeriodKey, ProjectionCalculation>;
  reportingPeriodKey: PeriodKey;
}

const MONEY_THRESHOLD = 1;

function absoluteGapText(gap: number) {
  if (Math.abs(gap) <= MONEY_THRESHOLD) return `On target ${formatCurrency(0)}`;
  return gap > 0
    ? `Gap ${formatCurrency(gap)}`
    : `Surplus ${formatCurrency(Math.abs(gap))}`;
}

function gapTone(gap: number): AnalystEvidenceItem['tone'] {
  if (gap > MONEY_THRESHOLD) return 'watch';
  if (gap < -MONEY_THRESHOLD) return 'positive';
  return 'neutral';
}

function hasExpenseBreakdown(input: PeriodInput) {
  return EXPENSE_BREAKDOWN_FIELDS.some((field) => input[field.key] > 0);
}

function topExpenseLine(input: PeriodInput) {
  return EXPENSE_BREAKDOWN_FIELDS.map((field) => ({
    label: field.label,
    amount: input[field.key],
  })).sort((a, b) => b.amount - a.amount)[0];
}

function enabledOperatingGaps(draft: SnapshotDraft) {
  const enabled = new Set(draft.propertySetup.enabledOperatingAreaIds);
  return operatingAreaVarianceDemoData
    .filter((area) => enabled.has(area.id) && area.variance < -MONEY_THRESHOLD)
    .sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance));
}

function recoveryRevenueText(calculation: PeriodCalculation) {
  return calculation.revenueNeededAtFlowThrough.achievable
    ? formatCurrency(calculation.revenueNeededAtFlowThrough.amount)
    : calculation.revenueNeededAtFlowThrough.message ||
        'Not available at current flow-through.';
}

function actualFlowText(calculation: PeriodCalculation) {
  if (calculation.actualFlow.actualFlowThroughPct !== null) {
    return formatPercent(calculation.actualFlow.actualFlowThroughPct);
  }
  return calculation.actualFlow.message || 'Not available';
}

function analystConfidence(
  input: PeriodInput,
  calculation: PeriodCalculation,
): Pick<VyntaxAnalystBriefing, 'confidence' | 'confidenceReason'> {
  if (calculation.actualRevenue <= 0 || calculation.targetGopPctUsed <= 0) {
    return {
      confidence: 'Low',
      confidenceReason: 'Needs revenue, GOP, and target inputs.',
    };
  }

  if (
    hasExpenseBreakdown(input) &&
    input.revenuePlan !== null &&
    input.gopPlan !== null &&
    input.priorYearRevenue !== null
  ) {
    return {
      confidence: 'High',
      confidenceReason: 'Revenue plan, GOP plan, expense detail, and prior-year context are present.',
    };
  }

  return {
    confidence: 'Medium',
    confidenceReason: 'Core GOP math is present; add plan or expense detail for deeper diagnosis.',
  };
}

export function buildVyntaxAnalystBriefing({
  draft,
  periodInputs,
  calculations,
  projections,
  reportingPeriodKey,
}: BuildVyntaxAnalystBriefingInput): VyntaxAnalystBriefing {
  const input = periodInputs[reportingPeriodKey];
  const calculation = calculations[reportingPeriodKey];
  const projection = projections[reportingPeriodKey];
  const currentGap = Math.max(calculation.dollarGap, 0);
  const currentSurplus = Math.max(-calculation.dollarGap, 0);
  const projectedGap = Math.max(projection.projectedRemainingGap, 0);
  const projectedSurplus = Math.max(-projection.projectedRemainingGap, 0);
  const topAreaGap = enabledOperatingGaps(draft)[0];
  const topExpense = topExpenseLine(input);
  const confidence = analystConfidence(input, calculation);

  if (calculation.actualRevenue <= 0 || calculation.targetGopPctUsed <= 0) {
    return {
      tone: 'needs-data',
      headline: 'Enter the operating numbers to activate the analyst read.',
      summary:
        'Vyntax needs revenue, GOP or expenses, target GOP, and days remaining before it can give a reliable hotel operating recommendation.',
      primaryRecommendation:
        'Start in Enter Numbers with revenue, expenses or manual GOP, target GOP %, days remaining, and recovery flow-through.',
      ...confidence,
      evidence: [
        {
          label: 'Revenue',
          value: formatCurrency(calculation.actualRevenue),
          detail: 'Core input for GOP and target math.',
          tone: 'neutral',
        },
        {
          label: 'Target GOP',
          value: formatPercent(calculation.targetGopPctUsed),
          detail: 'Needed to judge the operating position.',
          tone: 'neutral',
        },
      ],
      nextSteps: [
        'Enter revenue and either expenses or manual GOP.',
        'Confirm target GOP % and days remaining.',
        'Build the action plan after the results card shows a position.',
      ],
    };
  }

  const projectedPosition =
    projectedGap > MONEY_THRESHOLD
      ? `still leaves ${formatCurrency(projectedGap)} unresolved`
      : projectedSurplus > MONEY_THRESHOLD
        ? `protects target with ${formatCurrency(projectedSurplus)} cushion`
        : 'brings the property back to target';

  const hasCurrentGap = currentGap > MONEY_THRESHOLD;
  const isProjectedProtected = projectedGap <= MONEY_THRESHOLD;
  const tone: AnalystTone = hasCurrentGap
    ? isProjectedProtected
      ? 'protected'
      : 'recover'
    : 'steady';

  const headline = hasCurrentGap
    ? isProjectedProtected
      ? 'The gap is recoverable with the current action plan.'
      : 'The property needs more recovery impact before month end.'
    : currentSurplus > MONEY_THRESHOLD
      ? 'The property is ahead of target; protect the lead.'
      : 'The property is tracking to target.';

  const summary = hasCurrentGap
    ? `Current GOP is ${formatCurrency(
        currentGap,
      )} behind target. The action plan ${projectedPosition}, with ${formatCurrency(
        calculation.dailyRecoveryNeeded,
      )} of daily GOP recovery needed before actions.`
    : `Current GOP is ${formatCurrency(
        currentSurplus,
      )} ahead of target. Keep daily controls tight so the forecast stays at or above ${formatPercent(
        calculation.targetGopPctUsed,
      )} GOP.`;

  const primaryRecommendation = hasCurrentGap
    ? topAreaGap
      ? `Start with ${topAreaGap.area}: it is ${formatCurrency(
          Math.abs(topAreaGap.variance),
        )} below weekly plan and is the clearest controllable gap.`
      : topExpense && topExpense.amount > 0
        ? `Start with ${topExpense.label}: it is the largest expense line in the current input set.`
        : 'Assign one owner to the GOP gap and confirm the highest controllable expense line today.'
    : topAreaGap
      ? `Protect the current position and watch ${topAreaGap.area}, which is still below weekly plan.`
      : 'Hold the current operating rhythm and continue daily checks against revenue, labor, and controllable expenses.';

  const nextSteps = hasCurrentGap
    ? [
        topAreaGap
          ? `Assign an owner for ${topAreaGap.area} today.`
          : 'Assign an owner for the largest controllable variance today.',
        `Keep the action plan impact at or above ${formatCurrency(currentGap)} for this period.`,
        calculation.revenueNeededAtFlowThrough.achievable
          ? `Use revenue lift only where expected flow-through can beat the ${formatPercent(
              calculation.targetGopPctUsed,
            )} GOP target.`
          : 'Use expense or direct GOP actions first because revenue growth will not close the gap at the current flow-through.',
      ]
    : [
        'Keep the current action plan in place.',
        'Watch any weekly operating area that is still below plan.',
        'Create the snapshot once the operator agrees with the inputs.',
      ];

  return {
    tone,
    headline,
    summary,
    primaryRecommendation,
    ...confidence,
    evidence: [
      {
        label: 'Current Position',
        value: absoluteGapText(calculation.dollarGap),
        detail: `${formatPercent(calculation.actualGopPct)} actual GOP vs ${formatPercent(
          calculation.targetGopPctUsed,
        )} target.`,
        tone: gapTone(calculation.dollarGap),
      },
      {
        label: 'Forecasted Position',
        value: absoluteGapText(projection.projectedRemainingGap),
        detail: projection.projectedStatus,
        tone: gapTone(projection.projectedRemainingGap),
      },
      {
        label: 'Recovery Revenue',
        value: recoveryRevenueText(calculation),
        detail: `${formatPercent(input.flowThroughPct)} recovery flow-through.`,
        tone: currentGap > MONEY_THRESHOLD ? 'watch' : 'neutral',
      },
      {
        label: 'Actual Flow',
        value: actualFlowText(calculation),
        detail: calculation.actualFlow.basisLabel,
        tone: calculation.actualFlow.actualFlowThroughPct === null ? 'neutral' : 'positive',
      },
    ],
    nextSteps,
  };
}
