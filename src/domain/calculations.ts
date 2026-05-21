import type {
  ActualFlowCalculation,
  PeriodCalculation,
  PeriodInput,
  PeriodKey,
  ProjectionAdjustment,
  ProjectionCalculation,
  ProjectionImpact,
  Status,
  YoYCalculation,
} from './types';
import { calculateExpenseBreakdownTotal } from './expenseBreakdown';

const MONEY_EPSILON = 0.005;
const RECONCILIATION_TOLERANCE = 1;

export interface CalculationOptions {
  roundCalculationsToWholeDollars?: boolean;
}

function maybeRoundMoney(value: number, options?: CalculationOptions) {
  return options?.roundCalculationsToWholeDollars ? Math.round(value) : value;
}

export function getStatus(dollarGap: number): Status {
  if (dollarGap > MONEY_EPSILON) return 'Behind';
  if (dollarGap < -MONEY_EPSILON) return 'Ahead';
  return 'On Target';
}

export function calculateRevenueRecovery(
  dollarGap: number,
  flowThroughPct: number,
  targetGopPct: number,
  targetMovesWithRevenue = true,
) {
  if (dollarGap <= MONEY_EPSILON) {
    return { amount: 0, achievable: true };
  }

  const targetDragPct = targetMovesWithRevenue ? targetGopPct : 0;

  if (flowThroughPct <= targetDragPct) {
    return {
      amount: 0,
      achievable: false,
      message:
        'Flow-through must be higher than target GOP % for revenue growth to close the gap.',
    };
  }

  return {
    amount: dollarGap / (flowThroughPct - targetDragPct),
    achievable: true,
  };
}

export function calculateActualFlowAnalysis(
  input: PeriodInput,
  actualRevenue: number,
  actualGop: number,
  targetGop: number,
): ActualFlowCalculation {
  const usingAccrualAdjusted = input.useAccrualAdjustedViewForVariance;
  const basisLabel = usingAccrualAdjusted
    ? 'Using accrual-adjusted values.'
    : 'Using base/posted values.';

  if (input.revenuePlan === null) {
    return {
      basisLabel,
      revenuePlan: null,
      gopPlan: input.gopPlan ?? targetGop,
      gopPlanSource:
        input.gopPlan === null ? 'Target GOP $' : 'Entered GOP Plan / Target',
      revenueVariance: null,
      gopVariance: null,
      actualFlowThroughPct: null,
      flexFlowPct: null,
      message: 'Enter revenue plan to calculate actual flow-through.',
    };
  }

  const gopPlan = input.gopPlan ?? targetGop;
  const revenueVariance = actualRevenue - input.revenuePlan;
  const gopVariance = actualGop - gopPlan;

  if (Math.abs(revenueVariance) <= MONEY_EPSILON) {
    return {
      basisLabel,
      revenuePlan: input.revenuePlan,
      gopPlan,
      gopPlanSource:
        input.gopPlan === null ? 'Target GOP $' : 'Entered GOP Plan / Target',
      revenueVariance,
      gopVariance,
      actualFlowThroughPct: null,
      flexFlowPct: null,
      message: 'Actual flow-through is unavailable when revenue variance is zero.',
    };
  }

  const actualFlowThroughPct = gopVariance / revenueVariance;

  return {
    basisLabel,
    revenuePlan: input.revenuePlan,
    gopPlan,
    gopPlanSource:
      input.gopPlan === null ? 'Target GOP $' : 'Entered GOP Plan / Target',
    revenueVariance,
    gopVariance,
    actualFlowThroughPct,
    flexFlowPct: actualFlowThroughPct - 1,
    message: null,
  };
}

