import { describe, expect, it } from 'vitest';
import { calculatePeriod, calculateProjection } from '../domain/calculations';
import { createDemoDraft } from '../domain/demoData';

describe('demo mode data', () => {
  it('creates a demo draft with real dates from a fixed As Of Date', () => {
    const draft = createDemoDraft('2026-05-01');

    expect(draft.demoMode).toBe(true);
    expect(draft.asOfDate).toBe('2026-05-01');
    expect(draft.weekEnding).toBe('2026-05-03');
    expect(draft.preparedBy).toBe('Vyntax Pilot');
    expect(draft.propertyLocation).toBe('Juniper Shores Hotel');
    expect(draft.operatorName).toBe('Summit Ridge Hospitality');
    expect(draft.reportingView).toBe('MTD');
    expect(draft.reportingMonth).toBe('May 2026');
    expect(draft.propertySetup.enabledOperatingAreaIds).toContain('valet');
    expect(draft.propertySetup.enabledOperatingAreaIds).toContain(
      'banquets-events',
    );
    expect(draft.propertySetup.enabledOperatingAreaIds).toContain('gift-shop');
    expect(draft.propertySetup.enabledOperatingAreaIds).not.toContain(
      'shuttle-drivers',
    );
    expect(draft.periods.month.daysRemaining).toBe(30);
    expect(draft.periods.quarter.daysRemaining).toBe(60);
    expect(draft.periods.year.daysRemaining).toBe(244);
  });

  it('demo Month data produces the expected target gap', () => {
    const draft = createDemoDraft('2026-04-30');
    const result = calculatePeriod(draft.periods.month);

    expect(result.dollarGap).toBeCloseTo(2_128.17, 2);
  });

  it('demo Month data keeps accruals at zero by default', () => {
    const draft = createDemoDraft('2026-04-30');

    expect(draft.periods.month.revenueAccruals).toBe(0);
    expect(draft.periods.month.expenseAccruals).toBe(0);
    expect(draft.periods.month.otherGopAdjustments).toBe(0);
    expect(draft.periods.month.useAccrualAdjustedViewForVariance).toBe(false);
  });

  it('demo Month data includes plan values for actual flow analysis', () => {
    const draft = createDemoDraft('2026-04-30');
    const result = calculatePeriod(draft.periods.month);

    expect(draft.periods.month.revenuePlan).toBe(1_590_000);
    expect(draft.periods.month.gopPlan).toBe(477_000);
    expect(result.actualFlow.actualFlowThroughPct).not.toBeNull();
  });

  it('demo mode includes safe placeholder prior-year values', () => {
    const draft = createDemoDraft('2026-04-30');

    expect(draft.periods.month.priorYearRevenue).toBe(1_525_000);
    expect(draft.periods.month.priorYearExpenses).toBe(1_070_000);
    expect(draft.periods.month.priorYearGop).toBe(455_000);
    expect(draft.periods.quarter.priorYearRevenue).toBe(4_600_000);
    expect(draft.periods.year.priorYearGop).toBe(5_450_000);
  });

  it('demo Month data includes a reconciliation example about 120 different from Vyntax', () => {
    const draft = createDemoDraft('2026-04-30');
    const result = calculatePeriod(draft.periods.month);

    expect(draft.periods.month.workCalculatedGap).toBeCloseTo(2_008.17, 2);
    expect(result.reconciliation?.difference).toBeCloseTo(120, 2);
    expect(draft.periods.month.workNotes).toContain('Pilot scenario reconciliation');
  });

  it('demo Month data produces expected additional revenue needed', () => {
    const draft = createDemoDraft('2026-04-30');
    const result = calculatePeriod(draft.periods.month);

    expect(result.revenueNeededAtFlowThrough.amount).toBeCloseTo(10_640.83, 2);
  });

  it('demo action plan rows reduce the Month forecasted gap correctly', () => {
    const draft = createDemoDraft('2026-04-30');
    const result = calculateProjection(
      'month',
      draft.periods.month,
      draft.adjustments,
    );

    expect(result.impact.gapReduction).toBeCloseTo(2_130, 2);
    expect(result.projectedRemainingGap).toBeCloseTo(-1.83, 2);
    expect(result.projectedStatus).toBe('Forecasted to Hit');
  });
});
