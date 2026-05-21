import {
  formatDisplayDate,
} from '../domain/datePeriods';
import {
  formatCurrency,
  formatPercent,
  formatSignedCurrency,
  toPercentInput,
  fromPercentInput,
} from '../domain/formatters';
import {
  calculateExpenseBreakdownTotal,
  EXPENSE_BREAKDOWN_FIELDS,
  type ExpenseBreakdownFieldKey,
} from '../domain/expenseBreakdown';
import type { PeriodDateContext } from '../domain/reporting';
import type {
  DisplaySettings,
  PeriodCalculation,
  PeriodInput,
  PeriodKey,
  ProjectionCalculation,
} from '../domain/types';

interface PeriodCardProps {
  label: string;
  periodKey: PeriodKey;
  input: PeriodInput;
  effectiveInput: PeriodInput;
  calculation: PeriodCalculation;
  projection: ProjectionCalculation;
  dateContext: PeriodDateContext;
  displaySettings: DisplaySettings;
  onChange: <K extends keyof PeriodInput>(
    period: PeriodKey,
    field: K,
    value: PeriodInput[K],
  ) => void;
}

const numberFields: Array<{
  key: keyof PeriodInput;
  label: string;
  step: string;
  kind: 'currency' | 'percent' | 'integer';
  helper?: string;
}> = [
  { key: 'revenue', label: 'Revenue', step: '0.01', kind: 'currency' },
  { key: 'expenses', label: 'Expenses', step: '0.01', kind: 'currency' },
  { key: 'manualGop', label: 'Manual GOP $', step: '0.01', kind: 'currency' },
  {
    key: 'targetGopPct',
    label: 'Target GOP %',
    step: '0.01',
    kind: 'percent',
  },
  {
    key: 'budgetedGopPct',
    label: 'Reference Target GOP %',
    step: '0.01',
    kind: 'percent',
  },
  {
    key: 'daysRemaining',
    label: 'Days Remaining',
    step: '1',
    kind: 'integer',
  },
  {
    key: 'flowThroughPct',
    label: 'Recovery Flow-Through %',
    step: '0.01',
    kind: 'percent',
    helper: 'Used for recovery estimate.',
  },
];

const accrualFields: Array<{
  key: keyof PeriodInput;
  label: string;
  helper: string;
}> = [
  {
    key: 'revenueAccruals',
    label: 'Revenue Accruals $',
    helper:
      'Revenue earned or expected but not fully reflected in the current report.',
  },
  {
    key: 'expenseAccruals',
    label: 'Expense Accruals $',
    helper:
      'Expenses expected or incurred but not fully reflected in the current report.',
  },
  {
    key: 'otherGopAdjustments',
    label: 'Other GOP Adjustments $',
    helper:
      'Manual GOP-level adjustments that do not fit cleanly into revenue or expense accruals.',
  },
];