export function calculateYoyComparison(
  input: PeriodInput,
  actualRevenue: number,
  actualGop: number,
  actualGopPct: number,
): YoYCalculation {
  const priorYearGopPctFromDollars =
    input.priorYearRevenue !== null &&
    input.priorYearRevenue !== 0 &&
    input.priorYearGop !== null
      ? input.priorYearGop / input.priorYearRevenue
      : null;
  const priorYearGopPct =
    priorYearGopPctFromDollars ?? input.priorYearGopPct;
  const priorYearGopPctSource =
    priorYearGopPctFromDollars !== null
      ? 'Calculated from Prior Year GOP and Revenue'
      : input.priorYearGopPct !== null
        ? 'Manual Prior Year GOP %'
        : 'Not available';
  const revenueYoyChange =
    input.priorYearRevenue === null
      ? null
      : actualRevenue - input.priorYearRevenue;
  const revenueYoyChangePct =
    input.priorYearRevenue === null || input.priorYearRevenue === 0
      ? null
      : revenueYoyChange! / input.priorYearRevenue;
  const gopYoyChange =
    input.priorYearGop === null ? null : actualGop - input.priorYearGop;
  const gopYoyChangePct =
    input.priorYearGop === null || input.priorYearGop === 0
      ? null
      : gopYoyChange! / input.priorYearGop;
  const gopMarginYoyChange =
    priorYearGopPct === null ? null : actualGopPct - priorYearGopPct;
  const hasPriorYearValues =
    input.priorYearRevenue !== null ||
    input.priorYearExpenses !== null ||
    input.priorYearGop !== null ||
    input.priorYearGopPct !== null;

  return {
    hasPriorYearValues,
    priorYearRevenue: input.priorYearRevenue,
    priorYearExpenses: input.priorYearExpenses,
    priorYearGop: input.priorYearGop,
    priorYearGopPct,
    priorYearGopPctSource,
    revenueYoyChange,
    revenueYoyChangePct,
    gopYoyChange,
    gopYoyChangePct,
    gopMarginYoyChange,
    message: hasPriorYearValues
      ? null
      : 'Enter prior-year values to calculate YoY.',
  };
}

export function calculatePeriod(
  input: PeriodInput,
  options?: CalculationOptions,
): PeriodCalculation {
  const revenue = maybeRoundMoney(input.revenue, options);
  const expenseBreakdownTotal = maybeRoundMoney(
    calculateExpenseBreakdownTotal(input),
    options,
  );
  const expenses = maybeRoundMoney(
    input.expenseBreakdownEnabled ? expenseBreakdownTotal : input.expenses,
    options,
  );
  const baseGop = maybeRoundMoney(
    input.manualGopOverride ? input.manualGop : revenue - expenses,
    options,
  );
  const revenueAccruals = maybeRoundMoney(input.revenueAccruals, options);
  const expenseAccruals = maybeRoundMoney(input.expenseAccruals, options);
  const otherGopAdjustments = maybeRoundMoney(
    input.otherGopAdjustments,
    options,
  );
  const adjustedRevenue = maybeRoundMoney(revenue + revenueAccruals, options);
  const adjustedGop = maybeRoundMoney(
    baseGop + revenueAccruals - expenseAccruals + otherGopAdjustments,
    options,
  );
  const actualRevenue = input.useAccrualAdjustedViewForVariance
    ? adjustedRevenue
    : revenue;
  const actualGop = input.useAccrualAdjustedViewForVariance
    ? adjustedGop
    : baseGop;
  const actualGopPct = actualRevenue === 0 ? 0 : actualGop / actualRevenue;
  const targetGop = maybeRoundMoney(
    input.targetGopDollarOverrideEnabled
      ? input.targetGopDollarOverride
      : actualRevenue * input.targetGopPct,
    options,
  );
  const targetGopPctUsed = actualRevenue === 0 ? 0 : targetGop / actualRevenue;
  const targetGopSource = input.targetGopDollarOverrideEnabled
    ? 'Target GOP $ Override'
    : 'Target GOP %';
  const budgetedGop =
    input.budgetedGopPct === null
      ? null
      : maybeRoundMoney(actualRevenue * input.budgetedGopPct, options);
  const varianceToTargetPct = actualGopPct - targetGopPctUsed;
  const dollarGap = targetGop - actualGop;
  const gopImprovementNeeded = Math.max(dollarGap, 0);
  const dailyRecoveryNeeded =
    input.daysRemaining > 0 ? gopImprovementNeeded / input.daysRemaining : 0;
  const reconciliation =
    input.workCalculatedGap === null
      ? null
      : {
          vyntaxGap: dollarGap,
          workGap: input.workCalculatedGap,
          difference: dollarGap - input.workCalculatedGap,
          withinTolerance:
            Math.abs(dollarGap - input.workCalculatedGap) <=
            RECONCILIATION_TOLERANCE,
        };
  const actualFlow = calculateActualFlowAnalysis(
    input,
    actualRevenue,
    actualGop,
    targetGop,
  );
  const yoy = calculateYoyComparison(
    input,
    actualRevenue,
    actualGop,
    actualGopPct,
  );

  return {
    baseRevenue: revenue,
    effectiveExpenses: expenses,
    expenseBreakdownTotal,
    expenseSource: input.expenseBreakdownEnabled
      ? 'Expense breakdown'
      : 'Manual expenses',
    baseGop,
    baseGopPct: revenue === 0 ? 0 : baseGop / revenue,
    adjustedRevenue,
    adjustedGop,
    adjustedGopPct: adjustedRevenue === 0 ? 0 : adjustedGop / adjustedRevenue,
    actualRevenue,
    actualGop,
    actualGopPct,
    varianceView: input.useAccrualAdjustedViewForVariance
      ? 'Accrual-Adjusted View'
      : 'Base / Posted View',
    targetGop,
    targetGopPctUsed,
    targetGopSource,
    budgetedGop,
    varianceToTargetPct,
    dollarGap,
    status: getStatus(dollarGap),
    gopImprovementNeeded,
    dailyRecoveryNeeded,
    revenueNeededAtFlowThrough: calculateRevenueRecovery(
      dollarGap,
      input.flowThroughPct,
      targetGopPctUsed,
      !input.targetGopDollarOverrideEnabled,
    ),
    actualFlow,
    yoy,
    reconciliation,
  };
}

