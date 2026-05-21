import type { PropertySetup } from './propertySetup';

export type PeriodKey = 'month' | 'quarter' | 'year';

export const PERIOD_KEYS: PeriodKey[] = ['month', 'quarter', 'year'];

export const PERIOD_LABELS: Record<PeriodKey, string> = {
  month: 'Month',
  quarter: 'Quarter',
  year: 'Year',
};

export type Status = 'Behind' | 'Ahead' | 'On Target';
export type ProjectedStatus = 'Still Short' | 'Forecasted to Hit';
export type TargetGopSource = 'Target GOP %' | 'Target GOP $ Override';
export type CurrencyDisplayMode = 'cents' | 'whole';
export type PercentageDisplayDecimals = 1 | 2;
export type VarianceView = 'Base / Posted View' | 'Accrual-Adjusted View';
export type ReportingView = 'PTD' | 'MTD' | 'QTD' | 'YTD' | 'YoY';
export type SnapshotReportScope = 'weekly' | 'monthly' | 'ninetyDay';

export interface DisplaySettings {
  currencyDisplay: CurrencyDisplayMode;
  percentageDecimals: PercentageDisplayDecimals;
  roundCalculationsToWholeDollars: boolean;
}

export interface PeriodInput {
  revenue: number;
  expenses: number;
  expenseBreakdownEnabled: boolean;
  payroll: number;
  payrollTaxes: number;
  employeeBenefits: number;
  contractLabor: number;
  roomsExpense: number;
  foodBeverageExpense: number;
  utilities: number;
  repairsMaintenance: number;
  supplies: number;
  adminGeneral: number;
  salesMarketing: number;
  otherOperatingExpenses: number;
  manualGopOverride: boolean;
  manualGop: number;
  revenueAccruals: number;
  expenseAccruals: number;
  otherGopAdjustments: number;
  accrualNotes: string;
  useAccrualAdjustedViewForVariance: boolean;
  targetGopPct: number;
  targetGopDollarOverrideEnabled: boolean;
  targetGopDollarOverride: number;
  budgetedGopPct: number | null;
  daysRemaining: number;
  daysRemainingOverride: boolean;
  flowThroughPct: number;
  revenuePlan: number | null;
  gopPlan: number | null;
  priorYearRevenue: number | null;
  priorYearExpenses: number | null;
  priorYearGop: number | null;
  priorYearGopPct: number | null;
  workCalculatedGap: number | null;
  workNotes: string;
  notes: string;
}

export type AdjustmentType =
  | 'Expense cut / savings'
  | 'GOP improvement'
  | 'Revenue increase'
  | 'Other';
export type ProjectionAdjustmentSource = 'manual' | 'recommended';

export interface ProjectionAdjustment {
  id: string;
  description: string;
  type: AdjustmentType;
  monthImpact: number;
  quarterImpact: number;
  yearImpact: number;
  flowThroughPct: number | null;
  notes: string;
  source?: ProjectionAdjustmentSource;
  recommendationId?: string;
}

export interface SnapshotDraft {
  id?: string;
  weekEnding: string;
  asOfDate: string;
  preparedBy: string;
  propertyLocation: string;
  operatorName: string;
  rooms: number;
  reportingMonth: string;
  reportingView: ReportingView;
  ptdPeriodName: string;
  periodStart: string;
  periodEnd: string;
  daysElapsed: number;
  reportingDaysRemaining: number;
  propertyTargetGopPct: number;
  displaySettings: DisplaySettings;
  propertySetup: PropertySetup;
  periods: Record<PeriodKey, PeriodInput>;
  adjustments: ProjectionAdjustment[];
  demoMode?: boolean;
  updatedAt?: string;
}

export interface SavedSnapshot extends SnapshotDraft {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export interface RevenueRecovery {
  amount: number;
  achievable: boolean;
  message?: string;
}

export interface PeriodCalculation {
  baseRevenue: number;
  effectiveExpenses: number;
  expenseBreakdownTotal: number;
  expenseSource: 'Manual expenses' | 'Expense breakdown';
  baseGop: number;
  baseGopPct: number;
  adjustedRevenue: number;
  adjustedGop: number;
  adjustedGopPct: number;
  actualRevenue: number;
  actualGop: number;
  actualGopPct: number;
  varianceView: VarianceView;
  targetGop: number;
  targetGopPctUsed: number;
  targetGopSource: TargetGopSource;
  budgetedGop: number | null;
  varianceToTargetPct: number;
  dollarGap: number;
  status: Status;
  gopImprovementNeeded: number;
  dailyRecoveryNeeded: number;
  revenueNeededAtFlowThrough: RevenueRecovery;
  actualFlow: ActualFlowCalculation;
  yoy: YoYCalculation;
  reconciliation: ReconciliationCalculation | null;
}

export interface ActualFlowCalculation {
  basisLabel: 'Using base/posted values.' | 'Using accrual-adjusted values.';
  revenuePlan: number | null;
  gopPlan: number | null;
  gopPlanSource: 'Entered GOP Plan / Target' | 'Target GOP $';
  revenueVariance: number | null;
  gopVariance: number | null;
  actualFlowThroughPct: number | null;
  flexFlowPct: number | null;
  message: string | null;
}

export interface YoYCalculation {
  hasPriorYearValues: boolean;
  priorYearRevenue: number | null;
  priorYearExpenses: number | null;
  priorYearGop: number | null;
  priorYearGopPct: number | null;
  priorYearGopPctSource:
    | 'Calculated from Prior Year GOP and Revenue'
    | 'Manual Prior Year GOP %'
    | 'Not available';
  revenueYoyChange: number | null;
  revenueYoyChangePct: number | null;
  gopYoyChange: number | null;
  gopYoyChangePct: number | null;
  gopMarginYoyChange: number | null;
  message: string | null;
}

export interface ReconciliationCalculation {
  vyntaxGap: number;
  workGap: number;
  difference: number;
  withinTolerance: boolean;
}

export interface ProjectionImpact {
  revenueDelta: number;
  gopImpact: number;
  gapReduction: number;
}

export interface ProjectionCalculation {
  base: PeriodCalculation;
  impact: ProjectionImpact;
  projectedRevenue: number;
  projectedGop: number;
  projectedTargetGop: number;
  projectedRemainingGap: number;
  projectedGap: number;
  projectedStatus: ProjectedStatus;
}
