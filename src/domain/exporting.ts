import {
  formatCurrency,
  formatPercent,
  formatSignedCurrency,
} from './formatters';
import {
  formatDisplayDate,
  formatIsoDate,
  parseLocalDate,
} from './datePeriods';
import {
  buildPeriodDateContexts,
  buildViewPerformanceSentence,
  buildYoySummaryLine,
  getPeriodDisplayLabel,
  getReportingPeriodKey,
  getReportingViewLabel,
  getSelectedReportingDateContext,
} from './reporting';
import {
  cleanActionPlanNote,
  formatActionPlanImpact,
} from './actionPlan';
import {
  getSnapshotReportPeriodLabel,
  getSnapshotReportPeriods,
  getSnapshotReportScopeLabel,
  getSnapshotReportTitle,
} from './snapshotReports';
import { EXPENSE_BREAKDOWN_FIELDS } from './expenseBreakdown';
import { OPERATING_AREA_DEFINITIONS } from './propertySetup';
import { isTauriRuntime } from './storage';
import type {
  PeriodCalculation,
  PeriodKey,
  ProjectionCalculation,
  SnapshotDraft,
  SnapshotReportScope,
} from './types';
import { PERIOD_KEYS } from './types';

function displayIsoDate(value: string) {
  return value ? formatDisplayDate(parseLocalDate(value)) : 'Not set';
}