export function getAdjustmentAmount(
  adjustment: ProjectionAdjustment,
  period: PeriodKey,
) {
  if (period === 'month') return adjustment.monthImpact || 0;
  if (period === 'quarter') return adjustment.quarterImpact || 0;
  return adjustment.yearImpact || 0;
}

export function calculateProjectionImpact(
  period: PeriodKey,
  input: PeriodInput,
  adjustments: ProjectionAdjustment[],
): ProjectionImpact {
  const varianceRevenue = input.useAccrualAdjustedViewForVariance
    ? input.revenue + input.revenueAccruals
    : input.revenue;
  const targetGopPctUsed =
    input.targetGopDollarOverrideEnabled && varianceRevenue !== 0
      ? input.targetGopDollarOverride / varianceRevenue
      : input.targetGopPct;
  const revenueGapDragPct = input.targetGopDollarOverrideEnabled
    ? 0
    : targetGopPctUsed;

  return adjustments.reduce<ProjectionImpact>(
    (totals, adjustment) => {
      const amount = getAdjustmentAmount(adjustment, period);
      const flowThroughPct =
        adjustment.flowThroughPct === null
          ? input.flowThroughPct
          : adjustment.flowThroughPct;

      switch (adjustment.type) {
        case 'Expense cut / savings':
        case 'GOP improvement':
        case 'Other':
          return {
            ...totals,
            gopImpact: totals.gopImpact + amount,
            gapReduction: totals.gapReduction + amount,
          };
        case 'Revenue increase': {
          const gapReduction = amount * (flowThroughPct - revenueGapDragPct);
          return {
            revenueDelta: totals.revenueDelta + amount,
            gopImpact: totals.gopImpact + amount * flowThroughPct,
            gapReduction: totals.gapReduction + gapReduction,
          };
        }
        default:
          return totals;
      }
    },
    { revenueDelta: 0, gopImpact: 0, gapReduction: 0 },
  );
}

export function calculateProjection(
  period: PeriodKey,
  input: PeriodInput,
  adjustments: ProjectionAdjustment[],
  options?: CalculationOptions,
): ProjectionCalculation {
  const base = calculatePeriod(input, options);
  const impact = calculateProjectionImpact(period, input, adjustments);
  const projectedRevenue = base.actualRevenue + impact.revenueDelta;
  const projectedGop = base.actualGop + impact.gopImpact;
  const projectedTargetGop = maybeRoundMoney(
    input.targetGopDollarOverrideEnabled
      ? input.targetGopDollarOverride
      : projectedRevenue * input.targetGopPct,
    options,
  );
  const projectedRemainingGap = base.dollarGap - impact.gapReduction;

  return {
    base,
    impact,
    projectedRevenue,
    projectedGop,
    projectedTargetGop,
    projectedRemainingGap,
    projectedGap: projectedRemainingGap,
    projectedStatus:
      projectedRemainingGap > MONEY_EPSILON
        ? 'Still Short'
        : 'Forecasted to Hit',
  };
}
