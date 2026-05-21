import { describe, expect, it } from 'vitest';
import {
  buildSnapshotCsv,
  buildWeeklySummaryText,
  suggestedCsvFilename,
} from '../domain/exporting';
import { calculatePeriod, calculateProjection } from '../domain/calculations';
import { createEmptyExpenseBreakdown } from '../domain/expenseBreakdown';
import { createDefaultPropertySetup } from '../domain/propertySetup';
import type { PeriodCalculation, PeriodKey, ProjectionCalculation, SnapshotDraft } from '../domain/types';
import { PERIOD_KEYS } from '../domain/types';

const emptyPilotFields = {
  daysRemainingOverride: false,
  ...createEmptyExpenseBreakdown(),
  revenueAccruals: 0,
  expenseAccruals: 0,
  otherGopAdjustments: 0,
  accrualNotes: '',
  useAccrualAdjustedViewForVariance: false,
  targetGopDollarOverrideEnabled: false,
  targetGopDollarOverride: 0,
  revenuePlan: null,
  gopPlan: null,
  priorYearRevenue: null,
  priorYearExpenses: null,
  priorYearGop: null,
  priorYearGopPct: null,
  workCalculatedGap: null,
  workNotes: '',
};

const draft: SnapshotDraft = {
  weekEnding: '2026-04-30',
  asOfDate: '2026-04-30',
  preparedBy: 'Pilot User',
  propertyLocation: 'Sample Property',
  operatorName: 'Sample Operator',
  rooms: 100,
  reportingMonth: 'April 2026',
  reportingView: 'MTD',
  ptdPeriodName: '',
  periodStart: '2026-04-01',
  periodEnd: '2026-04-30',
  daysElapsed: 30,
  reportingDaysRemaining: 0,
  propertyTargetGopPct: 0.3,
  propertySetup: createDefaultPropertySetup(),
  displaySettings: {
    currencyDisplay: 'cents',
    percentageDecimals: 2,
    roundCalculationsToWholeDollars: false,
  },
  periods: {
    month: {
      revenue: 1000,
      expenses: 760,
      manualGopOverride: false,
      manualGop: 0,
      targetGopPct: 0.3,
      budgetedGopPct: null,
      daysRemaining: 3,
      flowThroughPct: 0.5,
      ...emptyPilotFields,
      notes: 'Month note',
    },
    quarter: {
      revenue: 0,
      expenses: 0,
      manualGopOverride: false,
      manualGop: 0,
      targetGopPct: 0,
      budgetedGopPct: null,
      daysRemaining: 0,
      flowThroughPct: 0,
      ...emptyPilotFields,
      notes: '',
    },
    year: {
      revenue: 0,
      expenses: 0,
      manualGopOverride: false,
      manualGop: 0,
      targetGopPct: 0,
      budgetedGopPct: null,
      daysRemaining: 0,
      flowThroughPct: 0,
      ...emptyPilotFields,
      notes: '',
    },
  },
  adjustments: [
    {
      id: 'row-1',
      description: 'Revenue push, phase 1',
      type: 'Revenue increase',
      monthImpact: 100,
      quarterImpact: 0,
      yearImpact: 0,
      flowThroughPct: null,
      notes: 'Quoted, with comma',
    },
  ],
};

const calculations = Object.fromEntries(
  PERIOD_KEYS.map((period) => [period, calculatePeriod(draft.periods[period])]),
) as Record<PeriodKey, PeriodCalculation>;

const projections = Object.fromEntries(
  PERIOD_KEYS.map((period) => [
    period,
    calculateProjection(period, draft.periods[period], draft.adjustments),
  ]),
) as Record<PeriodKey, ProjectionCalculation>;

describe('CSV export helpers', () => {
  it('suggests a Vyntax CSV filename with the week ending date', () => {
    expect(suggestedCsvFilename('2026-04-30')).toBe(
      'Vyntax_Snapshot_2026-04-30.csv',
    );
  });

  it('builds a CSV with header, period rows, and escaped action plan rows', () => {
    const csv = buildSnapshotCsv(draft, calculations, projections);

    expect(csv).toContain('Vyntax Weekly Financial Snapshot');
    expect(csv).toContain('Week Ending,2026-04-30');
    expect(csv).toContain(
      'Month / MTD,2026-04-30,2026-04-30,MTD,2026-04-01,2026-04-30,30,0,1,2025-04-01,2025-04-30,1000,760',
    );
    expect(csv).toContain('as_of_date');
    expect(csv).toContain('days_until_next_period');
    expect(csv).toContain('prior_year_period_start');
    expect(csv).toContain('Payroll / Wages $');
    expect(csv).toContain('Expense Source');
    expect(csv).toContain('Enabled Operating Areas');
    expect(csv).toContain('Banquets / Events');
    expect(csv).toContain('Action Plan Rows');
    expect(csv).toContain('"Revenue push, phase 1"');
    expect(csv).toContain('"Quoted, with comma"');
    expect(csv).toContain('reporting_view');
    expect(csv).toContain('revenue_yoy_change');
  });

  it('exports and summarizes when accrual fields are blank/defaulted', () => {
    const csv = buildSnapshotCsv(draft, calculations, projections);
    const summary = buildWeeklySummaryText(draft, calculations, projections);

    expect(csv).toContain('Revenue Accruals $');
    expect(csv).toContain('Accrual-Adjusted GOP $');
    expect(summary).toContain('Base / Posted GOP');
    expect(summary).toContain('Accrual-Adjusted GOP');
    expect(summary).toContain('Expenses: $760.00 (Manual expenses)');
  });

  it('report summary includes the selected reporting view', () => {
    const summary = buildWeeklySummaryText(draft, calculations, projections);

    expect(summary).toContain('Reporting View: MTD');
    expect(summary).toContain('Current Performance: MTD performance');
  });

  it('can summarize monthly and 90 day snapshot scopes', () => {
    const monthlySummary = buildWeeklySummaryText(
      draft,
      calculations,
      projections,
      'monthly',
    );
    const ninetyDaySummary = buildWeeklySummaryText(
      draft,
      calculations,
      projections,
      'ninetyDay',
    );

    expect(monthlySummary).toContain('Vyntax Monthly Financial Snapshot');
    expect(monthlySummary).toContain('Snapshot Type: Monthly');
    expect(monthlySummary).toContain('Month / MTD');
    expect(monthlySummary).not.toContain('Week Ending:');
    expect(ninetyDaySummary).toContain('Vyntax 90 Day Financial Snapshot');
    expect(ninetyDaySummary).toContain('Quarter / QTD');
  });
});
