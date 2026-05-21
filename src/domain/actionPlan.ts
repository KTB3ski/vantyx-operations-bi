import { formatCurrency, formatPercent } from './formatters';
import { EXPENSE_BREAKDOWN_FIELD_KEYS } from './expenseBreakdown';
import type { OperatingAreaId } from './propertySetup';
import { operatingAreaVarianceDemoData } from './weeklyGopControl';
import type {
  AdjustmentType,
  PeriodCalculation,
  PeriodInput,
  PeriodKey,
  ProjectionAdjustment,
  ProjectionCalculation,
  SnapshotDraft,
} from './types';

export type ActionPlanRecommendation = Omit<ProjectionAdjustment, 'id'> & {
  recommendationId: string;
  source: 'recommended';
};

export interface GenerateActionPlanInput {
  draft: SnapshotDraft;
  periodInputs: Record<PeriodKey, PeriodInput>;
  calculations: Record<PeriodKey, PeriodCalculation>;
  projections: Record<PeriodKey, ProjectionCalculation>;
  reportingPeriodKey: PeriodKey;
}

interface ActionCandidate {
  amountForGapReduction?: (gapReduction: number) => number;
  buildNote: (gapReduction: number, actionAmount: number) => string;
  flowThroughPct: number | null;
  maxGapReduction: number;
  recommendationId: string;
  title: string;
  type: AdjustmentType;
}

const MAX_RECOMMENDATIONS = 5;
const MIN_ACTION_AMOUNT = 1;
const ACTION_PLAN_METADATA_PATTERN =
  /\s*\|\s*(?:Priority|Timing|AI confidence|Confidence):\s*[^|]+/gi;
const PERIOD_SCALE: Record<PeriodKey, Record<PeriodKey, number>> = {
  month: {
    month: 1,
    quarter: 3,
    year: 12,
  },
  quarter: {
    month: 1 / 3,
    quarter: 1,
    year: 4,
  },
  year: {
    month: 1 / 12,
    quarter: 1 / 4,
    year: 1,
  },
};

function roundActionAmount(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value);
}

function hasBreakdownValues(input: PeriodInput) {
  return EXPENSE_BREAKDOWN_FIELD_KEYS.some((key) => (input[key] || 0) > 0);
}

function scaleActionAmount(period: PeriodKey, amount: number) {
  const scale = PERIOD_SCALE[period];
  return {
    monthImpact: roundActionAmount(amount * scale.month),
    quarterImpact: roundActionAmount(amount * scale.quarter),
    yearImpact: roundActionAmount(amount * scale.year),
  };
}

export function cleanActionPlanNote(note: string) {
  return note.replace(ACTION_PLAN_METADATA_PATTERN, '').trim();
}

export function formatActionPlanImpact(adjustment: ProjectionAdjustment) {
  const hasMonth = Math.abs(adjustment.monthImpact) > MIN_ACTION_AMOUNT;
  const hasQuarter = Math.abs(adjustment.quarterImpact) > MIN_ACTION_AMOUNT;
  const hasYear = Math.abs(adjustment.yearImpact) > MIN_ACTION_AMOUNT;
  if (!hasMonth && !hasQuarter && !hasYear) return 'No dollar impact needed yet.';

  return [
    hasMonth ? `Month ${formatCurrency(adjustment.monthImpact)}` : '',
    hasQuarter ? `Quarter ${formatCurrency(adjustment.quarterImpact)}` : '',
    hasYear ? `Year ${formatCurrency(adjustment.yearImpact)}` : '',
  ]
    .filter(Boolean)
    .join('; ');
}

function candidateImpactFromBasis(basis: number, rate: number) {
  if (basis <= 0) return 0;
  return Math.max(0, basis * rate);
}

function createDirectSavingsCandidate(
  recommendationId: string,
  title: string,
  basis: number,
  rate: number,
  note: (gapReduction: number) => string,
): ActionCandidate | null {
  const maxGapReduction = candidateImpactFromBasis(basis, rate);
  if (maxGapReduction <= MIN_ACTION_AMOUNT) return null;

  return {
    recommendationId,
    title,
    type: 'Expense cut / savings',
    maxGapReduction,
    flowThroughPct: null,
    buildNote: note,
  };
}

function getActiveOperatingAreaGaps(enabledIds: OperatingAreaId[]) {
  const enabled = new Set(enabledIds);
  return operatingAreaVarianceDemoData
    .filter((area) => enabled.has(area.id) && area.variance < -MIN_ACTION_AMOUNT)
    .sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance));
}

