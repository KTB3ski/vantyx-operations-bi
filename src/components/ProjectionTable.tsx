import { useRef, type ChangeEvent } from 'react';
import type { VyntaxAnalystBriefing } from '../domain/analyst';
import { fromPercentInput, toPercentInput } from '../domain/formatters';
import type {
  AdjustmentType,
  ProjectionAdjustment,
} from '../domain/types';

interface ProjectionTableProps {
  adjustments: ProjectionAdjustment[];
  analystBriefing: VyntaxAnalystBriefing;
  hasPlanAssistAccess: boolean;
  isPlanAssistBusy: boolean;
  onAdd: () => void;
  onBuildActionPlan: () => void;
  onClearPlanAssistAccess: () => void;
  onDelete: (id: string) => void;
  onImportPlanAssistAccess: (fileText: string) => void;
  onUpdate: <K extends keyof ProjectionAdjustment>(
    id: string,
    field: K,
    value: ProjectionAdjustment[K],
  ) => void;
}

const adjustmentTypes: AdjustmentType[] = [
  'Expense cut / savings',
  'GOP improvement',
  'Revenue increase',
  'Other',
];

function parseMoney(value: string) {
  if (value.trim() === '') return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function ProjectionTable({
  adjustments,
  analystBriefing,
  hasPlanAssistAccess,
  isPlanAssistBusy,
  onAdd,
  onBuildActionPlan,
  onClearPlanAssistAccess,
  onDelete,
  onImportPlanAssistAccess,
  onUpdate,
}: ProjectionTableProps) {
  const accessFileInputRef = useRef<HTMLInputElement | null>(null);
  async function handleAccessFileChange(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.currentTarget.files?.[0];
    if (!file) return;
    const text = await file.text();
    onImportPlanAssistAccess(text);
    event.currentTarget.value = '';
  }

  return (
    <section className="projection-section no-print">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Recovery Planning</p>
          <h2>Action Plan</h2>
          <p className="action-plan-copy">
            Add, edit, or remove recovery actions. The impact fields drive the
            forecasted variance math.
          </p>
        </div>
        <div className="action-plan-buttons">
          <button
            type="button"
            className="secondary-button"
            disabled={isPlanAssistBusy}
            onClick={onBuildActionPlan}
          >
            {isPlanAssistBusy ? 'Building...' : 'Build Action Plan'}
          </button>
          <button type="button" className="primary-button" onClick={onAdd}>
            Add Action
          </button>
        </div>
      </div>

      <article className="action-plan-analyst-card">
        <div>
          <p className="eyebrow">Operating Read</p>
          <h3>{analystBriefing.primaryRecommendation}</h3>
          <p>{analystBriefing.summary}</p>
        </div>
        <div className="action-plan-confidence">
          <span>Confidence</span>
          <strong>{analystBriefing.confidence}</strong>
          <small>{analystBriefing.confidenceReason}</small>
        </div>
      </article>

      <details className="ai-settings-card">
        <summary>
          <span>Plan Assist Access</span>
          <small>{hasPlanAssistAccess ? 'Ready' : 'Local recommendations active'}</small>
        </summary>
        <div className="ai-settings-grid plan-assist-access-grid">
          <div className="plan-assist-access-copy">
            <strong>
              {hasPlanAssistAccess
                ? 'Plan Assist is ready on this computer.'
                : 'Local Vyntax recommendations are active.'}
            </strong>
            <span>
              Build Action Plan starts with Vyntax calculations every time. An
              access file can add enhanced wording through Plan Assist.
            </span>
          </div>
          <div className="ai-settings-actions">
            <button
              type="button"
              className="primary-button"
              onClick={() => accessFileInputRef.current?.click()}
            >
              Import Access File
            </button>
            {hasPlanAssistAccess ? (
              <button
                type="button"
                className="secondary-button"
                onClick={onClearPlanAssistAccess}
              >
                Clear Access
              </button>
            ) : null}
            <input
              ref={accessFileInputRef}
              type="file"
              accept=".json,application/json"
              className="visually-hidden"
              onChange={(event) => {
                void handleAccessFileChange(event);
              }}
            />
          </div>
        </div>
        <p>
          Enhanced planning sends the current action-plan facts to the configured
          Vyntax planning service. Access stays local to this computer and is not
          exported in CSV files or snapshot reports.
        </p>
      </details>

      <div className="table-wrap">
        <table className="editable-table">
          <thead>
            <tr>
              <th>Action</th>
              <th>Lever</th>
              <th>Month Amount $</th>
              <th>Quarter Amount $</th>
              <th>Year Amount $</th>
              <th>Flow-through %</th>
              <th>Optional Note</th>
              <th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {adjustments.length === 0 ? (
              <tr>
                <td className="empty-row" colSpan={8}>
                  No action plan built yet. Click Build Action Plan to create a
                  starting plan from the current numbers, or Add Action to enter
                  one manually.
                </td>
              </tr>
            ) : (
              adjustments.map((adjustment) => (
                <tr key={adjustment.id}>
                  <td>
                    <div className="action-plan-action-cell">
                      <input
                        type="text"
                        value={adjustment.description}
                        placeholder="Recovery action"
                        onChange={(event) =>
                          onUpdate(adjustment.id, 'description', event.target.value)
                        }
                      />
                      {adjustment.source === 'recommended' ? (
                        <span className="action-plan-source-note">
                          Recommended by Vyntax
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td>
                    <select
                      value={adjustment.type}
                      onChange={(event) =>
                        onUpdate(
                          adjustment.id,
                          'type',
                          event.target.value as AdjustmentType,
                        )
                      }
                    >
                      {adjustmentTypes.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input
                      type="number"
                      step="0.01"
                      value={adjustment.monthImpact}
                      onChange={(event) =>
                        onUpdate(
                          adjustment.id,
                          'monthImpact',
                          parseMoney(event.target.value),
                        )
                      }
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      step="0.01"
                      value={adjustment.quarterImpact}
                      onChange={(event) =>
                        onUpdate(
                          adjustment.id,
                          'quarterImpact',
                          parseMoney(event.target.value),
                        )
                      }
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      step="0.01"
                      value={adjustment.yearImpact}
                      onChange={(event) =>
                        onUpdate(
                          adjustment.id,
                          'yearImpact',
                          parseMoney(event.target.value),
                        )
                      }
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      step="0.01"
                      value={toPercentInput(adjustment.flowThroughPct)}
                      placeholder="Period default"
                      onChange={(event) =>
                        onUpdate(
                          adjustment.id,
                          'flowThroughPct',
                          fromPercentInput(event.target.value),
                        )
                      }
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      value={adjustment.notes}
                      placeholder="Optional note"
                      onChange={(event) =>
                        onUpdate(adjustment.id, 'notes', event.target.value)
                      }
                    />
                  </td>
                  <td>
                    <button
                      type="button"
                      className="icon-button"
                      aria-label={`Delete ${adjustment.description || 'action'}`}
                      onClick={() => onDelete(adjustment.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
