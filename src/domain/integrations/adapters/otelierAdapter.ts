import { getIntegrationProvider } from '../providerRegistry';
import type {
  AdapterCapabilities,
  ForecastSnapshotInput,
  IntegrationPeriodType,
  IntegrationValidationResult,
} from '../types';

export interface OtelierForecastExportRow {
  propertyId?: string;
  periodType?: IntegrationPeriodType;
  forecastRevenue?: number;
  forecastExpenses?: number;
  forecastGop?: number;
  occupancy?: number;
  adr?: number;
  revpar?: number;
  sourceTimestamp?: string;
}

export const otelierAdapterCapabilities = {
  performsNetworkCalls: false,
  requiresCredentials: true,
} satisfies AdapterCapabilities;

export function getProviderInfo() {
  return getIntegrationProvider('otelier');
}

export function validateConfig(): IntegrationValidationResult {
  return {
    valid: false,
    errors: [
      'Otelier connector is not active. Written approval, vendor access, and credentials are required before use.',
    ],
  };
}

export function mapToForecastSnapshot(
  row: OtelierForecastExportRow,
): ForecastSnapshotInput {
  // Placeholder mapping: replace these field names only after approved
  // Otelier export/API field definitions are provided.
  return {
    provider: 'otelier',
    propertyId: row.propertyId,
    periodType: row.periodType ?? 'month',
    forecastRevenue: row.forecastRevenue,
    forecastExpenses: row.forecastExpenses,
    forecastGop: row.forecastGop,
    occupancy: row.occupancy,
    adr: row.adr,
    revpar: row.revpar,
    sourceTimestamp: row.sourceTimestamp,
  };
}
