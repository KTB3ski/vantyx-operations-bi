import { describe, expect, it } from 'vitest';
import {
  calculateWarehouseShift,
  warehouseDemoShift,
  type WarehouseShiftInput,
} from '../domain/warehouse';

describe('warehouse shift model', () => {
  it('calculates overnight elapsed and remaining shift time', () => {
    const result = calculateWarehouseShift(warehouseDemoShift);

    expect(result.plannedShiftHours).toBeCloseTo(8, 4);
    expect(result.elapsedHours).toBeCloseTo(4.5, 4);
    expect(result.remainingHours).toBeCloseTo(3.5, 4);
  });

  it('calculates pace, required recovery pace, and forecasted finish', () => {
    const result = calculateWarehouseShift(warehouseDemoShift);

    expect(result.casesRemaining).toBe(29_600);
    expect(result.forkliftDropsRemaining).toBe(222);
    expect(result.teamCasesPerHour).toBeCloseTo(6311.11, 2);
    expect(result.requiredCasesPerHour).toBeCloseTo(8457.14, 2);
    expect(result.requiredForkliftDropsPerHour).toBeCloseTo(63.43, 2);
    expect(result.projectedFinishTime).toBe('03:11 (+1d)');
    expect(result.projectedFinishVarianceMinutes).toBeCloseTo(71.41, 2);
    expect(result.netAvailableSelectors).toBe(42);
    expect(result.status).toBe('Behind');
  });

  it('summarizes route sheet status for shift review snapshots', () => {
    const result = calculateWarehouseShift(warehouseDemoShift);

    expect(result.routeSheetStatus).toBe('Preliminary');
    expect(result.totalRoutes).toBe(4);
    expect(result.loadedRoutes).toBe(1);
    expect(result.lateRoutes).toBe(1);
    expect(result.cutRoutes).toBe(1);
    expect(result.plannedRouteCases).toBe(16_400);
  });

  it('counts loaded routes as late when actual load time misses the planned window', () => {
    const result = calculateWarehouseShift({
      ...warehouseDemoShift,
      routes: [
        {
          id: 'route-1',
          routeName: 'Route 1',
          plannedLoadTime: '22:00',
          actualLoadTime: '22:12',
          plannedCases: 1200,
          status: 'Loaded',
          note: '',
        },
      ],
    });

    expect(result.loadedRoutes).toBe(1);
    expect(result.lateRoutes).toBe(1);
    expect(result.cutRoutes).toBe(0);
  });

  it('calculates selector labor needed to recover the night', () => {
    const result = calculateWarehouseShift(warehouseDemoShift);

    expect(result.directSelectorHours).toBeCloseTo(152.5, 4);
    expect(result.casesPerSelectorHour).toBeCloseTo(186.23, 2);
    expect(result.selectorsNeededToFinish).toBeCloseTo(45.41, 2);
    expect(result.additionalSelectorsNeeded).toBe(7);
  });

  it('summarizes labor system hours without changing throughput math', () => {
    const result = calculateWarehouseShift(warehouseDemoShift);

    expect(result.blueYonderManHours).toBe(176);
    expect(result.kronosLoggedHours).toBe(179.5);
    expect(result.laborHourVariance).toBeCloseTo(3.5, 4);
    expect(result.teamCasesPerHour).toBeCloseTo(6311.11, 2);
  });

  it('builds labor move checks from forklift drops and selector flow', () => {
    const result = calculateWarehouseShift(warehouseDemoShift);
    const forkliftCheck = result.laborMoveChecks.find(
      (check) => check.id === 'forklift-coverage',
    );
    const selectorCheck = result.laborMoveChecks.find(
      (check) => check.id === 'selector-coverage',
    );
    const rebalanceCheck = result.laborMoveChecks.find(
      (check) => check.id === 'rebalance-support',
    );

    expect(forkliftCheck?.decision).toBe('Do Not Cut');
    expect(forkliftCheck?.area).toBe('Cooler');
    expect(selectorCheck?.decision).toBe('Do Not Cut');
    expect(rebalanceCheck?.decision).toBe('Rebalance Support');
  });

  it('identifies zone-level pace risk', () => {
    const result = calculateWarehouseShift(warehouseDemoShift);
    const freezer = result.zones.find((zone) => zone.id === 'freezer');
    const beverage = result.zones.find((zone) => zone.id === 'beverage');

    expect(freezer?.status).toBe('Behind');
    expect(freezer?.scheduledSelectors).toBe(9);
    expect(freezer?.forkliftDropsRemaining).toBe(59);
    expect(freezer?.requiredCasesPerHour).toBeCloseTo(2171.43, 2);
    expect(beverage?.status).toBe('Ahead');
  });

  it('marks a completed shift as complete', () => {
    const completeInput: WarehouseShiftInput = {
      ...warehouseDemoShift,
      selectedCases: warehouseDemoShift.plannedCases,
      completedForkliftDrops: warehouseDemoShift.plannedForkliftDrops,
    };

    const result = calculateWarehouseShift(completeInput);

    expect(result.status).toBe('Complete');
    expect(result.casesRemaining).toBe(0);
    expect(result.requiredCasesPerHour).toBe(0);
  });
});
