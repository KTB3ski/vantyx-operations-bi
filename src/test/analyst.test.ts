import { describe, expect, it } from 'vitest';
import { buildVyntaxAnalystBriefing } from '../domain/analyst';
import { calculatePeriod, calculateProjection } from '../domain/calculations';
import { createDemoDraft } from '../domain/demoData';
import type {
  PeriodCalculation,
  PeriodInput,
  PeriodKey,
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
  draft: SnapshotDraft,
) {
  return Object.fromEntries(
    PERIOD_KEYS.map((period) => [
      period,
      calculateProjection(period, inputs[period], draft.adjustments),
    ]),
  ) as Record<PeriodKey, ProjectionCalculation>;
}

describe('Vyntax analyst briefing', () => {
  it('explains that the paid-pilot demo gap is covered by the action plan', () => {
    const draft = createDemoDraft('2026-04-30');
    const inputs = buildInputs(draft);
    const calculations = buildCalculations(inputs);
    const projections = buildProjections(inputs, draft);

    const briefing = buildVyntaxAnalystBriefing({
      draft,
      periodInputs: inputs,
      calculations,
      projections,
      reportingPeriodKey: 'month',
    });

    expect(briefing.tone).toBe('protected');
    expect(briefing.headline).toContain('recoverable');
    expect(briefing.primaryRecommendation).toContain('Food Services');
    expect(briefing.confidence).toBe('High');
  });

  it('asks for more recovery impact when manual inputs widen the gap', () => {
    const draft = {
      ...createDemoDraft('2026-04-30'),
      adjustments: [],
      periods: {
        ...createDemoDraft('2026-04-30').periods,
        month: {
          ...createDemoDraft('2026-04-30').periods.month,
          manualGop: 450_000,
        },
      },
    };
    const inputs = buildInputs(draft);
    const calculations = buildCalculations(inputs);
    const projections = buildProjections(inputs, draft);

    const briefing = buildVyntaxAnalystBriefing({
      draft,
      periodInputs: inputs,
      calculations,
      projections,
      reportingPeriodKey: 'month',
    });

    expect(briefing.tone).toBe('recover');
    expect(briefing.headline).toContain('more recovery impact');
    expect(briefing.nextSteps.join(' ')).toContain('action plan impact');
  });
});
