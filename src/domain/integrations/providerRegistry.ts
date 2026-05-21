import type {
  IntegrationProviderConfig,
  IntegrationProviderId,
} from './types';

export const integrationProviders = [
  {
    id: 'manual',
    name: 'Manual Entry',
    category: 'Manual Entry',
    status: 'Active',
    connectionType: 'Manual/CSV today',
    requiresApproval: false,
    supportsApi: false,
    supportsCsv: false,
    notes: 'Enter weekly numbers directly into Vyntax.',
  },
  {
    id: 'csv',
    name: 'CSV Import',
    category: 'File Import',
    status: 'Ready',
    connectionType: 'Manual/CSV today',
    requiresApproval: false,
    supportsApi: false,
    supportsCsv: true,
    notes: 'Import approved exported reports manually.',
  },
  {
    id: 'm3',
    name: 'Accounting Export',
    category: 'Financial / Accounting',
    status: 'Not Connected',
    connectionType: 'API/File Export later',
    requiresApproval: true,
    supportsApi: true,
    supportsCsv: true,
    notes:
      'Future approved financial/accounting connector for revenue, expenses, GOP, and target data.',
  },
  {
    id: 'otelier',
    name: 'BI Export',
    category: 'Business Intelligence',
    status: 'Not Connected',
    connectionType: 'API/File Export later',
    requiresApproval: true,
    supportsApi: true,
    supportsCsv: true,
    notes:
      'Future approved BI connector for property, revenue, forecast, and portfolio reporting data.',
  },
  {
    id: 'hotel_effectiveness',
    name: 'Labor Export',
    category: 'Labor Management',
    status: 'Not Connected',
    connectionType: 'API/File Export later',
    requiresApproval: true,
    supportsApi: true,
    supportsCsv: true,
    notes:
      'Future approved labor connector for labor cost, hours, overtime, productivity, and staffing data.',
  },
] satisfies IntegrationProviderConfig[];

export function getIntegrationProviders() {
  return integrationProviders;
}

export function getIntegrationProvider(id: IntegrationProviderId) {
  return integrationProviders.find((provider) => provider.id === id);
}

export function getVendorProviders() {
  return integrationProviders.filter((provider) => provider.requiresApproval);
}
