import {
  REPORTING_VIEW_HELP,
  REPORTING_VIEWS,
  getSelectedReportingDateContext,
  getReportingViewTitle,
} from '../domain/reporting';
import { formatDisplayDate } from '../domain/datePeriods';
import type { ReportingView, SnapshotDraft } from '../domain/types';

interface ReportingViewSelectorProps {
  draft: SnapshotDraft;
  onChange: <K extends keyof SnapshotDraft>(
    field: K,
    value: SnapshotDraft[K],
  ) => void;
}

export function ReportingViewSelector({
  draft,
  onChange,
}: ReportingViewSelectorProps) {
  const dateContext = getSelectedReportingDateContext(draft);

  return (
    <section className="reporting-view-panel reporting-view-panel--compact no-print">
      <div className="reporting-view-compact-head">
        <div>
          <p className="eyebrow">Reporting View</p>
          <h2>{getReportingViewTitle(draft.reportingView, draft.ptdPeriodName)}</h2>
          <p>{REPORTING_VIEW_HELP[draft.reportingView]}</p>
        </div>
        <label className="compact-view-select">
          <span>View</span>
          <select
            value={draft.reportingView}
            onChange={(event) =>
              onChange('reportingView', event.target.value as ReportingView)
            }
          >
            {REPORTING_VIEWS.map((view) => (
              <option key={view} value={view}>
                {view}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="reporting-view-strip" aria-label="Reporting view options">
        {REPORTING_VIEWS.map((view) => (
          <button
            type="button"
            className={draft.reportingView === view ? 'active-reporting-view' : ''}
            key={view}
            onClick={() => onChange('reportingView', view)}
          >
            <strong>{view}</strong>
          </button>
        ))}
      </div>

      {draft.reportingView === 'PTD' ? (
        <div className="ptd-field-grid ptd-field-grid--compact">
          <label>
            <span>Period Name</span>
            <input
              type="text"
              value={draft.ptdPeriodName}
              placeholder="Selected Period"
              onChange={(event) => onChange('ptdPeriodName', event.target.value)}
            />
          </label>
          <label>
            <span>Period Start Date</span>
            <input
              type="date"
              value={draft.periodStart}
              onChange={(event) => onChange('periodStart', event.target.value)}
            />
          </label>
          <label>
            <span>Period End Date</span>
            <input
              type="date"
              value={draft.periodEnd}
              onChange={(event) => onChange('periodEnd', event.target.value)}
            />
          </label>
          <div className="ptd-date-stat">
            <span>Days Elapsed</span>
            <strong>{dateContext.daysElapsed}</strong>
          </div>
          <div className="ptd-date-stat">
            <span>Days Remaining</span>
            <strong>{dateContext.daysRemaining}</strong>
          </div>
        </div>
      ) : (
        <div className="reporting-date-pills">
          <span>
            <small>Start</small>
            <strong>{formatDisplayDate(dateContext.period.start)}</strong>
          </span>
          <span>
            <small>End</small>
            <strong>{formatDisplayDate(dateContext.period.end)}</strong>
          </span>
          <span>
            <small>Elapsed</small>
            <strong>{dateContext.daysElapsed}</strong>
          </span>
          <span>
            <small>Remaining</small>
            <strong>{dateContext.daysRemaining}</strong>
          </span>
          <span>
            <small>Next</small>
            <strong>{formatDisplayDate(dateContext.nextPeriodBegins)}</strong>
          </span>
        </div>
      )}
    </section>
  );
}
