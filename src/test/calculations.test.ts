import { describe, expect, it } from 'vitest';
import {
  calculatePeriod,
  calculateProjection,
  calculateProjectionImpact,
  calculateRevenueRecovery,
} from '../domain/calculations';
import { createEmptyExpenseBreakdown } from '../domain/expenseBreakdown';
import { formatCurrency } from '../domain/formatters';
import type { PeriodInput, ProjectionAdjustment } from '../domain/types';

const example: PeriodInput = {
  revenue: 1_606_117.22,
  expenses: 1_126_410,
  ...createEmptyExpenseBreakdown(),
  manualGopOverride: false,
  manualGop: 0,
  revenueAccruals: 0,
  expenseAccruals: 0,
  otherGopAdjustments: 0,
  accrualNotes: '',
  useAccrualAdjustedViewForVariance: false,
  targetGopPct: 0.3,
  targetGopDollarOverrideEnabled: false,
  targetGopDollarOverride: 0,
  budgetedGopPct: 0.311,
  daysRemaining: 5,
  daysRemainingOverride: false,
  flowThroughPct: 0.5,
  revenuePlan: null,
  gopPlan: null,
  priorYearRevenue: null,
  priorYearExpenses: null,
  priorYearGop: null,
  priorYearGopPct: null,
  workCalculatedGap: null,
  workNotes: '',
  notes: '',
};

const manualExample: PeriodInput = {
  ...example,
  manualGopOverride: true,
  manualGop: 479_707,
  daysRemaining: 7,
};

