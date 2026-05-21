import type { SnapshotDraft } from './types';
import type { ExpenseBreakdownFieldKey } from './expenseBreakdown';
import { hotelDemoData } from './gopCommandData';
import { createEmptyExpenseBreakdown } from './expenseBreakdown';
import { createDefaultPropertySetup } from './propertySetup';
import {
  formatIsoDate,
  getDaysRemaining,
  getMonthPeriod,
  getPeriodLabel,
  getQuarterPeriod,
  getTodayIsoDate,
  getUpcomingSunday,
  getYearPeriod,
  parseLocalDate,
} from './datePeriods';

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

const monthExpenseBreakdown: Record<ExpenseBreakdownFieldKey, number> = {
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
};

function scaleExpenseBreakdown(multiplier: number) {
  return Object.fromEntries(
    Object.entries(monthExpenseBreakdown).map(([key, value]) => [
      key,
      value * multiplier,
    ]),
  ) as Record<ExpenseBreakdownFieldKey, number>;
}

function createDemoExpenseBreakdown(multiplier: number) {
  return {
    ...createEmptyExpenseBreakdown(),
    expenseBreakdownEnabled: false,
    ...scaleExpenseBreakdown(multiplier),
  };
}

export function getTodayDateInput(date = new Date()) {
  return formatIsoDate(date);
}

