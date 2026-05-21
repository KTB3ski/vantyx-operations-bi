import { describe, expect, it } from 'vitest';
import {
  calculateWeeklyGop,
  calculateWeeklyGopControl,
  operatingAreaVarianceDemoData,
  weeklyGopDemoData,
} from '../domain/weeklyGopControl';
import { createDefaultPropertySetup } from '../domain/propertySetup';

describe('weekly variance review', () => {
  it('calculates weekly GOP percent and recovery gap', () => {
    const weekOne = calculateWeeklyGop(weeklyGopDemoData[0]);

    expect(weekOne.weeklyGopPercent).toBeCloseTo(0.2938, 4);
    expect(weekOne.weeklyGap).toBeCloseTo(1_800, 2);
    expect(weekOne.status).toBe('Below Plan');
  });

  it('marks a forecasted week meaningfully below goal as needing recovery', () => {
    const weekThree = calculateWeeklyGop(weeklyGopDemoData[2]);

    expect(weekThree.weeklyGap).toBeCloseTo(5_500, 2);
    expect(weekThree.status).toBe('Needs Recovery');
  });

  it('marks a forecasted week close to goal as a slight variance', () => {
    const weekFour = calculateWeeklyGop(weeklyGopDemoData[3]);

    expect(weekFour.weeklyGap).toBeCloseTo(-745, 2);
    expect(weekFour.status).toBe('Slight Variance');
  });

  it('calculates monthly weekly gap total and weekly recovery need', () => {
    const control = calculateWeeklyGopControl(weeklyGopDemoData, 2_128.17);

    expect(control.monthlyWeeklyGapTotal).toBeCloseTo(3_855, 2);
    expect(control.remainingWeeks).toBe(2);
    expect(control.weeklyRecoveryNeeded).toBeCloseTo(1_064.09, 2);
    expect(control.focusWeek.week).toBe('Week 3');
  });

  it('calculates operating area net variance for the weekly review', () => {
    const setup = createDefaultPropertySetup();
    const enabledAreas = operatingAreaVarianceDemoData.filter((area) =>
      setup.enabledOperatingAreaIds.includes(area.id),
    );
    const control = calculateWeeklyGopControl(
      weeklyGopDemoData,
      2_128.17,
      enabledAreas,
    );

    expect(operatingAreaVarianceDemoData.map((area) => area.area)).toEqual([
      'Housekeeping',
      'Shuttle Drivers',
      'Food Services',
      'Banquets / Events',
      'Gift Shop / Retail',
      'Valet',
      'Parking',
      'Front Desk',
      'Maintenance',
      'Spa / Wellness',
      'Security',
    ]);
    expect(enabledAreas.map((area) => area.area)).toEqual([
      'Housekeeping',
      'Food Services',
      'Banquets / Events',
      'Gift Shop / Retail',
      'Valet',
      'Front Desk',
      'Maintenance',
    ]);
    expect(control.operatingAreaNetVariance).toBeCloseTo(-75, 2);
    expect(control.operatingAreaSurplusTotal).toBeCloseTo(1_815, 2);
    expect(control.operatingAreaGapTotal).toBeCloseTo(-1_890, 2);
    expect(operatingAreaVarianceDemoData[0]).toMatchObject({
      weeklyPlan: 8_500,
      actual: 9_750,
      variance: 1_250,
    });
  });
});
