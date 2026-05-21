import { describe, expect, it } from 'vitest';
import {
  buildAiActionPlanRequest,
  mergeAiActionPlanDraft,
} from '../domain/aiActionPlan';
import { generateActionPlanRecommendations } from '../domain/actionPlan';
import { calculatePeriod, calculateProjection } from '../domain/calculations';
import { createDemoDraft } from '../domain/demoData';
import type {
  PeriodCalculation,
  PeriodInput,
  PeriodKey,
  ProjectionCalculation,
} from '../domain/types';
import { PERIOD_KEYS } from '../domain/types';

function buildInputs() {
  return createDemoDraft().periods as Record<PeriodKey, PeriodInput>;
}

function buildCalculations(inputs: Record<PeriodKey, PeriodInput>) {
  return Object.fromEntries(
    PERIOD_KEYS.map((period) => [period, calculatePeriod(inputs[period])]),
  ) as Record<PeriodKey, PeriodCalculation>;
}

function buildProjections(inputs: Record<PeriodKey, PeriodInput>) {
  return Object.fromEntries(
    PERIOD_KEYS.map((period) => [
      period,
      calculateProjection(period, inputs[period], []),
    ]),
  ) as Record<PeriodKey, ProjectionCalculation>;
}

describe('AI action plan helpers', () => {
  it('builds an AI payload from Vyntax facts and base recommendations', () => {
    const draft = {
      ...createDemoDraft(),
      adjustments: [],
    };
    const inputs = buildInputs();
    const calculations = buildCalculations(inputs);
    const projections = buildProjections(inputs);
    const baseRecommendations = generateActionPlanRecommendations({
      draft,
      periodInputs: inputs,
      calculations,
      projections,
      reportingPeriodKey: 'month',
    });

    const payload = buildAiActionPlanRequest(
      draft,
      inputs,
      calculations,
      projections,
      'month',
      baseRecommendations,
    );

    expect(payload.app).toBe('Vyntax');
    expect(payload.task).toBe('hotel_gop_action_plan');
    expect(payload.baseRecommendations.length).toBeGreaterThan(0);
    expect(payload.context.recoveryFlowThroughPct).toBe('50.00%');
    expect(payload.enabledOperatingAreas).toContain('Banquets / Events');
    expect(payload.operatingAreaGaps.some((gap) => gap.area === 'Shuttle Drivers')).toBe(false);
  });

  it('merges AI language without changing recommendation math', () => {
    const recommendation = generateActionPlanRecommendations({
      draft: {
        ...createDemoDraft(),
        adjustments: [],
      },
      periodInputs: buildInputs(),
      calculations: buildCalculations(buildInputs()),
      projections: buildProjections(buildInputs()),
      reportingPeriodKey: 'month',
    })[0];

    const merged = mergeAiActionPlanDraft([recommendation], {
      summary: 'Focus on the largest controllable gap first.',
      actions: [
        {
          recommendationId: recommendation.recommendationId,
          title: 'Assign ownership for the largest weekly gap',
          note: 'Start with the area furthest below weekly plan.',
          priority: 'High',
          timeframe: 'Today',
          confidence: 'High',
        },
      ],
    });

    expect(merged[0].description).toBe('Assign ownership for the largest weekly gap');
    expect(merged[0].monthImpact).toBe(recommendation.monthImpact);
    expect(merged[0].quarterImpact).toBe(recommendation.quarterImpact);
    expect(merged[0].yearImpact).toBe(recommendation.yearImpact);
    expect(merged[0].notes).toBe(
      'Start with the area furthest below weekly plan.',
    );
    expect(merged[0].notes).not.toContain('Priority');
  });
});
