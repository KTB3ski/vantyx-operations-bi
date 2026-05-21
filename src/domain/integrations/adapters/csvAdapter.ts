import {
  mapCsvRowToFinancialSnapshot,
  parseCsvPreview,
  validateCsvHeaders,
  type CsvRow,
} from '../csvImport';
import { getIntegrationProvider } from '../providerRegistry';
import type {
  AdapterCapabilities,
  FinancialSnapshotInput,
  IntegrationValidationResult,
} from '../types';

export const csvAdapterCapabilities = {
  performsNetworkCalls: false,
  requiresCredentials: false,
} satisfies AdapterCapabilities;

export function getProviderInfo() {
  return getIntegrationProvider('csv');
}

export function validateConfig(): IntegrationValidationResult {
  return { valid: true, errors: [] };
}

export function mapToFinancialSnapshot(row: CsvRow): FinancialSnapshotInput {
  return mapCsvRowToFinancialSnapshot(row);
}

export function previewCsvRows(csvText: string) {
  return parseCsvPreview(csvText);
}

export function validateCsvImportHeaders(headers: string[]) {
  return validateCsvHeaders(headers);
}
