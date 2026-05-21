import type { PeriodInput } from '../../types';
import { createEmptyExpenseBreakdown } from '../../expenseBreakdown';
import { getIntegrationProvider } from '../providerRegistry';
import type {
  AdapterCapabilities,
  FinancialSnapshotInput,
  ForecastSnapshotInput,
  IntegrationValidationResult,
  LaborSnapshotInput,
} from '../types';

export const manualAdapterCapabilities = {
  performsNetworkCalls: false,
  requiresCredentials: false,
} satisfies AdapterCapabilities;

export function getProviderInfo() {
  return getIntegrationProvider('manual');
}

export function validateConfig(): IntegrationValidationResult {
  return { valid: true, errors: [] };
}

export function mapToFinancialSnapshot(
  input: FinancialSnapshotInput,
): FinancialSnapshotInput {
  return { ...input, provider: 'manual' };
}

export function mapToLaborSnapshot(input: LaborSnapshotInput): LaborSnapshotInput {
  return { ...input, provider: 'manual' };
}

export function mapToForecastSnapshot(
  input: ForecastSnapshotInput,
): ForecastSnapshotInput {
  return { ...input, provider: 'manual' };
}

export function mapFinancialSnapshotToPeriodInput(
  snapshot: FinancialSnapshotInput,
  options: { daysRemaining?: number; flowThroughPct?: number; notes?: string } = {},
): PeriodInput {
  return {
    revenue: snapshot.revenue,
    expenses: snapshot.expenses,
    ...createEmptyExpenseBreakdown(),
    manualGopOverride: true,
    manualGop: snapshot.actualGop,
    revenueAccruals: 0,
    expenseAccruals: 0,
    otherGopAdjustments: 0,
    accrualNotes: '',
    useAccrualAdjustedViewForVariance: false,
    targetGopPct: snapshot.targetGopPercent,
    targetGopDollarOverrideEnabled: false,
    targetGopDollarOverride: 0,
    budgetedGopPct: snapshot.budgetedGopPercent ?? null,
    daysRemaining: options.daysRemaining ?? 0,
    daysRemainingOverride: false,
    flowThroughPct: options.flowThroughPct ?? 0,
    revenuePlan: null,
    gopPlan: null,
    priorYearRevenue: null,
    priorYearExpenses: null,
    priorYearGop: null,
    priorYearGopPct: null,
    workCalculatedGap: null,
    workNotes: '',
    notes: options.notes ?? `Mapped from ${snapshot.provider} normalized input.`,
  };
}
