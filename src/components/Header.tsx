import type { SnapshotDraft } from '../domain/types';
import { fromPercentInput, toPercentInput } from '../domain/formatters';

interface HeaderProps {
  draft: SnapshotDraft;
  isDemoMode: boolean;
  onChange: <K extends keyof SnapshotDraft>(
    field: K,
    value: SnapshotDraft[K],
  ) => void;
}

export function Header({ draft, isDemoMode, onChange }: HeaderProps) {
  return (
    <header className="app-header no-print">
      <div className="brand-block">
        <div className="logo-mark logo-mark--image" aria-hidden="true">
          <img src="/vyntax-mark.png" alt="" />
        </div>
        <div>
          <div className="brand-title-row">
            <h1>Vyntax</h1>
            {isDemoMode ? <span className="brand-state">Demo data active</span> : null}
          </div>
        </div>
      </div>

      <div className="header-fields" aria-label="Snapshot header fields">
        <label>
          <span>As Of Date</span>
          <input
            type="date"
            value={draft.asOfDate}
            onChange={(event) => onChange('asOfDate', event.target.value)}
          />
        </label>
        <label>
          <span>Week Ending</span>
          <input
            type="date"
            value={draft.weekEnding}
            onChange={(event) => onChange('weekEnding', event.target.value)}
          />
        </label>
        <label>
          <span>Prepared By</span>
          <input
            type="text"
            value={draft.preparedBy}
            placeholder="Name"
            onChange={(event) => onChange('preparedBy', event.target.value)}
          />
        </label>
        <label>
          <span>Property / Hotel Name</span>
          <input
            type="text"
            value={draft.propertyLocation}
            placeholder="Demo Property"
            onChange={(event) =>
              onChange('propertyLocation', event.target.value)
            }
          />
        </label>
        <label>
          <span>Operator / Management Group</span>
          <input
            type="text"
            value={draft.operatorName}
            placeholder="Demo Operator"
            onChange={(event) => onChange('operatorName', event.target.value)}
          />
        </label>
        <label>
          <span>Rooms</span>
          <input
            type="number"
            min="0"
            step="1"
            value={draft.rooms}
            onChange={(event) =>
              onChange('rooms', Number(event.target.value) || 0)
            }
          />
        </label>
        <label>
          <span>Reporting Month</span>
          <input
            type="text"
            value={draft.reportingMonth}
            placeholder="Optional reporting label"
            onChange={(event) => onChange('reportingMonth', event.target.value)}
          />
        </label>
        <label>
          <span>Target GOP %</span>
          <input
            type="number"
            step="0.01"
            value={toPercentInput(draft.propertyTargetGopPct)}
            onChange={(event) =>
              onChange(
                'propertyTargetGopPct',
                fromPercentInput(event.target.value) ?? 0,
              )
            }
          />
        </label>
      </div>
    </header>
  );
}
