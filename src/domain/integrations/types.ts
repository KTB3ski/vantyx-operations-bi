export type IntegrationProviderId =
  | 'manual'
  | 'csv'
  | 'm3'
  | 'otelier'
  | 'hotel_effectiveness';

export type IntegrationPeriodType = 'month' | 'quarter' | 'year';
export type IntegrationStatus = 'Active' | 'Ready' | 'Not Connected';
export type IntegrationConnectionType =
  | 'Manual/CSV today'
  | 'API/File Export later';
export type IntegrationCategory =
  | 'Manual Entry'
  | 'File Import'
  | 'Financial / Accounting'
  | 'Business Intelligence'
  | 'Labor Management';

export interface FinancialSnapshotInput {
  provider: IntegrationProviderId | string;
  propertyId?: string;
  propertyName?: string;
  periodType: IntegrationPeriodType;
  periodStart?: string;
  periodEnd?: string;
  revenue: number;
  expenses: number;
  actualGop: number;
  targetGopPercent: number;
  budgetedGopPercent?: number;
  sourceTimestamp?: string;
}

export interface LaborSnapshotInput {
  provider: IntegrationProviderId | string;
  propertyId?: string;
  periodType: IntegrationPeriodType;
  laborCost: number;
  scheduledHours?: number;
  actualHours?: number;
  overtimeCost?: number;
  productivityMetric?: number;
  sourceTimestamp?: string;
}

export interface ForecastSnapshotInput {
  provider: IntegrationProviderId | string;
  propertyId?: string;
  periodType: IntegrationPeriodType;
  forecastRevenue?: number;
  forecastExpenses?: number;
  forecastGop?: number;
  occupancy?: number;
  adr?: number;
  revpar?: number;
  sourceTimestamp?: string;
}

export interface IntegrationProviderConfig {
  id: IntegrationProviderId;
  name: string;
  category: IntegrationCategory;
  status: IntegrationStatus;
  connectionType: IntegrationConnectionType;
  requiresApproval: boolean;
  supportsApi: boolean;
  supportsCsv: boolean;
  notes: string;
}

export interface IntegrationValidationResult {
  valid: boolean;
  errors: string[];
}

export interface AdapterCapabilities {
  performsNetworkCalls: false;
  requiresCredentials: boolean;
}
