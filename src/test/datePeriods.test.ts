import { describe, expect, it } from 'vitest';
import {
  formatIsoDate,
  getDaysElapsed,
  getDaysRemaining,
  getDaysUntilNextPeriod,
  getMonthPeriod,
  getPriorYearPeriod,
  getQuarterPeriod,
  getUpcomingSunday,
  getYearPeriod,
  parseLocalDate,
} from '../domain/datePeriods';

function iso(date: Date) {
  return formatIsoDate(date);
}

describe('date period utilities', () => {
  it('gets month period start/end for a normal month', () => {
    const period = getMonthPeriod(parseLocalDate('2026-05-15'));

    expect(iso(period.start)).toBe('2026-05-01');
    expect(iso(period.end)).toBe('2026-05-31');
  });

  it('gets month period start/end for February in a leap year', () => {
    const period = getMonthPeriod(parseLocalDate('2024-02-10'));

    expect(iso(period.start)).toBe('2024-02-01');
    expect(iso(period.end)).toBe('2024-02-29');
  });

  it('gets quarter period start/end for Q1, Q2, Q3, and Q4', () => {
    expect(iso(getQuarterPeriod(parseLocalDate('2026-01-15')).start)).toBe(
      '2026-01-01',
    );
    expect(iso(getQuarterPeriod(parseLocalDate('2026-03-15')).end)).toBe(
      '2026-03-31',
    );
    expect(iso(getQuarterPeriod(parseLocalDate('2026-05-01')).start)).toBe(
      '2026-04-01',
    );
    expect(iso(getQuarterPeriod(parseLocalDate('2026-06-30')).end)).toBe(
      '2026-06-30',
    );
    expect(iso(getQuarterPeriod(parseLocalDate('2026-08-15')).start)).toBe(
      '2026-07-01',
    );
    expect(iso(getQuarterPeriod(parseLocalDate('2026-09-30')).end)).toBe(
      '2026-09-30',
    );
    expect(iso(getQuarterPeriod(parseLocalDate('2026-10-01')).start)).toBe(
      '2026-10-01',
    );
    expect(iso(getQuarterPeriod(parseLocalDate('2026-12-31')).end)).toBe(
      '2026-12-31',
    );
  });

  it('gets year period start/end', () => {
    const period = getYearPeriod(parseLocalDate('2026-05-01'));

    expect(iso(period.start)).toBe('2026-01-01');
    expect(iso(period.end)).toBe('2026-12-31');
  });

  it('calculates days elapsed and remaining for first day of month', () => {
    const asOf = parseLocalDate('2026-05-01');
    const period = getMonthPeriod(asOf);

    expect(getDaysElapsed(period, asOf)).toBe(1);
    expect(getDaysRemaining(period, asOf)).toBe(30);
    expect(getDaysUntilNextPeriod(period, asOf)).toBe(31);
  });

  it('calculates days elapsed and remaining for last day of month', () => {
    const asOf = parseLocalDate('2026-05-31');
    const period = getMonthPeriod(asOf);

    expect(getDaysElapsed(period, asOf)).toBe(31);
    expect(getDaysRemaining(period, asOf)).toBe(0);
    expect(getDaysUntilNextPeriod(period, asOf)).toBe(1);
  });

  it('keeps days remaining from going below zero', () => {
    const period = getMonthPeriod(parseLocalDate('2026-05-01'));

    expect(getDaysRemaining(period, parseLocalDate('2026-06-15'))).toBe(0);
  });

  it('maps a period to the prior year', () => {
    const period = getMonthPeriod(parseLocalDate('2026-05-01'));
    const priorYear = getPriorYearPeriod(period);

    expect(iso(priorYear.start)).toBe('2025-05-01');
    expect(iso(priorYear.end)).toBe('2025-05-31');
  });

  it('calculates PTD custom period days elapsed and remaining', () => {
    const period = {
      start: parseLocalDate('2026-05-10'),
      end: parseLocalDate('2026-05-20'),
    };
    const asOf = parseLocalDate('2026-05-12');

    expect(getDaysElapsed(period, asOf)).toBe(3);
    expect(getDaysRemaining(period, asOf)).toBe(8);
  });

  it('defaults week ending to the upcoming Sunday', () => {
    expect(iso(getUpcomingSunday(parseLocalDate('2026-05-01')))).toBe(
      '2026-05-03',
    );
    expect(iso(getUpcomingSunday(parseLocalDate('2026-05-03')))).toBe(
      '2026-05-03',
    );
  });
});