function buildOperatingAreaCandidates(draft: SnapshotDraft): ActionCandidate[] {
  return getActiveOperatingAreaGaps(
    draft.propertySetup.enabledOperatingAreaIds,
  ).map((area) => ({
    recommendationId: `area-${area.id}`,
    title: `Recover ${area.area} variance`,
    type: 'GOP improvement',
    maxGapReduction: Math.abs(area.variance),
    flowThroughPct: null,
    buildNote: (gapReduction) =>
      `${area.area} is below weekly plan by ${formatCurrency(
        Math.abs(area.variance),
      )}. Assign an owner today, verify the source report, and recover about ${formatCurrency(
        gapReduction,
      )} toward the current GOP gap without changing unrelated departments.`,
  }));
}

function buildExpenseBreakdownCandidates(input: PeriodInput): ActionCandidate[] {
  const laborBasis =
    input.payroll +
    input.payrollTaxes +
    input.employeeBenefits +
    input.contractLabor;
  const roomsBasis = input.roomsExpense + input.supplies;
  const fnbBasis = input.foodBeverageExpense;
  const maintenanceBasis = input.repairsMaintenance;
  const overheadBasis =
    input.utilities +
    input.adminGeneral +
    input.salesMarketing +
    input.otherOperatingExpenses;

  return [
    createDirectSavingsCandidate(
      'expense-labor',
      'Tighten labor schedule and overtime',
      laborBasis,
      0.005,
      (gapReduction) =>
        `Use payroll, payroll tax, benefit, and contract-labor detail to find about ${formatCurrency(
          gapReduction,
        )} in controllable labor savings. Focus on overtime, agency hours, and schedule fit to occupancy before reducing guest-facing coverage.`,
    ),
    createDirectSavingsCandidate(
      'expense-fnb',
      'Tighten F&B purchasing and event controls',
      fnbBasis,
      0.0075,
      (gapReduction) =>
        `Review food, beverage, banquet, and event costs for about ${formatCurrency(
          gapReduction,
        )} of GOP recovery. Compare purchasing, waste, event covers, and posted revenue before changing menus or service levels.`,
    ),
    createDirectSavingsCandidate(
      'expense-rooms',
      'Review rooms supplies and housekeeping controls',
      roomsBasis,
      0.006,
      (gapReduction) =>
        `Check rooms expense, supplies, laundry, and housekeeping controls for about ${formatCurrency(
          gapReduction,
        )} of savings. Start with par levels, turns, linen, and vendor timing tied to occupancy.`,
    ),
    createDirectSavingsCandidate(
      'expense-maintenance',
      'Review maintenance/vendor timing',
      maintenanceBasis,
      0.006,
      (gapReduction) =>
        `Review repairs, maintenance, service calls, and vendor timing for about ${formatCurrency(
          gapReduction,
        )} in GOP protection. Separate urgent life-safety work from discretionary timing items.`,
    ),
    createDirectSavingsCandidate(
      'expense-overhead',
      'Pause nonessential controllable spend',
      overheadBasis,
      0.004,
      (gapReduction) =>
        `Review utilities, admin, sales, marketing, and other operating spend for about ${formatCurrency(
          gapReduction,
        )} in near-term savings. Pause only spend that does not risk booked revenue or guest recovery.`,
    ),
  ].filter((candidate): candidate is ActionCandidate => candidate !== null);
}

function buildBroadExpenseCandidate(input: PeriodInput): ActionCandidate | null {
  const maxGapReduction = Math.max(input.expenses * 0.001, 0);
  if (maxGapReduction <= MIN_ACTION_AMOUNT) return null;

  return {
    recommendationId: 'expense-controllable-review',
    title: 'Review controllable expense pacing',
    type: 'Expense cut / savings',
    maxGapReduction,
    flowThroughPct: null,
    buildNote: (gapReduction) =>
      `Use department reports to identify about ${formatCurrency(
        gapReduction,
      )} in near-term controllable expense savings. Rank the actions by owner, timing, and guest impact before committing them.`,
  };
}

function buildRevenueCandidate(
  input: PeriodInput,
  calculation: PeriodCalculation,
  maxGapReduction: number,
): ActionCandidate | null {
  const recoveryMargin = input.flowThroughPct - calculation.targetGopPctUsed;
  if (maxGapReduction <= MIN_ACTION_AMOUNT || recoveryMargin <= 0) return null;

  return {
    recommendationId: 'revenue-targeted-lift',
    title: 'Capture targeted revenue lift',
    type: 'Revenue increase',
    maxGapReduction,
    flowThroughPct: input.flowThroughPct,
    amountForGapReduction: (gapReduction) => gapReduction / recoveryMargin,
    buildNote: (gapReduction, actionAmount) =>
      `${formatCurrency(actionAmount)} revenue lift at ${formatPercent(
        input.flowThroughPct,
      )} flow-through is estimated to close about ${formatCurrency(
        gapReduction,
      )} of GOP gap after target GOP moves with revenue. Prioritize compression nights, direct mix, and close-in demand where rate can hold.`,
  };
}

