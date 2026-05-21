import {
  DatePeriod,
  describePeriod,
  formatDisplayDate,
  getDaysElapsed,
  getDaysRemaining,
  getDaysUntilNextPeriod,
  getMonthPeriod,
  getNextPeriodStart,
  getPriorYearPeriod,
  getQuarterPeriod,
  getYearPeriod,
  parseLocalDate,
  getPeriodLabel,
  formatIsoDate,
  getTodayIsoDate,
  getUpcomingSunday,
} from './datePeriods';
import {
  formatCurrency,
  formatPercent,
  formatSignedCurrency,
} from './formatters';
import type {
  PeriodCalculation,
  PeriodKey,
  ProjectionCalculation,
  ReportingView,
  SnapshotDraft,
} from './types';

export const REPORTING_VIEWS: ReportingView[] = [
  'PTD',
  'MTD',
  'QTD',
  'YTD',
  'YoY',
];

export const REPORTING_VIEW_HELP: Record<ReportingView, string> = {
  PTD: 'selected period to date',
  MTD: 'month to date',
  QTD: 'quarter to date',
  YTD: 'year to date',
  YoY: 'current period compared to same period last year',
};

export interface PeriodDateContext {
  period: DatePeriod;
  priorYearPeriod: DatePeriod;
  label: string;
  periodRangeLabel: string;
  priorYearRangeLabel: string;
  daysElapsed: number;
  daysRemaining: number;
  daysUntilNextPeriod: number;
  nextPeriodBegins: Date;
}

function getDefaultPtdPeriod(asOfDate: Date): DatePeriod {
  return getMonthPeriod(asOfDate);
}

export function getCurrentAsOfDate(draft: Pick<SnapshotDraft, 'asOfDate'>) {
  return draft.asOfDate ? parseLocalDate(draft.asOfDate) : parseLocalDate(getTodayIsoDate());
}

export function getDefaultWeekEnding(asOfDate: Date) {
  return formatIsoDate(getUpcomingSunday(asOfDate));
}

export function getPtdPeriod(draft: SnapshotDraft): DatePeriod {
  const asOfDate = getCurrentAsOfDate(draft);
  const fallback = getDefaultPtdPeriod(asOfDate);
  return {
    start: draft.periodStart ? parseLocalDate(draft.periodStart) : fallback.start,
    end: draft.periodEnd ? parseLocalDate(draft.periodEnd) : fallback.end,
  };
}

function buildDateContext(
  reportingView: ReportingView,
  period: DatePeriod,
  asOfDate: Date,
): PeriodDateContext {
  const priorYearPeriod = getPriorYearPeriod(period);
  return {
    period,
    priorYearPeriod,
    label: getPeriodLabel(reportingView, period, asOfDate),
    periodRangeLabel: describePeriod(period),
    priorYearRangeLabel: describePeriod(priorYearPeriod),
    daysElapsed: getDaysElapsed(period, asOfDate),
    daysRemaining: getDaysRemaining(period, asOfDate),
    daysUntilNextPeriod: getDaysUntilNextPeriod(period, asOfDate),
    nextPeriodBegins: getNextPeriodStart(period),
  };
}

export function buildPeriodDateContexts(draft: SnapshotDraft) {
  const asOfDate = getCurrentAsOfDate(draft);
  return {
    month: buildDateContext('MTD', getMonthPeriod(asOfDate), asOfDate),
    quarter: buildDateContext('QTD', getQuarterPeriod(asOfDate), asOfDate),
    year: buildDateContext('YTD', getYearPeriod(asOfDate), asOfDate),
  } satisfies Record<PeriodKey, PeriodDateContext>;
}

export function getSelectedReportingDateContext(draft: SnapshotDraft) {
  const asOfDate = getCurrentAsOfDate(draft);
  if (draft.reportingView === 'PTD') {
    return buildDateContext('PTD', getPtdPeriod(draft), asOfDate);
  }
  if (draft.reportingView === 'QTD') {
    return buildDateContext('QTD', getQuarterPeriod(asOfDate), asOfDate);
  }
  if (draft.reportingView === 'YTD') {
    return buildDateContext('YTD', getYearPeriod(asOfDate), asOfDate);
  }
  return buildDateContext(
    draft.reportingView,
    getMonthPeriod(asOfDate),
    asOfDate,
  );
}