export function createDemoDraft(asOfDateInput: Date | string = new Date()): SnapshotDraft {
  const asOfDate =
    typeof asOfDateInput === 'string'
      ? parseLocalDate(asOfDateInput)
      : asOfDateInput;
  const asOfDateIso = formatIsoDate(asOfDate);
  const weekEnding = formatIsoDate(getUpcomingSunday(asOfDate));
  const monthPeriod = getMonthPeriod(asOfDate);
  const quarterPeriod = getQuarterPeriod(asOfDate);
  const yearPeriod = getYearPeriod(asOfDate);

  return {
    weekEnding,
    asOfDate: asOfDateIso || getTodayIsoDate(),
    preparedBy: 'Vyntax Pilot',
    propertyLocation: hotelDemoData.property,
    operatorName: hotelDemoData.operator,
    rooms: hotelDemoData.rooms,
    reportingMonth: getPeriodLabel('MTD', monthPeriod, asOfDate),
    reportingView: 'MTD',
    ptdPeriodName: '',
    periodStart: '',
    periodEnd: '',
    daysElapsed: 0,
    reportingDaysRemaining: 0,
    propertyTargetGopPct: hotelDemoData.targetGopPct,
    propertySetup: createDefaultPropertySetup(),
    displaySettings: {
      currencyDisplay: 'cents',
      percentageDecimals: 2,
      roundCalculationsToWholeDollars: false,
    },
    demoMode: true,
    periods: {
      month: {
        revenue: 1_606_117.22,
        expenses: 1_126_410,
        ...createDemoExpenseBreakdown(1),
        manualGopOverride: true,
        manualGop: 479_707,
        revenueAccruals: 0,
        expenseAccruals: 0,
        otherGopAdjustments: 0,
        accrualNotes: '',
        useAccrualAdjustedViewForVariance: false,
        targetGopPct: 0.3,
        targetGopDollarOverrideEnabled: false,
        targetGopDollarOverride: 0,
        budgetedGopPct: 0.311,
        daysRemaining: getDaysRemaining(monthPeriod, asOfDate),
        daysRemainingOverride: false,
        flowThroughPct: 0.5,
        revenuePlan: 1_590_000,
        gopPlan: 477_000,
        priorYearRevenue: 1_525_000,
        priorYearExpenses: 1_070_000,
        priorYearGop: 455_000,
        priorYearGopPct: null,
        workCalculatedGap: 2_008.17,
        workNotes:
          'Pilot scenario reconciliation: compare Vyntax formula to the current operator workpaper.',
        notes: 'Pilot scenario sample. Replace with live hotel notes when ready.',
      },
      quarter: {
        revenue: 4_818_351.66,
        expenses: 3_379_230,
        ...createDemoExpenseBreakdown(3),
        manualGopOverride: true,
        manualGop: 1_439_121.66,
        revenueAccruals: 0,
        expenseAccruals: 0,
        otherGopAdjustments: 0,
        accrualNotes: '',
        useAccrualAdjustedViewForVariance: false,
        targetGopPct: 0.3,
        targetGopDollarOverrideEnabled: false,
        targetGopDollarOverride: 0,
        budgetedGopPct: 0.311,
        daysRemaining: getDaysRemaining(quarterPeriod, asOfDate),
        daysRemainingOverride: false,
        flowThroughPct: 0.5,
        revenuePlan: null,
        gopPlan: null,
        priorYearRevenue: 4_600_000,
        priorYearExpenses: 3_220_000,
        priorYearGop: 1_380_000,
        priorYearGopPct: null,
        workCalculatedGap: null,
        workNotes: '',
        notes: 'Pilot scenario sample. Replace with live hotel notes when ready.',
      },
      year: {
        revenue: 19_273_406.64,
        expenses: 13_516_920,
        ...createDemoExpenseBreakdown(12),
        manualGopOverride: true,
        manualGop: 5_756_486.64,
        revenueAccruals: 0,
        expenseAccruals: 0,
        otherGopAdjustments: 0,
        accrualNotes: '',
        useAccrualAdjustedViewForVariance: false,
        targetGopPct: 0.3,
        targetGopDollarOverrideEnabled: false,
        targetGopDollarOverride: 0,
        budgetedGopPct: 0.311,
        daysRemaining: getDaysRemaining(yearPeriod, asOfDate),
        daysRemainingOverride: false,
        flowThroughPct: 0.5,
        revenuePlan: null,
        gopPlan: null,
        priorYearRevenue: 18_400_000,
        priorYearExpenses: 12_950_000,
        priorYearGop: 5_450_000,
        priorYearGopPct: null,
        workCalculatedGap: null,
        workNotes: '',
        notes: 'Pilot scenario sample. Replace with live hotel notes when ready.',
      },
    },
    adjustments: [
      {
        id: createId('demo-food-services'),
        recommendationId: 'area-food-services',
        source: 'recommended',
        description: 'Recover Food Services weekly variance',
        type: 'GOP improvement',
        monthImpact: 1_180,
        quarterImpact: 3_540,
        yearImpact: 14_160,
        flowThroughPct: null,
        notes:
          'Food Services is below weekly plan. Assign the F&B manager to review prep, purchasing, waste, and event cover counts today.',
      },
      {
        id: createId('demo-banquets'),
        recommendationId: 'area-banquets-events',
        source: 'recommended',
        description: 'Recover Banquets / Events pickup gap',
        type: 'GOP improvement',
        monthImpact: 570,
        quarterImpact: 1_710,
        yearImpact: 6_840,
        flowThroughPct: null,
        notes:
          'Banquets / Events is below weekly plan. Confirm BEO changes, posted revenue, and staffing against booked covers before the next event block.',
      },
      {
        id: createId('demo-valet'),
        recommendationId: 'area-valet',
        source: 'recommended',
        description: 'Reset valet posting and cashout checks',
        type: 'GOP improvement',
        monthImpact: 140,
        quarterImpact: 420,
        yearImpact: 1_680,
        flowThroughPct: null,
        notes:
          'Valet is a smaller gap, but it is fast to verify. Check posting, cashout, and package exceptions before close.',
      },
      {
        id: createId('demo-labor'),
        recommendationId: 'expense-labor',
        source: 'recommended',
        description: 'Tighten labor schedule and overtime',
        type: 'Expense cut / savings',
        monthImpact: 240,
        quarterImpact: 720,
        yearImpact: 2_880,
        flowThroughPct: null,
        notes:
          'Use payroll, taxes, benefits, and contract labor detail to protect the last dollars of the month-end GOP gap without cutting guest-facing coverage.',
      },
    ],
  };
}
