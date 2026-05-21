import type { ReportingView } from './types';

export interface DatePeriod {
  start: Date;
  end: Date;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function localNoon(year: number, month: number, day: number) {
  return new Date(year, month, day, 12, 0, 0, 0);
}

function normalizeLocalDate(date: Date) {
  return localNoon(date.getFullYear(), date.getMonth(), date.getDate());
}

function daysBetween(start: Date, end: Date) {
  return Math.round(
    (normalizeLocalDate(end).getTime() - normalizeLocalDate(start).getTime()) /
      MS_PER_DAY,
  );
}

function lastDayOfMonth(year: number, month: number) {
  return localNoon(year, month + 1, 0).getDate();
}

function sameMonthDayInPriorYear(date: Date) {
  const year = date.getFullYear() - 1;
  const month = date.getMonth();
  const day = Math.min(date.getDate(), lastDayOfMonth(year, month));
  return localNoon(year, month, day);
}

export function parseLocalDate(dateString: string) {
  const [year, month, day] = dateString.split('-').map(Number);
  if (!year || !month || !day) return normalizeLocalDate(new Date());
  return localNoon(year, month - 1, day);
}

export function formatDisplayDate(date: Date) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(normalizeLocalDate(date));
}

export function formatIsoDate(date: Date) {
  const normalized = normalizeLocalDate(date);
  const year = normalized.getFullYear();
  const month = String(normalized.getMonth() + 1).padStart(2, '0');
  const day = String(normalized.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getTodayIsoDate(date = new Date()) {
  return formatIsoDate(date);
}

export function getMonthPeriod(asOfDate: Date): DatePeriod {
  const asOf = normalizeLocalDate(asOfDate);
  const year = asOf.getFullYear();
  const month = asOf.getMonth();
  return {
    start: localNoon(year, month, 1),
    end: localNoon(year, month + 1, 0),
  };
}

export function getQuarterPeriod(asOfDate: Date): DatePeriod {
  const asOf = normalizeLocalDate(asOfDate);
  const year = asOf.getFullYear();
  const quarterStartMonth = Math.floor(asOf.getMonth() / 3) * 3;
  return {
    start: localNoon(year, quarterStartMonth, 1),
    end: localNoon(year, quarterStartMonth + 3, 0),
  };
}

export function getYearPeriod(asOfDate: Date): DatePeriod {
  const year = normalizeLocalDate(asOfDate).getFullYear();
  return {
    start: localNoon(year, 0, 1),
    end: localNoon(year, 11, 31),
  };
}

export function getPriorYearPeriod(period: DatePeriod): DatePeriod {
  return {
    start: sameMonthDayInPriorYear(period.start),
    end: sameMonthDayInPriorYear(period.end),
  };
}

export function getDaysElapsed(period: DatePeriod, asOfDate: Date) {
  const asOf = normalizeLocalDate(asOfDate);
  if (asOf < normalizeLocalDate(period.start)) return 0;
  if (asOf > normalizeLocalDate(period.end)) {
    return daysBetween(period.start, period.end) + 1;
  }
  return daysBetween(period.start, asOf) + 1;
}

export function getDaysRemaining(period: DatePeriod, asOfDate: Date) {
  const asOf = normalizeLocalDate(asOfDate);
  if (asOf > normalizeLocalDate(period.end)) return 0;
  if (asOf < normalizeLocalDate(period.start)) {
    return daysBetween(period.start, period.end) + 1;
  }
  return daysBetween(asOf, period.end);
}

export function getDaysUntilNextPeriod(period: DatePeriod, asOfDate: Date) {
  const asOf = normalizeLocalDate(asOfDate);
  const nextPeriodStart = localNoon(
    period.end.getFullYear(),
    period.end.getMonth(),
    period.end.getDate() + 1,
  );
  return Math.max(daysBetween(asOf, nextPeriodStart), 0);
}

export function getNextPeriodStart(period: DatePeriod) {
  return localNoon(
    period.end.getFullYear(),
    period.end.getMonth(),
    period.end.getDate() + 1,
  );
}

export function getUpcomingSunday(asOfDate: Date) {
  const asOf = normalizeLocalDate(asOfDate);
  const daysUntilSunday = (7 - asOf.getDay()) % 7;
  return localNoon(
    asOf.getFullYear(),
    asOf.getMonth(),
    asOf.getDate() + daysUntilSunday,
  );
}

export function getPeriodLabel(
  reportingView: ReportingView,
  period: DatePeriod,
  asOfDate: Date,
) {
  const asOf = normalizeLocalDate(asOfDate);
  if (reportingView === 'PTD') return 'Selected Period / PTD';
  if (reportingView === 'YoY') {
    const priorYear = getPriorYearPeriod(period);
    return `${formatDisplayDate(period.start)} - ${formatDisplayDate(
      period.end,
    )} vs ${formatDisplayDate(priorYear.start)} - ${formatDisplayDate(
      priorYear.end,
    )}`;
  }
  if (reportingView === 'QTD') {
    return `Q${Math.floor(asOf.getMonth() / 3) + 1} ${asOf.getFullYear()}`;
  }
  if (reportingView === 'YTD') return `FY ${asOf.getFullYear()}`;
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
  }).format(asOf);
}

export function describePeriod(period: DatePeriod) {
  return `${formatDisplayDate(period.start)} - ${formatDisplayDate(period.end)}`;
}