function buildFallbackCandidate(maxGapReduction: number): ActionCandidate | null {
  if (maxGapReduction <= MIN_ACTION_AMOUNT) return null;

  return {
    recommendationId: 'direct-gop-recovery',
    title: 'Assign direct GOP recovery owner',
    type: 'GOP improvement',
    maxGapReduction,
    flowThroughPct: null,
    buildNote: (gapReduction) =>
      `Revenue flow-through is not enough to close the remaining gap by itself. Assign an owner for ${formatCurrency(
        gapReduction,
      )} in direct GOP improvement and verify the number in the next daily review.`,
  };
}

function buildMaintenanceRecommendations(
  draft: SnapshotDraft,
): ActionPlanRecommendation[] {
  const areaToWatch = getActiveOperatingAreaGaps(
    draft.propertySetup.enabledOperatingAreaIds,
  )[0];
  const note = areaToWatch
    ? `Forecasted to hit target. Keep the current plan in place and watch ${areaToWatch.area}, which is still below weekly plan.`
    : 'Forecasted to hit target. Keep the current plan in place and continue daily check-ins against revenue, labor, and controllable expenses.';

  return [
    {
      recommendationId: 'maintain-current-plan',
      source: 'recommended',
      description: 'Hold the current plan and monitor daily',
      type: 'Other',
      monthImpact: 0,
      quarterImpact: 0,
      yearImpact: 0,
      flowThroughPct: null,
      notes: note,
    },
  ];
}

function toRecommendation(
  candidate: ActionCandidate,
  gapReduction: number,
  reportingPeriodKey: PeriodKey,
): ActionPlanRecommendation {
  const actionAmount = candidate.amountForGapReduction
    ? candidate.amountForGapReduction(gapReduction)
    : gapReduction;
  const scaled = scaleActionAmount(reportingPeriodKey, actionAmount);

  return {
    recommendationId: candidate.recommendationId,
    source: 'recommended',
    description: candidate.title,
    type: candidate.type,
    flowThroughPct: candidate.flowThroughPct,
    notes: candidate.buildNote(gapReduction, actionAmount),
    ...scaled,
  };
}

export function generateActionPlanRecommendations({
  draft,
  periodInputs,
  calculations,
  projections,
  reportingPeriodKey,
}: GenerateActionPlanInput): ActionPlanRecommendation[] {
  const input = periodInputs[reportingPeriodKey];
  const calculation = calculations[reportingPeriodKey];
  const remainingGap = Math.max(
    projections[reportingPeriodKey].projectedRemainingGap,
    0,
  );

  if (remainingGap <= MIN_ACTION_AMOUNT) {
    return buildMaintenanceRecommendations(draft);
  }

  const directCandidates = [
    ...buildOperatingAreaCandidates(draft),
    ...(hasBreakdownValues(input)
      ? buildExpenseBreakdownCandidates(input)
      : []),
  ];
  if (!hasBreakdownValues(input)) {
    const broadCandidate = buildBroadExpenseCandidate(input);
    if (broadCandidate) directCandidates.push(broadCandidate);
  }

  const revenueCandidate = buildRevenueCandidate(
    input,
    calculation,
    remainingGap,
  );
  const directSlots = revenueCandidate
    ? MAX_RECOMMENDATIONS - 1
    : MAX_RECOMMENDATIONS;
  const recommendations: ActionPlanRecommendation[] = [];
  let unallocatedGap = remainingGap;

  for (const candidate of directCandidates) {
    if (recommendations.length >= directSlots) break;
    if (unallocatedGap <= MIN_ACTION_AMOUNT) break;

    const gapReduction = Math.min(candidate.maxGapReduction, unallocatedGap);
    if (gapReduction <= MIN_ACTION_AMOUNT) continue;

    recommendations.push(
      toRecommendation(candidate, gapReduction, reportingPeriodKey),
    );
    unallocatedGap -= gapReduction;
  }

  if (unallocatedGap > MIN_ACTION_AMOUNT && revenueCandidate) {
    recommendations.push(
      toRecommendation(revenueCandidate, unallocatedGap, reportingPeriodKey),
    );
    unallocatedGap = 0;
  }

  if (unallocatedGap > MIN_ACTION_AMOUNT) {
    const fallbackCandidate = buildFallbackCandidate(unallocatedGap);
    if (fallbackCandidate) {
      recommendations.push(
        toRecommendation(fallbackCandidate, unallocatedGap, reportingPeriodKey),
      );
    }
  }

  return recommendations;
}
