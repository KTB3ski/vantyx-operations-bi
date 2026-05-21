import { getIntegrationProvider } from '../providerRegistry';
import type {
  AdapterCapabilities,
  FinancialSnapshotInput,
  IntegrationPeriodType,
  IntegrationValidationResult,
} from '../types';

export interface M3FinancialExportRow {
  propertyId?: string;
  propertyName?: string;
  periodType?: IntegrationPeriodType;
  periodStart?: string;
  periodEnd?: string;
  revenue?: number;
  expenses?: number;
  actualGop?: number;
  targetGopPercent?: number;
  budgetedGopPercent?: number;
  sourceTimestamp?: string;
}

export const m3AdapterCapabilities = {
  performsNetworkCalls: false,
  requiresCredentials: true,
} satisfies AdapterCapabilities;

export function getProviderInfo() {
  return getIntegrationProvider('m3');
}

export function validateConfig(): IntegrationValidationResult {
  return {
    valid: false,
    errors: [
      'M3 connector is not active. Written approval, vendor access, and credentials are required before use.',
    ],
  };
}

export function mapToFinancialSnapshot(
  row: M3FinancialExportRow,
): FinancialSnapshotInput {
  // Placeholder mapping: replace these field names only after approved M3
  // export/API field definitions are provided.
  return {
    provider: 'm3',
    propertyId: row.propertyId,
    propertyName: row.propertyName,
    periodType: row.periodType ?? 'month',
    periodStart: row.periodStart,
    periodEnd: row.periodEnd,
    revenue: row.revenue ?? 0,
    expenses: row.expenses ?? 0,
    actualGop: row.actualGop ?? 0,
    targetGopPercent: row.targetGopPercent ?? 0,
    budgetedGopPercent: row.budgetedGopPercent,
    sourceTimestamp: row.sourceTimestamp,
  };
}
