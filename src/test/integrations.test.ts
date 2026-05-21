import { describe, expect, it } from 'vitest';
import {
  getIntegrationProvider,
  getIntegrationProviders,
  getVendorProviders,
} from '../domain/integrations/providerRegistry';
import type { FinancialSnapshotInput } from '../domain/integrations/types';
import {
  mapFinancialSnapshotToPeriodInput,
  manualAdapterCapabilities,
} from '../domain/integrations/adapters/manualAdapter';
import { csvAdapterCapabilities } from '../domain/integrations/adapters/csvAdapter';
import { m3AdapterCapabilities } from '../domain/integrations/adapters/m3Adapter';
import { otelierAdapterCapabilities } from '../domain/integrations/adapters/otelierAdapter';
import { hotelEffectivenessAdapterCapabilities } from '../domain/integrations/adapters/hotelEffectivenessAdapter';

describe('integration readiness layer', () => {
  it('registers expected providers', () => {
    const ids = getIntegrationProviders().map((provider) => provider.id);

    expect(ids).toEqual([
      'manual',
      'csv',
      'm3',
      'otelier',
      'hotel_effectiveness',
    ]);
  });

  it('keeps vendor connectors disabled by default', () => {
    expect(getIntegrationProvider('manual')?.status).toBe('Active');
    expect(getIntegrationProvider('csv')?.status).toBe('Ready');
    expect(getIntegrationProvider('m3')?.status).toBe('Not Connected');
    expect(getIntegrationProvider('otelier')?.status).toBe('Not Connected');
    expect(getIntegrationProvider('hotel_effectiveness')?.status).toBe(
      'Not Connected',
    );
  });

  it('requires approval for vendor connectors', () => {
    expect(getVendorProviders().map((provider) => provider.id)).toEqual([
      'm3',
      'otelier',
      'hotel_effectiveness',
    ]);
    expect(
      getVendorProviders().every((provider) => provider.requiresApproval),
    ).toBe(true);
  });

  it('maps a normalized financial snapshot to a Vyntax period input', () => {
    const snapshot: FinancialSnapshotInput = {
      provider: 'manual',
      periodType: 'month',
      revenue: 100_000,
      expenses: 70_000,
      actualGop: 30_000,
      targetGopPercent: 0.3,
      budgetedGopPercent: 0.31,
    };

    const period = mapFinancialSnapshotToPeriodInput(snapshot, {
      daysRemaining: 8,
      flowThroughPct: 0.5,
    });

    expect(period.revenue).toBe(100_000);
    expect(period.expenses).toBe(70_000);
    expect(period.manualGopOverride).toBe(true);
    expect(period.manualGop).toBe(30_000);
    expect(period.targetGopPct).toBe(0.3);
    expect(period.budgetedGopPct).toBe(0.31);
    expect(period.daysRemaining).toBe(8);
    expect(period.flowThroughPct).toBe(0.5);
  });

  it('declares every adapter as non-networking', () => {
    const capabilities = [
      manualAdapterCapabilities,
      csvAdapterCapabilities,
      m3AdapterCapabilities,
      otelierAdapterCapabilities,
      hotelEffectivenessAdapterCapabilities,
    ];

    expect(
      capabilities.every((capability) => !capability.performsNetworkCalls),
    ).toBe(true);
  });
});
