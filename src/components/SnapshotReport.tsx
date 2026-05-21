import {
  formatCurrency,
  formatPercent,
  formatSignedCurrency,
} from '../domain/formatters';
import { formatDisplayDate, parseLocalDate } from '../domain/datePeriods';
import {
  buildPeriodDateContexts,
  getReportingViewLabel,
  getSelectedReportingDateContext,
  hasYoyValues,
} from '../domain/reporting';
import {
  cleanActionPlanNote,
  formatActionPlanImpact,
} from '../domain/actionPlan';
import {
  getSnapshotReportPeriodLabel,
  getSnapshotReportPeriods,
  getSnapshotReportScopeLabel,
  getSnapshotReportTitle,
  SNAPSHOT_REPORT_SCOPES,
} from '../domain/snapshotReports';
import type {
  PeriodCalculation,
  PeriodKey,
  ProjectionCalculation,
  SnapshotDraft,
  SnapshotReportScope,
} from '../domain/types';

interface SnapshotReportProps {
  draft: SnapshotDraft;
  calculations: Record<PeriodKey, PeriodCalculation>;
  projections: Record<PeriodKey, ProjectionCalculation>;
  generatedAt: Date;
  reportScope: SnapshotReportScope;
  showScopeSelector?: boolean;
  summaryText: string;
  onReportScopeChange: (scope: SnapshotReportScope) => void;
}

function getActionText(
  calculation: PeriodCalculation,
  projection: ProjectionCalculation,
) {
  const remainingGap = Math.max(projection.projectedRemainingGap, 0);
  if (remainingGap <= 0) return 'Forecasted to meet or exceed target.';

  const revenueRecovery = calculation.revenueNeededAtFlowThrough;
  if (!revenueRecovery.achievable) {
    return `${formatCurrency(remainingGap)} GOP improvement still needed. ${revenueRecovery.message}`;
  }

  return `${formatCurrency(remainingGap)} GOP improvement still needed, or ${formatCurrency(
    revenueRecovery.amount,
  )} revenue lift at selected flow-through before action-plan impacts.`;
}

function formatPointChange(value: number) {
  return `${value >= 0 ? '+' : '-'}${Math.abs(value * 100).toFixed(2)} pts`;
}

function displayIsoDate(value: string) {
  return value ? formatDisplayDate(parseLocalDate(value)) : 'Not set';
}