export function csvCell(value: string | number | null | undefined) {
  const normalized = value === null || value === undefined ? '' : String(value);
  if (/[",\n]/.test(normalized)) {
    return `"${normalized.replace(/"/g, '""')}"`;
  }
  return normalized;
}

export function suggestedCsvFilename(weekEnding: string) {
  const datePart = weekEnding || new Date().toISOString().slice(0, 10);
  const safeDate = datePart.replace(/[^0-9A-Za-z_-]/g, '-');
  return `Vyntax_Snapshot_${safeDate}.csv`;
}

export function buildSnapshotCsv(
  draft: SnapshotDraft,
  calculations: Record<PeriodKey, PeriodCalculation>,
  projections: Record<PeriodKey, ProjectionCalculation>,
) {
  const dateContexts = buildPeriodDateContexts(draft);
  const selectedDateContext = getSelectedReportingDateContext(draft);
  const rows: Array<Array<string | number | null | undefined>> = [
    ['Vyntax Weekly Financial Snapshot'],
    ['as_of_date', draft.asOfDate],
    ['week_ending', draft.weekEnding],
    ['Week Ending', draft.weekEnding],
    ['Prepared By', draft.preparedBy],
    ['Property / Hotel Name', draft.propertyLocation],
    ['Operator / Management Group', draft.operatorName],
    ['Rooms', draft.rooms],
    ['Reporting Month', draft.reportingMonth],
    ['Reporting View', draft.reportingView],
    ['Reporting View Label', getReportingViewLabel(draft.reportingView, draft.ptdPeriodName)],
    ['Period Start', draft.periodStart],
    ['Period End', draft.periodEnd],
    ['Days Elapsed', draft.daysElapsed],
    ['Days Remaining', draft.reportingDaysRemaining],
    ['Header Target GOP %', draft.propertyTargetGopPct],
    [
      'Enabled Operating Areas',
      OPERATING_AREA_DEFINITIONS.filter((area) =>
        draft.propertySetup.enabledOperatingAreaIds.includes(area.id),
      )
        .map((area) => area.label)
        .join('; '),
    ],
    ['Data Mode', 'Manual inputs; live integrations off for pilot'],
    ['Demo Mode', draft.demoMode ? 'Yes' : 'No'],
    ['Exported At', new Date().toISOString()],
    [],
    [
      'Period',
      'as_of_date',
      'week_ending',
      'reporting_view',
      'period_start',
      'period_end',
      'days_elapsed',
      'days_remaining',
      'days_until_next_period',
      'prior_year_period_start',
      'prior_year_period_end',
      'Revenue',
      'Expenses',
      'Expense Source',
      'Expense Breakdown Enabled',
      ...EXPENSE_BREAKDOWN_FIELDS.map((field) => `${field.label} $`),
      'Expense Breakdown Total',
      'Effective Expenses',
      'Manual GOP Override',
      'Manual GOP $',
      'Revenue Accruals $',
      'Expense Accruals $',
      'Other GOP Adjustments $',
      'Accrual Notes',
      'Use Accrual-Adjusted View for Variance',
      'Target GOP $ Override Enabled',
      'Target GOP $ Override',
      'Period Notes',
      'Work Calculated Gap $',
      'Work Notes',
      'Base / Posted Revenue',
      'Base / Posted GOP $',
      'Base / Posted GOP %',
      'Accrual-Adjusted Revenue',
      'Accrual-Adjusted GOP $',
      'Accrual-Adjusted GOP %',
      'Variance View',
      'Actual GOP $',
      'Actual GOP %',
      'Target GOP %',
      'Effective Target GOP %',
      'Target GOP $',
      'Reference Target GOP $',
      'Variance to Target %',
      'Variance to Target $',
      'GOP Improvement Needed',
      'Recovery Flow-Through %',
      'Revenue Needed at Recovery Flow-Through',
      'Daily GOP Recovery Needed',
      'Revenue Plan / Target $',
      'GOP Plan / Target $',
      'Actual Flow Basis',
      'Revenue Variance $',
      'GOP Variance $',
      'Actual Flow-Through %',
      'Flex / Flow %',
      'Actual Flow Message',
      'prior_year_revenue',
      'prior_year_expenses',
      'prior_year_gop',
      'prior_year_gop_percent',
      'revenue_yoy_change',
      'revenue_yoy_change_percent',
      'gop_yoy_change',
      'gop_yoy_change_percent',
      'gop_margin_yoy_change',
      'Base Status',
      'Forecasted Revenue',
      'Forecasted GOP',
      'Forecasted Target GOP $',
      'Forecasted Remaining Gap',
      'Forecasted Status',
    ],
  ];

  PERIOD_KEYS.forEach((period) => {
    const input = draft.periods[period];
    const calculation = calculations[period];
    const projection = projections[period];
    const dateContext =
      period === 'month' && draft.reportingView === 'PTD'
        ? selectedDateContext
        : dateContexts[period];
    rows.push([
      getPeriodDisplayLabel(period, draft.reportingView),
      draft.asOfDate,
      draft.weekEnding,
      draft.reportingView,
      formatIsoDate(dateContext.period.start),
      formatIsoDate(dateContext.period.end),
      dateContext.daysElapsed,
      dateContext.daysRemaining,
      dateContext.daysUntilNextPeriod,
      formatIsoDate(dateContext.priorYearPeriod.start),
      formatIsoDate(dateContext.priorYearPeriod.end),
      input.revenue,
      input.expenses,
      calculation.expenseSource,
      input.expenseBreakdownEnabled ? 'Yes' : 'No',
      ...EXPENSE_BREAKDOWN_FIELDS.map((field) => input[field.key]),
      calculation.expenseBreakdownTotal,
      calculation.effectiveExpenses,
      input.manualGopOverride ? 'Yes' : 'No',
      input.manualGop,
      input.revenueAccruals,
      input.expenseAccruals,
      input.otherGopAdjustments,
      input.accrualNotes,
      input.useAccrualAdjustedViewForVariance ? 'Yes' : 'No',
      input.targetGopDollarOverrideEnabled ? 'Yes' : 'No',
      input.targetGopDollarOverride,
      input.notes,
      input.workCalculatedGap,
      input.workNotes,
      calculation.baseRevenue,
      calculation.baseGop,
      calculation.baseGopPct,
      calculation.adjustedRevenue,
      calculation.adjustedGop,
      calculation.adjustedGopPct,
      calculation.varianceView,
      calculation.actualGop,
      calculation.actualGopPct,
      input.targetGopPct,
      calculation.targetGopPctUsed,
      calculation.targetGop,
      calculation.budgetedGop,
      calculation.varianceToTargetPct,
      calculation.dollarGap,
      calculation.gopImprovementNeeded,
      input.flowThroughPct,
      calculation.revenueNeededAtFlowThrough.achievable
        ? calculation.revenueNeededAtFlowThrough.amount
        : calculation.revenueNeededAtFlowThrough.message,
      calculation.dailyRecoveryNeeded,
      input.revenuePlan,
      input.gopPlan,
      calculation.actualFlow.basisLabel,
      calculation.actualFlow.revenueVariance,
      calculation.actualFlow.gopVariance,
      calculation.actualFlow.actualFlowThroughPct,
      calculation.actualFlow.flexFlowPct,
      calculation.actualFlow.message,
      input.priorYearRevenue,
      input.priorYearExpenses,
      input.priorYearGop,
      calculation.yoy.priorYearGopPct,
      calculation.yoy.revenueYoyChange,
      calculation.yoy.revenueYoyChangePct,
      calculation.yoy.gopYoyChange,
      calculation.yoy.gopYoyChangePct,
      calculation.yoy.gopMarginYoyChange,
      calculation.status,
      projection.projectedRevenue,
      projection.projectedGop,
      projection.projectedTargetGop,
      projection.projectedRemainingGap,
      projection.projectedStatus,
    ]);
  });

  rows.push(
    [],
    [
      'Action Plan Rows',
      'Lever',
      'Month Amount $',
      'Quarter Amount $',
      'Year Amount $',
      'Flow-through %',
      'Optional Note',
      'Source',
    ],
  );

  draft.adjustments.forEach((adjustment) => {
    rows.push([
      adjustment.description,
      adjustment.type,
      adjustment.monthImpact,
      adjustment.quarterImpact,
      adjustment.yearImpact,
      adjustment.flowThroughPct,
      adjustment.notes,
      adjustment.source || 'manual',
    ]);
  });

  return rows.map((row) => row.map(csvCell).join(',')).join('\n');
}

function browserDownloadCsv(csv: string, filename: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export async function exportSnapshotCsv(
  draft: SnapshotDraft,
  calculations: Record<PeriodKey, PeriodCalculation>,
  projections: Record<PeriodKey, ProjectionCalculation>,
) {
  const csv = buildSnapshotCsv(draft, calculations, projections);
  const filename = suggestedCsvFilename(draft.weekEnding);

  if (isTauriRuntime()) {
    const [{ save }, { writeTextFile }] = await Promise.all([
      import('@tauri-apps/plugin-dialog'),
      import('@tauri-apps/plugin-fs'),
    ]);
    const path = await save({
      title: 'Export Vyntax Snapshot CSV',
      defaultPath: filename,
      filters: [{ name: 'CSV', extensions: ['csv'] }],
    });

    if (!path) return { exported: false, cancelled: true, path: null };
    await writeTextFile(path, csv);
    return { exported: true, cancelled: false, path };
  }

  browserDownloadCsv(csv, filename);
  return { exported: true, cancelled: false, path: filename };
}

export function buildWeeklySummaryText(
  draft: SnapshotDraft,
  calculations: Record<PeriodKey, PeriodCalculation>,
  projections: Record<PeriodKey, ProjectionCalculation>,
  reportScope: SnapshotReportScope = 'weekly',
) {
  const reportingPeriodKey = getReportingPeriodKey(draft.reportingView);
  const reportingCalculation = calculations[reportingPeriodKey];
  const reportingProjection = projections[reportingPeriodKey];
  const dateContexts = buildPeriodDateContexts(draft);
  const selectedDateContext = getSelectedReportingDateContext(draft);
  const reportPeriods = getSnapshotReportPeriods(reportScope, draft);
  const getReportDateContext = (period: PeriodKey) =>
    reportScope === 'weekly' && period === 'month' && draft.reportingView === 'PTD'
      ? selectedDateContext
      : dateContexts[period];
  const lines = [
    `Vyntax ${getSnapshotReportTitle(reportScope)}`,
    `As Of: ${displayIsoDate(draft.asOfDate)}`,
    ...(reportScope === 'weekly'
      ? [`Week Ending: ${displayIsoDate(draft.weekEnding)}`]
      : []),
    `Prepared By: ${draft.preparedBy || 'Not set'}`,
    `Property / Hotel Name: ${draft.propertyLocation || 'Not set'}`,
    `Operator / Management Group: ${draft.operatorName || 'Not set'}`,
    `Operating Areas: ${OPERATING_AREA_DEFINITIONS.filter((area) =>
      draft.propertySetup.enabledOperatingAreaIds.includes(area.id),
    )
      .map((area) => area.label)
      .join('; ')}`,
    `Snapshot Type: ${getSnapshotReportScopeLabel(reportScope)}`,
    `Reporting View: ${getReportingViewLabel(
      draft.reportingView,
      draft.ptdPeriodName,
    )}`,
    `Current Performance: ${buildViewPerformanceSentence(
      draft.reportingView,
      reportingCalculation,
      reportingProjection,
    )}`,
    `Data Mode: Manual inputs; live integrations off for pilot`,
    `Demo Mode: ${draft.demoMode ? 'Yes' : 'No'}`,
    '',
  ];

  reportPeriods.forEach((period) => {
    const input = draft.periods[period];
    const calculation = calculations[period];
    const projection = projections[period];
    const dateContext = getReportDateContext(period);
    const periodLabel = getSnapshotReportPeriodLabel(reportScope, period, draft);
    lines.push(
      `${periodLabel}: ${calculation.status}`,
      `Period: ${dateContext.periodRangeLabel}`,
      `Days Elapsed: ${dateContext.daysElapsed}`,
      `Days Remaining: ${dateContext.daysRemaining}`,
      `Next Period Begins: ${formatDisplayDate(dateContext.nextPeriodBegins)}`,
      `Revenue: ${formatCurrency(input.revenue)}`,
      `Expenses: ${formatCurrency(
        calculation.effectiveExpenses,
      )} (${calculation.expenseSource})`,
      `Actual GOP: ${formatCurrency(calculation.actualGop)} (${formatPercent(
        calculation.actualGopPct,
      )})`,
      `Variance View: ${calculation.varianceView}`,
      `Accrual-Adjusted View: ${
        input.useAccrualAdjustedViewForVariance ? 'Active' : 'Off'
      }`,
      `Base / Posted GOP: ${formatCurrency(
        calculation.baseGop,
      )} (${formatPercent(calculation.baseGopPct)})`,
      `Accrual-Adjusted GOP: ${formatCurrency(
        calculation.adjustedGop,
      )} (${formatPercent(calculation.adjustedGopPct)})`,
      `Target GOP: ${formatCurrency(calculation.targetGop)}`,
      `Variance to Target: ${formatSignedCurrency(-calculation.dollarGap)}`,
      calculation.actualFlow.message
        ? `Actual Flow Analysis: ${calculation.actualFlow.message}`
        : `Actual Flow-Through: ${formatPercent(
            calculation.actualFlow.actualFlowThroughPct ?? 0,
          )}; Flex / Flow: ${formatPercent(
            calculation.actualFlow.flexFlowPct ?? 0,
          )} (${calculation.actualFlow.basisLabel})`,
      calculation.yoy.hasPriorYearValues
        ? `Prior Year Comparison: ${buildYoySummaryLine(calculation)}`
        : '',
      calculation.reconciliation
        ? `Work Gap: ${formatCurrency(
            calculation.reconciliation.workGap,
          )}; Difference: ${formatSignedCurrency(
            calculation.reconciliation.difference,
          )}`
        : '',
      `Forecasted Variance: ${formatSignedCurrency(
        -projection.projectedRemainingGap,
      )} (${projection.projectedStatus})`,
      input.notes ? `Notes: ${input.notes}` : '',
      '',
    );
  });

  const actionPlanRows = draft.adjustments.filter(
    (adjustment) =>
      adjustment.description ||
      adjustment.notes ||
      adjustment.monthImpact ||
      adjustment.quarterImpact ||
      adjustment.yearImpact,
  );

  if (actionPlanRows.length > 0) {
    lines.push('Action Plan:');
    actionPlanRows.forEach((adjustment) => {
      lines.push(
        `- ${adjustment.description || adjustment.type}: ${
          cleanActionPlanNote(adjustment.notes) || 'Review with the operating team.'
        } ${formatActionPlanImpact(adjustment)}`,
      );
    });
  }

  return lines.join('\n').trim();
}

export async function copyWeeklySummary(
  draft: SnapshotDraft,
  calculations: Record<PeriodKey, PeriodCalculation>,
  projections: Record<PeriodKey, ProjectionCalculation>,
  reportScope: SnapshotReportScope = 'weekly',
) {
  const text = buildWeeklySummaryText(
    draft,
    calculations,
    projections,
    reportScope,
  );

  if (isTauriRuntime()) {
    const { writeText } = await import('@tauri-apps/plugin-clipboard-manager');
    await writeText(text);
    return text;
  }

  await navigator.clipboard.writeText(text);
  return text;
}
