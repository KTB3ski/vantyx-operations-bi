import { getIntegrationProvider } from '../providerRegistry';
import type {
  AdapterCapabilities,
  IntegrationPeriodType,
  IntegrationValidationResult,
  LaborSnapshotInput,
} from '../types';

export interface HotelEffectivenessLaborExportRow {
  propertyId?: string;
  periodType?: IntegrationPeriodType;
  laborCost?: number;
  scheduledHours?: number;
  actualHours?: number;
  overtimeCost?: number;
  productivityMetric?: number;
  sourceTimestamp?: string;
}

export const hotelEffectivenessAdapterCapabilities = {
  performsNetworkCalls: false,
  requiresCredentials: true,
} satisfies AdapterCapabilities;

export function getProviderInfo() {
  return getIntegrationProvider('hotel_effectiveness');
}

export function validateConfig(): IntegrationValidationResult {
  return {
    valid: false,
    errors: [
      'Hotel Effectiveness / Actabl connector is not active. Written approval, vendor access, and credentials are required before use.',
    ],
  };
}

export function mapToLaborSnapshot(
  row: HotelEffectivenessLaborExportRow,
): LaborSnapshotInput {
  // Placeholder mapping: replace these field names only after approved labor
  // export/API field definitions are provided.
  return {
    provider: 'hotel_effectiveness',
    propertyId: row.propertyId,
    periodType: row.periodType ?? 'month',
    laborCost: row.laborCost ?? 0,
    scheduledHours: row.scheduledHours,
    actualHours: row.actualHours,
    overtimeCost: row.overtimeCost,
    productivityMetric: row.productivityMetric,
    sourceTimestamp: row.sourceTimestamp,
  };
}