export function SnapshotReport({
  draft,
  calculations,
  projections,
  generatedAt,
  reportScope,
  showScopeSelector = true,
  summaryText,
  onReportScopeChange,
}: SnapshotReportProps) {
  const reportPeriods = getSnapshotReportPeriods(reportScope, draft);
  const actionPlanNotes = draft.adjustments.filter(
    (adjustment) => adjustment.description || adjustment.notes,
  );
  const periodNotes = reportPeriods.filter(
    (period) => draft.periods[period].notes.trim() !== '',
  );
  const yoyPeriods = reportPeriods.filter((period) =>
    hasYoyValues(calculations[period]),
  );
  const dateContexts = buildPeriodDateContexts(draft);
  const selectedDateContext = getSelectedReportingDateContext(draft);
  const reportTitle = getSnapshotReportTitle(reportScope);
  const getReportDateContext = (period: PeriodKey) =>
    reportScope === 'weekly' && period === 'month' && draft.reportingView === 'PTD'
      ? selectedDateContext
      : dateContexts[period];
  const getReportPeriodLabel = (period: PeriodKey) =>
    getSnapshotReportPeriodLabel(reportScope, period, draft);

  return (
    <section className="report-area" aria-label={`${reportTitle} Report`}>
      {showScopeSelector ? (
        <div
          className="snapshot-scope-selector no-print"
          aria-label="Snapshot report scope"
        >
          <div>
            <p className="eyebrow">Snapshot Type</p>
            <h2>Report Preview</h2>
          </div>
          <div className="snapshot-scope-options">
            {SNAPSHOT_REPORT_SCOPES.map((scope) => (
              <button
                type="button"
                className={scope.key === reportScope ? 'active-scope' : undefined}
                key={scope.key}
                onClick={() => onReportScopeChange(scope.key)}
              >
                <span>{scope.label}</span>
                <small>{scope.helper}</small>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="report-page">
        <div className="report-header">
          <div className="report-title-block">
            <p className="eyebrow">Vyntax</p>
            <h2>{reportTitle}</h2>
            <p className="report-prepared-by">
              Prepared by {draft.preparedBy || 'Not set'}
            </p>
          </div>
          <div className="report-meta">
            <span>As Of Date: {displayIsoDate(draft.asOfDate)}</span>
            {reportScope === 'weekly' ? (
              <span>Week Ending: {displayIsoDate(draft.weekEnding)}</span>
            ) : null}
            <span>Snapshot Type: {getSnapshotReportScopeLabel(reportScope)}</span>
            <span>Property / Hotel: {draft.propertyLocation || 'Not set'}</span>
            <span>Operator: {draft.operatorName || 'Not set'}</span>
            <span>
              Reporting View:{' '}
              {getReportingViewLabel(draft.reportingView, draft.ptdPeriodName)}
            </span>
            <span>Data Mode: Manual inputs; live integrations off for pilot</span>
            <span>Generated Date: {generatedAt.toLocaleString()}</span>
          </div>
        </div>

        <table className="report-table">
          <thead>
            <tr>
              <th>Period</th>
              <th>Dates</th>
              <th>Days</th>
              <th>Revenue</th>
              <th>Expenses</th>
              <th>Actual GOP</th>
              <th>Actual GOP %</th>
              <th>Target GOP</th>
              <th>Variance to Target</th>
              <th>Forecasted Variance</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {reportPeriods.map((period) => {
              const calculation = calculations[period];
              const projection = projections[period];
              const context = getReportDateContext(period);

              return (
                <tr key={period}>
                  <td>{getReportPeriodLabel(period)}</td>
                  <td>{context.periodRangeLabel}</td>
                  <td>
                    {context.daysElapsed} elapsed / {context.daysRemaining}{' '}
                    remaining
                  </td>
                  <td>{formatCurrency(calculation.actualRevenue)}</td>
                  <td>{formatCurrency(calculation.effectiveExpenses)}</td>
                  <td>{formatCurrency(calculation.actualGop)}</td>
                  <td>{formatPercent(calculation.actualGopPct)}</td>
                  <td>{formatCurrency(calculation.targetGop)}</td>
                  <td>{formatSignedCurrency(-calculation.dollarGap)}</td>
                  <td>
                    {formatSignedCurrency(-projection.projectedRemainingGap)}
                  </td>
                  <td>{projection.projectedStatus}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="report-actions">
          {reportPeriods.map((period) => (
            <div key={period}>
              <h3>
                {getReportPeriodLabel(period)} Action Needed
              </h3>
              <p>{getActionText(calculations[period], projections[period])}</p>
            </div>
          ))}
        </div>

        {yoyPeriods.length > 0 ? (
          <div className="report-notes">
            <h3>Prior-Year Comparison</h3>
            <table className="report-table compact-report-table">
              <thead>
                <tr>
                  <th>Period</th>
                  <th>Revenue vs LY</th>
                  <th>GOP vs LY</th>
                  <th>GOP Margin vs LY</th>
                </tr>
              </thead>
              <tbody>
                {yoyPeriods.map((period) => {
                  const yoy = calculations[period].yoy;

                  return (
                    <tr key={period}>
                      <td>{getReportPeriodLabel(period)}</td>
                      <td>
                        {yoy.revenueYoyChange === null
                          ? 'Not available'
                          : `${formatSignedCurrency(yoy.revenueYoyChange)}${
                              yoy.revenueYoyChangePct === null
                                ? ''
                                : ` (${formatPercent(yoy.revenueYoyChangePct)})`
                            }`}
                      </td>
                      <td>
                        {yoy.gopYoyChange === null
                          ? 'Not available'
                          : `${formatSignedCurrency(yoy.gopYoyChange)}${
                              yoy.gopYoyChangePct === null
                                ? ''
                                : ` (${formatPercent(yoy.gopYoyChangePct)})`
                            }`}
                      </td>
                      <td>
                        {yoy.gopMarginYoyChange === null
                          ? 'Not available'
                          : formatPointChange(yoy.gopMarginYoyChange)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}

        {periodNotes.length > 0 ? (
          <div className="report-notes">
            <h3>Period Notes</h3>
            <ul>
              {periodNotes.map((period) => (
                <li key={period}>
                  <strong>{getReportPeriodLabel(period)}:</strong>{' '}
                  {draft.periods[period].notes}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="report-notes">
          <h3>Action Plan</h3>
          {actionPlanNotes.length === 0 ? (
            <p>No recovery actions entered.</p>
          ) : (
            <ul>
              {actionPlanNotes.map((adjustment) => (
                <li key={adjustment.id}>
                  <strong>{adjustment.description || adjustment.type}:</strong>{' '}
                  {cleanActionPlanNote(adjustment.notes) ||
                    'Review with the operating team.'}{' '}
                  <span className="report-action-impact">
                    {formatActionPlanImpact(adjustment)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <pre className="summary-copy-source" aria-hidden="true">
          {summaryText}
        </pre>
      </div>
    </section>
  );
}
