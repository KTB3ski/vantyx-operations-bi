import { describe, expect, it } from 'vitest';
import { generateActionPlanRecommendations } from '../domain/actionPlan';
import { calculatePeriod, calculateProjection } from '../domain/calculations';
import { createDemoDraft } from '../domain/demoData';
import type {
  PeriodCalculation,
  PeriodInput,
  PeriodKey,
  ProjectionAdjustment,
  ProjectionCalculation,
  SnapshotDraft,
} from '../domain/types';
import { PERIOD_KEYS } from '../domain/types';

function buildInputs(draft: SnapshotDraft) {
  return draft.periods as Record<PeriodKey, PeriodInput>;
}

function buildCalculations(inputs: Record<PeriodKey, PeriodInput>) {
  return Object.fromEntries(
    PERIOD_KEYS.map((period) => [period, calculatePeriod(inputs[period])]),
  ) as Record<PeriodKey, PeriodCalculation>;
}

function buildProjections(
  inputs: Record<PeriodKey, PeriodInput>,
  adjustments: ProjectionAdjustment[] = [],
) {
  return Object.fromEntries(
    PERIOD_KEYS.map((period) => [
      period,
      calculateProjection(period, inputs[period], adjustments),
    ]),
  ) as Record<PeriodKey, ProjectionCalculation>;
}

function withIds(
  recommendations: ReturnType<typeof generateActionPlanRecommendations>,
): ProjectionAdjustment[] {
  return recommendations.map((recommendation, index) => ({
    id: `suggested-${index}`,
    ...recommendation,
  }));
}

describe('action plan recommendations', () => {
  it('generates property-aware recovery actions without disabled operating areas', () => {
    const draft = createDemoDraft();
    const inputs = buildInputs(draft);
    const calculations = buildCalculations(inputs);
    const projections = buildProjections(inputs);

    const recommendations = generateActionPlanRecommendations({
      draft: {
        ...draft,
        adjustments: [],
      },
      periodInputs: inputs,
      calculations,
      projections,
      reportingPeriodKey: 'month',
    });

    expect(recommendations.length).toBeGreaterThan(0);
    expect(recommendations.some((row) => row.description.includes('Food Services'))).toBe(true);
    expect(recommendations.some((row) => row.description.includes('Banquets'))).toBe(true);
    expect(recommendations.some((row) => row.description.includes('Shuttle'))).toBe(false);
    expect(recommendations.every((row) => row.source === 'recommended')).toBe(true);
  });

  it('suggests enough action-plan impact to close the demo month gap', () => {
    const draft = {
      ...createDemoDraft(),
      adjustments: [],
    };
    const inputs = buildInputs(draft);
    const calculations = buildCalculations(inputs);
    const projections = buildProjections(inputs);
    const recommendations = generateActionPlanRecommendations({
      draft,
      periodInputs: inputs,
      calculations,
      projections,
      reportingPeriodKey: 'month',
    });
    const projectedWithRecommendations = calculateProjection(
      'month',
      inputs.month,
      withIds(recommendations),
    );

    expect(projectedWithRecommendations.projectedRemainingGap).toBeLessThanOrEqual(1);
  });

  it('does not suggest revenue lift when flow-through is below target GOP', () => {
    const draft = {
      ...createDemoDraft(),
      propertySetup: {
        enabledOperatingAreaIds: [],
      },
      adjustments: [],
      periods: {
        ...createDemoDraft().periods,
        month: {
          ...createDemoDraft().periods.month,
          flowThroughPct: 0.2,
          targetGopPct: 0.3,
        },
      },
    };
    const inputs = buildInputs(draft);
    const calculations = buildCalculations(inputs);
    const projections = buildProjections(inputs);

    const recommendations = generateActionPlanRecommendations({
      draft,
      periodInputs: inputs,
      calculations,
      projections,
      reportingPeriodKey: 'month',
    });

    expect(recommendations.some((row) => row.type === 'Revenue increase')).toBe(false);
    expect(
      recommendations.every((row) => row.type !== 'Revenue increase'),
    ).toBe(true);
  });

  it('returns a maintenance action when the selected period is already forecasted to hit', () => {
    const draft = {
      ...createDemoDraft(),
      adjustments: [],
      periods: {
        ...createDemoDraft().periods,
        month: {
          ...createDemoDraft().periods.month,
          manualGop: 490_000,
        },
      },
    };
    const inputs = buildInputs(draft);
    const calculations = buildCalculations(inputs);
    const projections = buildProjections(inputs);

    const recommendations = generateActionPlanRecommendations({
      draft,
      periodInputs: inputs,
      calculations,
      projections,
      reportingPeriodKey: 'month',
    });

    expect(recommendations).toHaveLength(1);
    expect(recommendations[0].description).toBe(
      'Hold the current plan and monitor daily',
    );
    expect(recommendations[0].monthImpact).toBe(0);
    expect(recommendations[0].notes).toContain('Forecasted to hit target');
  });
});