describe('financial calculations', () => {
  it('calculates GOP dollars', () => {
    expect(calculatePeriod(example).actualGop).toBeCloseTo(479_707.22, 2);
  });

  it('can calculate expenses from a hotel operating breakdown', () => {
    const result = calculatePeriod({
      ...example,
      expenses: 0,
      expenseBreakdownEnabled: true,
      payroll: 470_000,
      payrollTaxes: 38_100,
      employeeBenefits: 60_250,
      contractLabor: 29_000,
      roomsExpense: 135_000,
      foodBeverageExpense: 91_000,
      utilities: 57_500,
      repairsMaintenance: 42_500,
      supplies: 34_500,
      adminGeneral: 47_500,
      salesMarketing: 39_000,
      otherOperatingExpenses: 82_060,
    });

    expect(result.effectiveExpenses).toBeCloseTo(1_126_410, 2);
    expect(result.expenseBreakdownTotal).toBeCloseTo(1_126_410, 2);
    expect(result.expenseSource).toBe('Expense breakdown');
    expect(result.actualGop).toBeCloseTo(479_707.22, 2);
  });

  it('calculates actual GOP percent', () => {
    expect(calculatePeriod(example).actualGopPct).toBeCloseTo(0.2987, 4);
  });

  it('calculates target GOP dollars', () => {
    expect(calculatePeriod(example).targetGop).toBeCloseTo(481_835.17, 2);
  });

  it('uses target GOP dollar override and derives effective target percent', () => {
    const result = calculatePeriod({
      ...example,
      targetGopDollarOverrideEnabled: true,
      targetGopDollarOverride: 482_000,
    });

    expect(result.targetGop).toBeCloseTo(482_000, 2);
    expect(result.targetGopSource).toBe('Target GOP $ Override');
    expect(result.targetGopPctUsed).toBeCloseTo(0.3001, 4);
    expect(result.dollarGap).toBeCloseTo(2_292.78, 2);
  });

  it('uses full revenue flow-through when target GOP is a fixed dollar override', () => {
    const result = calculatePeriod({
      ...example,
      revenue: 1_000,
      expenses: 800,
      targetGopDollarOverrideEnabled: true,
      targetGopDollarOverride: 300,
      flowThroughPct: 0.5,
    });

    expect(result.dollarGap).toBeCloseTo(100, 2);
    expect(result.revenueNeededAtFlowThrough.amount).toBeCloseTo(200, 2);
  });

  it('calculates dollar gap using example data', () => {
    const result = calculatePeriod(example);

    expect(result.dollarGap).toBeCloseTo(2_127.95, 2);
    expect(result.gopImprovementNeeded).toBeCloseTo(2_127.95, 2);
    expect(result.budgetedGop).toBeCloseTo(499_502.46, 2);
    expect(result.status).toBe('Behind');
  });

  it('calculates revenue needed at flow-through', () => {
    expect(
      calculatePeriod(example).revenueNeededAtFlowThrough.amount,
    ).toBeCloseTo(10_639.73, 2);
  });

  it('marks revenue recovery as not achievable when flow-through is at or below target GOP percent', () => {
    const result = calculateRevenueRecovery(2_127.95, 0.3, 0.3);

    expect(result.achievable).toBe(false);
    expect(result.message).toBe(
      'Flow-through must be higher than target GOP % for revenue growth to close the gap.',
    );
    expect(result.amount).toBe(0);
  });

  it('uses manual GOP override in the desktop pilot demo data', () => {
    const result = calculatePeriod(manualExample);

    expect(result.actualGop).toBeCloseTo(479_707, 2);
    expect(result.actualGopPct).toBeCloseTo(0.2987, 4);
    expect(result.targetGop).toBeCloseTo(481_835.17, 2);
    expect(result.budgetedGop).toBeCloseTo(499_502.46, 2);
    expect(result.dollarGap).toBeCloseTo(2_128.17, 2);
    expect(result.gopImprovementNeeded).toBeCloseTo(2_128.17, 2);
    expect(result.revenueNeededAtFlowThrough.amount).toBeCloseTo(10_640.83, 2);
    expect(result.dailyRecoveryNeeded).toBeCloseTo(304.02, 2);
  });

  it('calculates accrual-adjusted revenue', () => {
    const result = calculatePeriod({
      ...example,
      revenueAccruals: 1_250,
    });

    expect(result.adjustedRevenue).toBeCloseTo(1_607_367.22, 2);
  });

  it('calculates accrual-adjusted GOP', () => {
    const result = calculatePeriod({
      ...example,
      revenueAccruals: 1_250,
      expenseAccruals: 500,
      otherGopAdjustments: 125,
    });

    expect(result.adjustedGop).toBeCloseTo(480_582.22, 2);
  });

  it('uses the base posted view when the accrual toggle is off', () => {
    const result = calculatePeriod({
      ...example,
      revenueAccruals: 10_000,
      expenseAccruals: 2_500,
      otherGopAdjustments: 1_000,
      useAccrualAdjustedViewForVariance: false,
    });

    expect(result.varianceView).toBe('Base / Posted View');
    expect(result.actualRevenue).toBeCloseTo(example.revenue, 2);
    expect(result.actualGop).toBeCloseTo(479_707.22, 2);
    expect(result.targetGop).toBeCloseTo(481_835.17, 2);
  });

  it('uses the accrual-adjusted view when the accrual toggle is on', () => {
    const result = calculatePeriod({
      ...example,
      revenue: 100_000,
      expenses: 70_000,
      revenueAccruals: 10_000,
      expenseAccruals: 2_000,
      otherGopAdjustments: 500,
      useAccrualAdjustedViewForVariance: true,
    });

    expect(result.varianceView).toBe('Accrual-Adjusted View');
    expect(result.actualRevenue).toBeCloseTo(110_000, 2);
    expect(result.actualGop).toBeCloseTo(38_500, 2);
    expect(result.actualGopPct).toBeCloseTo(0.35, 4);
    expect(result.targetGop).toBeCloseTo(33_000, 2);
    expect(result.dollarGap).toBeCloseTo(-5_500, 2);
  });

  it('calculates actual flow-through analysis', () => {
    const result = calculatePeriod({
      ...example,
      revenue: 1_100,
      expenses: 800,
      targetGopPct: 0.3,
      revenuePlan: 1_000,
      gopPlan: 250,
    });

    expect(result.actualFlow.revenueVariance).toBeCloseTo(100, 2);
    expect(result.actualFlow.gopVariance).toBeCloseTo(50, 2);
    expect(result.actualFlow.actualFlowThroughPct).toBeCloseTo(0.5, 4);
    expect(result.actualFlow.flexFlowPct).toBeCloseTo(-0.5, 4);
    expect(result.actualFlow.basisLabel).toBe('Using base/posted values.');
  });

  it('marks actual flow-through unavailable when revenue variance is zero', () => {
    const result = calculatePeriod({
      ...example,
      revenue: 1_100,
      expenses: 800,
      revenuePlan: 1_100,
      gopPlan: 300,
    });

    expect(result.actualFlow.revenueVariance).toBe(0);
    expect(result.actualFlow.actualFlowThroughPct).toBeNull();
    expect(result.actualFlow.flexFlowPct).toBeNull();
    expect(result.actualFlow.message).toBe(
      'Actual flow-through is unavailable when revenue variance is zero.',
    );
  });

  it('calculates YoY revenue dollar change', () => {
    const result = calculatePeriod({
      ...example,
      revenue: 1_100,
      priorYearRevenue: 1_000,
    });

    expect(result.yoy.revenueYoyChange).toBeCloseTo(100, 2);
  });

  it('calculates YoY revenue percent change', () => {
    const result = calculatePeriod({
      ...example,
      revenue: 1_100,
      priorYearRevenue: 1_000,
    });

    expect(result.yoy.revenueYoyChangePct).toBeCloseTo(0.1, 4);
  });

  it('calculates YoY GOP dollar change', () => {
    const result = calculatePeriod({
      ...example,
      revenue: 1_100,
      expenses: 800,
      priorYearGop: 250,
    });

    expect(result.yoy.gopYoyChange).toBeCloseTo(50, 2);
  });

  it('calculates YoY GOP percent change', () => {
    const result = calculatePeriod({
      ...example,
      revenue: 1_100,
      expenses: 800,
      priorYearGop: 250,
    });

    expect(result.yoy.gopYoyChangePct).toBeCloseTo(0.2, 4);
  });

  it('calculates GOP margin YoY change from prior-year GOP and revenue', () => {
    const result = calculatePeriod({
      ...example,
      revenue: 1_100,
      expenses: 800,
      priorYearRevenue: 1_000,
      priorYearGop: 250,
      priorYearGopPct: 0.24,
    });

    expect(result.yoy.priorYearGopPct).toBeCloseTo(0.25, 4);
    expect(result.yoy.gopMarginYoyChange).toBeCloseTo(0.0227, 4);
  });

  it('blank prior-year values do not crash YoY calculations', () => {
    const result = calculatePeriod(example);

    expect(result.yoy.hasPriorYearValues).toBe(false);
    expect(result.yoy.revenueYoyChange).toBeNull();
    expect(result.yoy.gopYoyChange).toBeNull();
    expect(result.yoy.message).toBe('Enter prior-year values to calculate YoY.');
  });

  it('PTD mode uses the same core period calculation logic', () => {
    const result = calculatePeriod({
      ...example,
      revenue: 250_000,
      expenses: 175_000,
      targetGopPct: 0.3,
      daysRemaining: 4,
    });

    expect(result.actualGop).toBeCloseTo(75_000, 2);
    expect(result.targetGop).toBeCloseTo(75_000, 2);
    expect(result.status).toBe('On Target');
  });

  it('calculates work reconciliation difference', () => {
    const result = calculatePeriod({
      ...manualExample,
      workCalculatedGap: 2_008.17,
    });

    expect(result.reconciliation?.vyntaxGap).toBeCloseTo(2_128.17, 2);
    expect(result.reconciliation?.workGap).toBeCloseTo(2_008.17, 2);
    expect(result.reconciliation?.difference).toBeCloseTo(120, 2);
    expect(result.reconciliation?.withinTolerance).toBe(false);
  });

  it('calculates projection math for all adjustment types', () => {
    const adjustments: ProjectionAdjustment[] = [
      {
        id: 'saving',
        description: 'Labor plan',
        type: 'Expense cut / savings',
        monthImpact: 100,
        quarterImpact: 100,
        yearImpact: 100,
        flowThroughPct: null,
        notes: '',
      },
      {
        id: 'gop',
        description: 'GOP recovery',
        type: 'GOP improvement',
        monthImpact: 40,
        quarterImpact: 40,
        yearImpact: 40,
        flowThroughPct: null,
        notes: '',
      },
      {
        id: 'revenue-up',
        description: 'Upsell',
        type: 'Revenue increase',
        monthImpact: 200,
        quarterImpact: 200,
        yearImpact: 200,
        flowThroughPct: 0.6,
        notes: '',
      },
      {
        id: 'other',
        description: 'Other action',
        type: 'Other',
        monthImpact: 50,
        quarterImpact: 50,
        yearImpact: 50,
        flowThroughPct: null,
        notes: '',
      },
    ];

    const impact = calculateProjectionImpact('month', example, adjustments);

    expect(impact.revenueDelta).toBe(200);
    expect(impact.gopImpact).toBe(310);
    expect(impact.gapReduction).toBe(250);
  });

  it('calculates forecasted gap', () => {
    const adjustments: ProjectionAdjustment[] = [
      {
        id: 'saving',
        description: 'Expense recovery',
        type: 'Expense cut / savings',
        monthImpact: 1_000,
        quarterImpact: 0,
        yearImpact: 0,
        flowThroughPct: null,
        notes: '',
      },
      {
        id: 'revenue-up',
        description: 'Revenue plan',
        type: 'Revenue increase',
        monthImpact: 2_000,
        quarterImpact: 0,
        yearImpact: 0,
        flowThroughPct: null,
        notes: '',
      },
    ];

    const result = calculateProjection('month', example, adjustments);

    expect(result.projectedRevenue).toBeCloseTo(1_608_117.22, 2);
    expect(result.projectedGop).toBeCloseTo(481_707.22, 2);
    expect(result.projectedTargetGop).toBeCloseTo(482_435.17, 2);
    expect(result.projectedGap).toBeCloseTo(727.95, 2);
    expect(result.projectedStatus).toBe('Still Short');
  });

  it('keeps revenue action forecast aligned with a fixed target GOP dollar override', () => {
    const adjustments: ProjectionAdjustment[] = [
      {
        id: 'revenue-up',
        description: 'Revenue plan',
        type: 'Revenue increase',
        monthImpact: 200,
        quarterImpact: 0,
        yearImpact: 0,
        flowThroughPct: 0.5,
        notes: '',
      },
    ];
    const result = calculateProjection(
      'month',
      {
        ...example,
        revenue: 1_000,
        expenses: 800,
        targetGopDollarOverrideEnabled: true,
        targetGopDollarOverride: 300,
      },
      adjustments,
    );

    expect(result.projectedTargetGop).toBeCloseTo(300, 2);
    expect(result.projectedGop).toBeCloseTo(300, 2);
    expect(result.projectedRemainingGap).toBeCloseTo(0, 2);
    expect(result.projectedRemainingGap).toBeCloseTo(
      result.projectedTargetGop - result.projectedGop,
      2,
    );
    expect(result.projectedStatus).toBe('Forecasted to Hit');
  });

  it('display rounding does not change raw calculation values', () => {
    const result = calculatePeriod(example);

    expect(formatCurrency(result.dollarGap, 'whole')).toBe('$2,128');
    expect(result.dollarGap).toBeCloseTo(2_127.95, 2);
  });
});