export function getReportingPeriodKey(view: ReportingView): PeriodKey {
  if (view === 'QTD') return 'quarter';
  if (view === 'YTD') return 'year';
  return 'month';
}

export function getPeriodDisplayLabel(
  period: PeriodKey,
  reportingView: ReportingView,
) {
  if (period === 'month' && reportingView === 'PTD') {
    return 'Selected Period / PTD';
  }
  if (period === 'month') return 'Month / MTD';
  if (period === 'quarter') return 'Quarter / QTD';
  return 'Year / YTD';
}

export function getReportingViewTitle(
  view: ReportingView,
  ptdPeriodName?: string,
) {
  if (view === 'PTD') {
    return `${ptdPeriodName || 'Selected Period'} / PTD Profit Performance`;
  }
  if (view === 'YoY') return 'YoY Performance Comparison';
  return `${view} Profit Performance`;
}

export function getReportingViewLabel(
  view: ReportingView,
  ptdPeriodName?: string,
) {
  if (view === 'PTD') return ptdPeriodName || 'Selected Period / PTD';
  if (view === 'YoY') return 'Prior Year Comparison / YoY';
  return view;
}

export function buildViewPerformanceSentence(
  view: ReportingView,
  calculation: PeriodCalculation,
  projection: ProjectionCalculation,
) {
  if (view === 'YoY') {
    const yoy = calculation.yoy;
    if (yoy.gopYoyChange === null || yoy.gopMarginYoyChange === null) {
      return yoy.message || 'Enter prior-year values to calculate YoY.';
    }

    return `YoY GOP is ${yoy.gopYoyChange >= 0 ? 'up' : 'down'} ${formatCurrency(
      Math.abs(yoy.gopYoyChange),
    )}, while GOP margin changed by ${formatSignedCurrency(
      yoy.gopMarginYoyChange * 100,
    ).replace('$', '')} percentage points.`;
  }

  if (projection.projectedRemainingGap > 1) {
    return `${view} performance remains short by ${formatCurrency(
      projection.projectedRemainingGap,
    )} after action-plan impacts.`;
  }

  if (calculation.dollarGap > 1) {
    return `${view} performance is behind by ${formatCurrency(
      calculation.dollarGap,
    )}.`;
  }

  if (calculation.dollarGap < -1) {
    return `${view} performance is ahead by ${formatCurrency(
      Math.abs(calculation.dollarGap),
    )}.`;
  }

  return `${view} performance is on target.`;
}

export function hasYoyValues(calculation: PeriodCalculation) {
  return calculation.yoy.hasPriorYearValues;
}

export function buildYoySummaryLine(calculation: PeriodCalculation) {
  const yoy = calculation.yoy;
  if (!yoy.hasPriorYearValues) return 'Enter prior-year values to calculate YoY.';

  const revenue =
    yoy.revenueYoyChange === null
      ? 'Revenue vs LY: not available'
      : `Revenue vs LY: ${formatSignedCurrency(yoy.revenueYoyChange)}${
          yoy.revenueYoyChangePct === null
            ? ''
            : ` (${formatPercent(yoy.revenueYoyChangePct)})`
        }`;
  const gop =
    yoy.gopYoyChange === null
      ? 'GOP vs LY: not available'
      : `GOP vs LY: ${formatSignedCurrency(yoy.gopYoyChange)}${
          yoy.gopYoyChangePct === null
            ? ''
            : ` (${formatPercent(yoy.gopYoyChangePct)})`
        }`;
  const margin =
    yoy.gopMarginYoyChange === null
      ? 'GOP Margin vs LY: not available'
      : `GOP Margin vs LY: ${formatSignedCurrency(
          yoy.gopMarginYoyChange * 100,
        ).replace('$', '')} pts`;

  return `${revenue}; ${gop}; ${margin}`;
}

export function getReportPeriodDates(draft: SnapshotDraft) {
  return {
    periodStart: draft.periodStart || '',
    periodEnd: draft.periodEnd || draft.weekEnding || '',
    daysElapsed: draft.daysElapsed,
    daysRemaining: draft.reportingDaysRemaining,
  };
}