function parseNumber(value: string) {
  if (value.trim() === '') return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseNullableNumber(value: string) {
  if (value.trim() === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function statusClass(status: string) {
  return status.toLowerCase().replace(/\s+/g, '-');
}

function varianceText(value: number, money: (amount: number) => string) {
  if (Math.abs(value) <= 1) return `On Target ${money(0)}`;
  return value > 0
    ? `Behind by ${money(value)}`
    : `Ahead by ${money(Math.abs(value))}`;
}

function valueClass(value: number) {
  if (value > 1) return 'negative-value';
  if (value < -1) return 'positive-value';
  return undefined;
}

function signedPointText(value: number, decimals: 1 | 2) {
  const formatted = Math.abs(value * 100).toFixed(decimals);
  return `${value >= 0 ? '+' : '-'}${formatted} pts`;
}

export function PeriodCard({
  label,
  periodKey,
  input,
  effectiveInput,
  calculation,
  projection,
  dateContext,
  displaySettings,
  onChange,
}: PeriodCardProps) {
  const money = (value: number) =>
    formatCurrency(value, displaySettings.currencyDisplay);
  const signedMoney = (value: number) =>
    formatSignedCurrency(value, displaySettings.currencyDisplay);
  const percent = (value: number) =>
    formatPercent(value, displaySettings.percentageDecimals);
  const reconciliation = calculation.reconciliation;
  const revenueRecovery = calculation.revenueNeededAtFlowThrough;
  const actualFlow = calculation.actualFlow;
  const yoy = calculation.yoy;
  const expenseBreakdownTotal = calculateExpenseBreakdownTotal(input);

  function handleExpenseBreakdownToggle(enabled: boolean) {
    onChange(periodKey, 'expenseBreakdownEnabled', enabled);
    if (enabled) onChange(periodKey, 'expenses', expenseBreakdownTotal);
  }

  function handleExpenseBreakdownChange(
    key: ExpenseBreakdownFieldKey,
    value: number,
  ) {
    const nextTotal = EXPENSE_BREAKDOWN_FIELDS.reduce(
      (total, field) => total + (field.key === key ? value : input[field.key] || 0),
      0,
    );

    onChange(periodKey, key, value);
    if (input.expenseBreakdownEnabled) {
      onChange(periodKey, 'expenses', nextTotal);
    }
  }

  return (
    <article className="period-card">
      <div className="period-card-header">
        <div>
          <h2>{label}</h2>
          <p className="period-date-range">{dateContext.periodRangeLabel}</p>
        </div>
        <span className={`status-badge ${statusClass(calculation.status)}`}>
          {calculation.status}
        </span>
      </div>

      <div className="period-inputs">
        <div className="manual-toggle-row">
          <label className="checkbox-field compact-checkbox">
            <input
              type="checkbox"
              checked={input.manualGopOverride}
              onChange={(event) =>
                onChange(periodKey, 'manualGopOverride', event.target.checked)
              }
            />
            <span>Manual GOP override</span>
          </label>
          <label className="checkbox-field compact-checkbox">
            <input
              type="checkbox"
              checked={input.targetGopDollarOverrideEnabled}
              onChange={(event) =>
                onChange(
                  periodKey,
                  'targetGopDollarOverrideEnabled',
                  event.target.checked,
                )
              }
            />
            <span>Target GOP $ override</span>
          </label>
        </div>
        {numberFields.map((field) => {
          const rawValue = input[field.key];
          const value =
            field.kind === 'percent'
              ? toPercentInput(rawValue as number | null)
              : field.key === 'daysRemaining'
                ? String(effectiveInput.daysRemaining)
                : field.key === 'expenses' && input.expenseBreakdownEnabled
                  ? String(expenseBreakdownTotal)
                : String(rawValue ?? 0);
          const isDisabled =
            (field.key === 'manualGop' && !input.manualGopOverride) ||
            (field.key === 'expenses' && input.expenseBreakdownEnabled);

          return (
            <label key={field.key}>
              <span>{field.label}</span>
              <input
                type="number"
                step={field.step}
                min={field.key === 'daysRemaining' ? '0' : undefined}
                disabled={isDisabled}
                value={value}
                onChange={(event) => {
                  if (field.kind === 'percent') {
                    const parsed = fromPercentInput(event.target.value);
                    const normalized =
                      field.key === 'budgetedGopPct' ? parsed : parsed ?? 0;
                    onChange(
                      periodKey,
                      field.key,
                      normalized as PeriodInput[typeof field.key],
                    );
                    return;
                  }

                  onChange(
                    periodKey,
                    field.key,
                    parseNumber(event.target.value) as PeriodInput[typeof field.key],
                  );
                  if (field.key === 'daysRemaining') {
                    onChange(periodKey, 'daysRemainingOverride', true);
                  }
                }}
              />
              {field.key === 'daysRemaining' ? (
                input.daysRemainingOverride ? (
                  <small className="field-help">Manual date override active.</small>
                ) : null
              ) : field.key === 'expenses' && input.expenseBreakdownEnabled ? (
                <small className="field-help">
                  Using the expense breakdown total.
                </small>
              ) : field.helper ? (
                <small className="field-help">{field.helper}</small>
              ) : null}
            </label>
          );
        })}
        {input.daysRemainingOverride ? (
          <button
            type="button"
            className="secondary-button use-real-dates-button"
            onClick={() => {
              onChange(periodKey, 'daysRemaining', dateContext.daysRemaining);
              onChange(periodKey, 'daysRemainingOverride', false);
            }}
          >
            Use Real Dates
          </button>
        ) : null}
        {input.targetGopDollarOverrideEnabled ? (
          <label className="target-override-field">
            <span>Target GOP $ Override</span>
            <input
              type="number"
              step="0.01"
              value={input.targetGopDollarOverride}
              onChange={(event) =>
                onChange(
                  periodKey,
                  'targetGopDollarOverride',
                  parseNumber(event.target.value),
                )
              }
            />
          </label>
        ) : null}
      </div>

      <dl className="period-date-metrics">
        <div>
          <dt>Days Elapsed</dt>
          <dd>{dateContext.daysElapsed}</dd>
        </div>
        <div>
          <dt>Next Period Begins</dt>
          <dd>{formatDisplayDate(dateContext.nextPeriodBegins)}</dd>
        </div>
      </dl>

      <details className="period-support-panel">
        <summary>
          <span>More inputs & checks</span>
          <small>
            Payroll/detail, accruals, actual flow, YoY, work comparison, and
            math
          </small>
        </summary>
        <div className="period-support-content">
      <details className="support-detail-panel">
        <summary>
          <span>Expense detail</span>
          <small>Payroll, taxes, benefits, departments</small>
        </summary>
        <section className="expense-breakdown-panel">
        <div className="section-heading compact">
          <div>
            <p className="eyebrow">Expense Detail</p>
            <h3>Operating Expense Breakdown</h3>
          </div>
          <strong>{money(expenseBreakdownTotal)}</strong>
        </div>
        <label className="checkbox-field">
          <input
            type="checkbox"
            checked={input.expenseBreakdownEnabled}
            onChange={(event) =>
              handleExpenseBreakdownToggle(event.target.checked)
            }
          />
          <span>Use this breakdown as the Expenses total</span>
        </label>
        <p className="expense-breakdown-helper">
          Helpful when the source report separates payroll, payroll taxes,
          benefits, departments, and operating costs. Leave it off if one
          expense total is all they have.
        </p>
        <div className="expense-breakdown-grid">
          {EXPENSE_BREAKDOWN_FIELDS.map((field) => (
            <label key={field.key}>
              <span>{field.label}</span>
              <input
                type="number"
                step="0.01"
                value={String(input[field.key] ?? 0)}
                onChange={(event) =>
                  handleExpenseBreakdownChange(
                    field.key,
                    parseNumber(event.target.value),
                  )
                }
              />
              <small className="field-help">{field.helper}</small>
            </label>
          ))}
        </div>
      </section>
      </details>

      <details className="support-detail-panel">
        <summary>
          <span>Accruals & math</span>
          <small>Adjusted view, targets, variance details</small>
        </summary>
        <div className="support-detail-content">
      <section className="accrual-panel">
        <div className="section-heading compact">
          <div>
            <p className="eyebrow">Accruals / Adjustments</p>
            <h3>Posted and Adjusted View</h3>
          </div>
        </div>
        <label className="checkbox-field">
          <input
            type="checkbox"
            checked={input.useAccrualAdjustedViewForVariance}
            onChange={(event) =>
              onChange(
                periodKey,
                'useAccrualAdjustedViewForVariance',
                event.target.checked,
              )
            }
          />
          <span>Use Accrual-Adjusted View for Variance</span>
        </label>
        <div className="accrual-input-grid">
          {accrualFields.map((field) => (
            <label key={field.key}>
              <span>{field.label}</span>
              <input
                type="number"
                step="0.01"
                value={String(input[field.key] ?? 0)}
                onChange={(event) =>
                  onChange(
                    periodKey,
                    field.key,
                    parseNumber(event.target.value) as PeriodInput[typeof field.key],
                  )
                }
              />
              <small className="field-help">{field.helper}</small>
            </label>
          ))}
          <label className="period-notes-field">
            <span>Accrual Notes</span>
            <input
              type="text"
              value={input.accrualNotes}
              placeholder="Optional accrual or timing note"
              onChange={(event) =>
                onChange(periodKey, 'accrualNotes', event.target.value)
              }
            />
          </label>
        </div>
      </section>

      <div className="view-comparison-grid">
        <article
          className={!input.useAccrualAdjustedViewForVariance ? 'active-view' : ''}
        >
          <span>Base / Posted View</span>
          <dl>
            <div>
              <dt>Revenue</dt>
              <dd>{money(calculation.baseRevenue)}</dd>
            </div>
            <div>
              <dt>GOP</dt>
              <dd>{money(calculation.baseGop)}</dd>
            </div>
            <div>
              <dt>GOP %</dt>
              <dd>{percent(calculation.baseGopPct)}</dd>
            </div>
          </dl>
        </article>
        <article
          className={input.useAccrualAdjustedViewForVariance ? 'active-view' : ''}
        >
          <span>Accrual-Adjusted View</span>
          <dl>
            <div>
              <dt>Adjusted Revenue</dt>
              <dd>{money(calculation.adjustedRevenue)}</dd>
            </div>
            <div>
              <dt>Adjusted GOP</dt>
              <dd>{money(calculation.adjustedGop)}</dd>
            </div>
            <div>
              <dt>Adjusted GOP %</dt>
              <dd>{percent(calculation.adjustedGopPct)}</dd>
            </div>
          </dl>
        </article>
      </div>

      <dl className="metric-list">
        <div>
          <dt>Variance View</dt>
          <dd>{calculation.varianceView}</dd>
        </div>
        <div>
          <dt>Expense Source</dt>
          <dd>{calculation.expenseSource}</dd>
        </div>
        <div>
          <dt>Expense Breakdown Total</dt>
          <dd>{money(calculation.expenseBreakdownTotal)}</dd>
        </div>
        <div>
          <dt>Actual GOP $</dt>
          <dd>{money(calculation.actualGop)}</dd>
        </div>
        <div>
          <dt>Actual GOP %</dt>
          <dd>{percent(calculation.actualGopPct)}</dd>
        </div>
        <div>
          <dt>Target GOP $</dt>
          <dd>{money(calculation.targetGop)}</dd>
        </div>
        <div>
          <dt>Reference Target GOP $</dt>
          <dd>
            {calculation.budgetedGop === null
              ? 'Reference not set'
              : money(calculation.budgetedGop)}
          </dd>
        </div>
        <div>
          <dt>Variance to Target %</dt>
          <dd>{percent(calculation.varianceToTargetPct)}</dd>
        </div>
        <div>
          <dt>Variance to Target</dt>
          <dd className={valueClass(calculation.dollarGap)}>
            {varianceText(calculation.dollarGap, money)}
          </dd>
        </div>
        <div>
          <dt>GOP Improvement Needed</dt>
          <dd>{money(calculation.gopImprovementNeeded)}</dd>
        </div>
        <div>
          <dt>Revenue Needed at Recovery Flow-Through</dt>
          <dd>
            {revenueRecovery.achievable
              ? money(revenueRecovery.amount)
              : revenueRecovery.message}
          </dd>
        </div>
        <div>
          <dt>Daily GOP Recovery Needed</dt>
          <dd>{money(calculation.dailyRecoveryNeeded)}</dd>
        </div>
      </dl>

      <details className="calculation-breakdown">
        <summary>Calculation Breakdown</summary>
        <div className="breakdown-grid">
          <div>
            <span>Base Revenue</span>
            <strong>{money(calculation.baseRevenue)}</strong>
          </div>
          <div>
            <span>Expenses</span>
            <strong>{money(calculation.effectiveExpenses)}</strong>
          </div>
          <div>
            <span>Expense Source</span>
            <strong>{calculation.expenseSource}</strong>
          </div>
          <div>
            <span>Actual GOP source</span>
            <strong>
              {input.manualGopOverride
                ? 'Manual GOP Override'
                : 'Revenue - Expenses'}
            </strong>
          </div>
          <div>
            <span>Base GOP $</span>
            <strong>{money(calculation.baseGop)}</strong>
          </div>
          <div>
            <span>Accrual-Adjusted Revenue</span>
            <strong>{money(calculation.adjustedRevenue)}</strong>
          </div>
          <div>
            <span>Accrual-Adjusted GOP $</span>
            <strong>{money(calculation.adjustedGop)}</strong>
          </div>
          <div>
            <span>Variance View</span>
            <strong>{calculation.varianceView}</strong>
          </div>
          <div>
            <span>Actual GOP %</span>
            <strong>{percent(calculation.actualGopPct)}</strong>
          </div>
          <div>
            <span>Target GOP %</span>
            <strong>{percent(calculation.targetGopPctUsed)}</strong>
          </div>
          <div>
            <span>Target GOP $</span>
            <strong>{money(calculation.targetGop)}</strong>
          </div>
          <div>
            <span>Reference Target GOP %</span>
            <strong>
              {input.budgetedGopPct === null
                ? 'Reference not set'
                : percent(input.budgetedGopPct)}
            </strong>
          </div>
          <div>
            <span>Reference Target GOP $</span>
            <strong>
              {calculation.budgetedGop === null
                ? 'Reference not set'
                : money(calculation.budgetedGop)}
            </strong>
          </div>
        </div>
        {input.targetGopDollarOverrideEnabled ? (
          <p className="formula-line target-override-note">
            Using Target GOP $ Override. Effective target GOP % ={' '}
            {money(calculation.targetGop)} / {money(calculation.actualRevenue)} ={' '}
            {percent(calculation.targetGopPctUsed)}
          </p>
        ) : (
          <p className="formula-line">
            Target GOP $ = {money(calculation.actualRevenue)} x{' '}
            {percent(input.targetGopPct)} = {money(calculation.targetGop)}
          </p>
        )}
        <p className="formula-line">
          Variance to Target = {money(calculation.targetGop)} -{' '}
          {money(calculation.actualGop)} ={' '}
          {varianceText(calculation.dollarGap, money)}
        </p>
        <p className="formula-line">
          Revenue Needed ={' '}
          {calculation.dollarGap <= 0
            ? 'No GOP recovery needed because the variance is not a gap.'
            : revenueRecovery.achievable
              ? `${money(calculation.dollarGap)} / (${percent(
                  input.flowThroughPct,
                )} - ${percent(calculation.targetGopPctUsed)}) = ${money(
                  revenueRecovery.amount,
                )}`
              : revenueRecovery.message}
        </p>
      </details>
        </div>
      </details>

      <details className="support-detail-panel">
        <summary>
          <span>Actual flow</span>
          <small>Plan vs actual conversion</small>
        </summary>
      <section className="actual-flow-panel">
        <div className="section-heading compact">
          <div>
            <p className="eyebrow">Actual Flow Analysis</p>
            <h3>Revenue Variance to GOP Variance</h3>
          </div>
        </div>
        <p className="flow-helper">
          Shows how revenue target variance converted into GOP variance and the flex / flow spread.
        </p>
        <div className="actual-flow-inputs">
          <label>
            <span>Revenue Plan / Target $</span>
            <input
              type="number"
              step="0.01"
              value={input.revenuePlan ?? ''}
              placeholder="Optional"
              onChange={(event) =>
                onChange(
                  periodKey,
                  'revenuePlan',
                  parseNullableNumber(event.target.value),
                )
              }
            />
          </label>
          <label>
            <span>GOP Plan / Target $</span>
            <input
              type="number"
              step="0.01"
              value={input.gopPlan ?? ''}
              placeholder="Uses Target GOP $ if blank"
              onChange={(event) =>
                onChange(
                  periodKey,
                  'gopPlan',
                  parseNullableNumber(event.target.value),
                )
              }
            />
          </label>
        </div>
        <p className="flow-basis">{actualFlow.basisLabel}</p>
        <dl>
          <div>
            <dt>Revenue Variance $</dt>
            <dd>
              {actualFlow.revenueVariance === null
                ? 'Not available'
                : signedMoney(actualFlow.revenueVariance)}
            </dd>
          </div>
          <div>
            <dt>GOP Variance $</dt>
            <dd>
              {actualFlow.gopVariance === null
                ? 'Not available'
                : signedMoney(actualFlow.gopVariance)}
            </dd>
          </div>
          <div>
            <dt>Actual Flow-Through %</dt>
            <dd>
              {actualFlow.actualFlowThroughPct === null
                ? 'Not available'
                : percent(actualFlow.actualFlowThroughPct)}
            </dd>
          </div>
          <div>
            <dt>Flex / Flow %</dt>
            <dd>
              {actualFlow.flexFlowPct === null
                ? 'Not available'
                : percent(actualFlow.flexFlowPct)}
            </dd>
          </div>
        </dl>
        {actualFlow.message ? (
          <p className="flow-message">{actualFlow.message}</p>
        ) : (
          <p className="flow-message">
            GOP Plan / Target basis: {actualFlow.gopPlanSource}.
          </p>
        )}
      </section>
      </details>

      <details className="support-detail-panel">
        <summary>
          <span>Prior year</span>
          <small>YoY comparison inputs</small>
        </summary>
      <section className="yoy-panel">
        <div className="section-heading compact">
          <div>
            <p className="eyebrow">Prior Year Comparison</p>
            <h3>YoY Performance</h3>
          </div>
        </div>
        <div className="yoy-input-grid">
          <label>
            <span>Prior Year Revenue $</span>
            <input
              type="number"
              step="0.01"
              value={input.priorYearRevenue ?? ''}
              placeholder="Optional"
              onChange={(event) =>
                onChange(
                  periodKey,
                  'priorYearRevenue',
                  parseNullableNumber(event.target.value),
                )
              }
            />
          </label>
          <label>
            <span>Prior Year Expenses $</span>
            <input
              type="number"
              step="0.01"
              value={input.priorYearExpenses ?? ''}
              placeholder="Optional"
              onChange={(event) =>
                onChange(
                  periodKey,
                  'priorYearExpenses',
                  parseNullableNumber(event.target.value),
                )
              }
            />
          </label>
          <label>
            <span>Prior Year GOP $</span>
            <input
              type="number"
              step="0.01"
              value={input.priorYearGop ?? ''}
              placeholder="Optional"
              onChange={(event) =>
                onChange(
                  periodKey,
                  'priorYearGop',
                  parseNullableNumber(event.target.value),
                )
              }
            />
          </label>
          <label>
            <span>Prior Year GOP %</span>
            <input
              type="number"
              step="0.01"
              value={toPercentInput(input.priorYearGopPct)}
              placeholder="Optional reference"
              onChange={(event) =>
                onChange(
                  periodKey,
                  'priorYearGopPct',
                  fromPercentInput(event.target.value),
                )
              }
            />
          </label>
        </div>

        {yoy.message ? (
          <p className="yoy-message">{yoy.message}</p>
        ) : (
          <>
            <dl>
              <div>
                <dt>Revenue vs LY</dt>
                <dd>
                  {yoy.revenueYoyChange === null
                    ? 'Not available'
                    : `${signedMoney(yoy.revenueYoyChange)}${
                        yoy.revenueYoyChangePct === null
                          ? ''
                          : ` (${percent(yoy.revenueYoyChangePct)})`
                      }`}
                </dd>
              </div>
              <div>
                <dt>GOP vs LY</dt>
                <dd>
                  {yoy.gopYoyChange === null
                    ? 'Not available'
                    : `${signedMoney(yoy.gopYoyChange)}${
                        yoy.gopYoyChangePct === null
                          ? ''
                          : ` (${percent(yoy.gopYoyChangePct)})`
                      }`}
                </dd>
              </div>
              <div>
                <dt>GOP Margin vs LY</dt>
                <dd>
                  {yoy.gopMarginYoyChange === null
                    ? 'Not available'
                    : signedPointText(
                        yoy.gopMarginYoyChange,
                        displaySettings.percentageDecimals,
                      )}
                </dd>
              </div>
            </dl>
            <p className="yoy-message">
              Prior Year GOP %:{' '}
              {yoy.priorYearGopPct === null
                ? 'Not available'
                : `${percent(yoy.priorYearGopPct)} (${yoy.priorYearGopPctSource})`}
            </p>
          </>
        )}
      </section>
      </details>

      <details className="support-detail-panel">
        <summary>
          <span>Work comparison</span>
          <small>Compare against the current workpaper</small>
        </summary>
      <section className="reconciliation-panel">
        <div className="section-heading compact">
          <div>
            <p className="eyebrow">Work Comparison</p>
            <h3>Reconciliation</h3>
          </div>
        </div>
        <div className="work-input-grid">
          <label>
            <span>Work Calculated Gap $</span>
            <input
              type="number"
              step="0.01"
              value={input.workCalculatedGap ?? ''}
              placeholder="Optional"
              onChange={(event) =>
                onChange(
                  periodKey,
                  'workCalculatedGap',
                  parseNullableNumber(event.target.value),
                )
              }
            />
          </label>
          <label>
            <span>Work Notes</span>
            <input
              type="text"
              value={input.workNotes}
              placeholder="Optional reconciliation note"
              onChange={(event) =>
                onChange(periodKey, 'workNotes', event.target.value)
              }
            />
          </label>
          <label>
            <span>Notes</span>
            <input
              type="text"
              value={input.notes}
              placeholder="Optional period note"
              onChange={(event) =>
                onChange(periodKey, 'notes', event.target.value)
              }
            />
          </label>
        </div>
        <dl>
          <div>
            <dt>Vyntax Variance to Target</dt>
            <dd>{varianceText(calculation.dollarGap, money)}</dd>
          </div>
          <div>
            <dt>Work Gap</dt>
            <dd>
              {input.workCalculatedGap === null
                ? 'Not entered'
                : money(input.workCalculatedGap)}
            </dd>
          </div>
          <div>
            <dt>Difference</dt>
            <dd>
              {reconciliation === null
                ? 'Not available'
                : signedMoney(reconciliation.difference)}
            </dd>
          </div>
        </dl>
        {reconciliation ? (
          <p
            className={
              reconciliation.withinTolerance
                ? 'reconciliation-match'
                : 'reconciliation-help'
            }
          >
            {reconciliation.withinTolerance
              ? 'Vyntax matches the work calculation within rounding tolerance.'
              : 'Difference may be caused by rounding, accruals, manual GOP override, target basis, timing, or source report adjustments.'}
          </p>
        ) : (
          <p className="reconciliation-help">
            Enter the work-calculated gap to compare Vyntax against the current
            month-end workpaper.
          </p>
        )}
        {input.workNotes ? <p className="work-note">{input.workNotes}</p> : null}
      </section>
      </details>

        </div>
      </details>

      <div className="projection-strip">
        <span>{projection.projectedStatus}</span>
        <strong className={valueClass(projection.projectedRemainingGap)}>
          {varianceText(projection.projectedRemainingGap, money)}
        </strong>
      </div>
    </article>
  );
}
