import { useMemo, useState, type ReactNode } from 'react';
import {
  calculateWarehouseShift,
  warehouseDemoShift,
  type WarehouseShiftCalculation,
  type WarehouseShiftInput,
  type WarehouseRouteInput,
  type WarehouseZoneInput,
} from '../domain/warehouse';

interface WarehouseShiftPlannerProps {
  shift: WarehouseShiftInput;
  onChange: (shift: WarehouseShiftInput) => void;
  onChangeIndustry: () => void;
}

type WarehouseWorkflowStepKey =
  | 'plan'
  | 'progress'
  | 'results'
  | 'recovery'
  | 'snapshot';

const MAX_WAREHOUSE_ROUTES = 100;
const ROUTE_STATUS_OPTIONS: WarehouseRouteInput['status'][] = [
  'Planned',
  'Loaded',
  'Late',
  'Cut',
];

const WAREHOUSE_WORKFLOW_STEPS: Array<{
  key: WarehouseWorkflowStepKey;
  label: string;
  helper: string;
  enabled: boolean;
}> = [
  {
    key: 'plan',
    label: 'Build Plan',
    helper: 'Volume, labor, and zones',
    enabled: true,
  },
  {
    key: 'progress',
    label: 'Live Shift',
    helper: 'Inputs + forecast',
    enabled: true,
  },
  {
    key: 'results',
    label: 'Shift Review',
    helper: 'Actual vs plan',
    enabled: true,
  },
  {
    key: 'recovery',
    label: 'Action Plan',
    helper: 'Next shift moves',
    enabled: true,
  },
  {
    key: 'snapshot',
    label: 'Send Snapshot',
    helper: 'Final recap',
    enabled: true,
  },
];

function toNumber(value: string) {
  if (value.trim() === '') return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatWhole(value: number | null) {
  if (value === null || !Number.isFinite(value)) return 'Not available';
  return Math.round(value).toLocaleString();
}

function formatDecimal(value: number, fractionDigits = 1) {
  return value.toLocaleString(undefined, {
    maximumFractionDigits: fractionDigits,
    minimumFractionDigits: fractionDigits,
  });
}

function formatHours(value: number | null) {
  if (value === null || !Number.isFinite(value)) return 'Not available';
  return `${formatDecimal(value, 1)} hrs`;
}

function formatSignedHours(value: number | null) {
  if (value === null || !Number.isFinite(value)) return 'Not available';
  if (Math.abs(value) < 0.05) return 'On plan';
  return `${value > 0 ? '+' : ''}${formatDecimal(value, 1)} hrs`;
}

function formatRate(value: number | null) {
  return formatWhole(value);
}

function formatPercent(value: number | null) {
  if (value === null || !Number.isFinite(value)) return 'Not available';
  return `${value.toLocaleString(undefined, {
    maximumFractionDigits: 1,
    minimumFractionDigits: 1,
  })}%`;
}

function formatSignedMinutes(value: number | null) {
  if (value === null) return 'Not available';
  const rounded = Math.round(value);
  if (rounded === 0) return 'On target';
  return rounded > 0 ? `${rounded} min late` : `${Math.abs(rounded)} min early`;
}

function formatSignedWhole(value: number) {
  const rounded = Math.round(value);
  if (rounded === 0) return 'On plan';
  return `${rounded > 0 ? '+' : ''}${rounded.toLocaleString()}`;
}

function safePercent(numerator: number, denominator: number) {
  if (denominator <= 0) return null;
  return (numerator / denominator) * 100;
}

function createWarehouseRoute(sequenceNumber?: number): WarehouseRouteInput {
  return {
    id: `route-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    routeName:
      sequenceNumber === undefined
        ? ''
        : `Route ${String(sequenceNumber).padStart(3, '0')}`,
    plannedLoadTime: '',
    actualLoadTime: '',
    plannedCases: 0,
    status: 'Planned',
    note: '',
  };
}

function clockMinutes(value: string) {
  if (!/^\d{1,2}:\d{2}$/.test(value.trim())) return null;
  const [hours, minutes] = value.split(':').map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  return hours * 60 + minutes;
}

function routeMinutesFromShiftStart(shiftStartTime: string, value: string) {
  const start = clockMinutes(shiftStartTime);
  const current = clockMinutes(value);
  if (start === null || current === null) return null;
  const diff = current - start;
  return diff >= 0 ? diff : diff + 24 * 60;
}

function isRouteLateForDisplay(route: WarehouseRouteInput, shiftStartTime: string) {
  if (route.status === 'Late') return true;
  if (route.status !== 'Loaded') return false;
  const plannedMinutes = routeMinutesFromShiftStart(
    shiftStartTime,
    route.plannedLoadTime,
  );
  const actualMinutes = routeMinutesFromShiftStart(shiftStartTime, route.actualLoadTime);
  if (plannedMinutes === null || actualMinutes === null) return false;
  return actualMinutes > plannedMinutes;
}

function statusClassName(status: string) {
  return status.toLowerCase().replace(/\s+/g, '-');
}

function metricToneFromStatus(status: WarehouseShiftCalculation['status']) {
  if (status === 'Ahead' || status === 'Complete') return 'good';
  if (status === 'On Pace') return 'neutral';
  return 'watch';
}

function findFocusZone(calculation: WarehouseShiftCalculation) {
  const activeZones = calculation.zones.filter((zone) => zone.status !== 'Complete');
  if (activeZones.length === 0) return null;

  return [...activeZones].sort((a, b) => {
    const statusRank = (status: string) => {
      if (status === 'Behind') return 0;
      if (status === 'At Risk') return 1;
      if (status === 'On Pace') return 2;
      if (status === 'Ahead') return 3;
      return 4;
    };
    const rankDiff = statusRank(a.status) - statusRank(b.status);
    if (rankDiff !== 0) return rankDiff;
    return a.casePaceVariance - b.casePaceVariance;
  })[0];
}

function buildFocusNote(
  calculation: WarehouseShiftCalculation,
  focusZone: WarehouseShiftCalculation['zones'][number] | null,
) {
  if (calculation.status === 'Complete') {
    return 'Use the completed readout to set the next pre-shift conversation.';
  }

  if (!focusZone) {
    return 'No single area owned the miss. Keep the next plan balanced and use the first checkpoint to confirm the trend.';
  }

  if (focusZone.status === 'Ahead') {
    return `${focusZone.name} created the best cushion. Use that setup as the model before moving support away next shift.`;
  }

  const neededPace =
    focusZone.requiredCasesPerHour === null
      ? 'unknown'
      : `${formatRate(focusZone.requiredCasesPerHour)} CPH`;
  return `${focusZone.name} should be the first next-shift checkpoint. The last read needed ${neededPace} with ${formatWhole(
    focusZone.casesRemaining,
  )} cases still open.`;
}

interface WarehouseRecoveryAction {
  id: string;
  title: string;
  owner: string;
  timing: string;
  reason: string;
  move: string;
  watchMetric: string;
  expectedImpact: string;
  tone: 'good' | 'watch' | 'neutral';
}

function formatTruckIssueSummary(lateRoutes: number, cutRoutes: number) {
  const parts: string[] = [];
  if (lateRoutes > 0) {
    parts.push(`${lateRoutes} late truck${lateRoutes === 1 ? '' : 's'}`);
  }
  if (cutRoutes > 0) {
    parts.push(`${cutRoutes} cut truck${cutRoutes === 1 ? '' : 's'}`);
  }
  return parts.join(' and ');
}

function buildWarehouseRecoveryActions(
  calculation: WarehouseShiftCalculation,
): WarehouseRecoveryAction[] {
  const focusZone = findFocusZone(calculation);
  const actions: WarehouseRecoveryAction[] = [];
  const finishVariance = calculation.projectedFinishVarianceMinutes ?? 0;
  const isLate = finishVariance > 15;

  if (calculation.status === 'Complete') {
    return [
      {
        id: 'complete-recap',
        title: 'Carry the clean finish into the next plan',
        owner: 'Shift lead',
        timing: 'Next pre-shift',
        reason: 'The planned case volume is complete.',
        move: 'Open the next shift by confirming what stayed on plan: case pace, forklift drops, labor hours, and area notes.',
        watchMetric: `Forecasted finish: ${calculation.projectedFinishTime}`,
        expectedImpact: 'Helps the team repeat the parts of the shift that protected the finish window.',
        tone: 'good',
      },
    ];
  }

  if (
    calculation.additionalSelectorsNeeded !== null &&
    calculation.additionalSelectorsNeeded > 0
  ) {
    const zoneName = focusZone ? focusZone.name : 'the highest-risk area';
    actions.push({
      id: 'rebalance-selectors',
      title: `Pre-plan ${calculation.additionalSelectorsNeeded} flex selector${
        calculation.additionalSelectorsNeeded === 1 ? '' : 's'
      } for ${zoneName}`,
      owner: 'Operations manager / shift lead',
      timing: 'Before next shift',
      reason: `The last finish read would have needed about ${calculation.additionalSelectorsNeeded} more selector${
        calculation.additionalSelectorsNeeded === 1 ? '' : 's'
      } to pull the night back toward plan. Finish read: ${formatSignedMinutes(
        calculation.projectedFinishVarianceMinutes,
      )}.`,
      move: 'Preassign flex coverage before start, with a checkpoint for whether the support can be released after the first read.',
      watchMetric: `${formatRate(calculation.targetCasesPerHourUsed)} target CPH for the next plan`,
      expectedImpact: `Gives ${zoneName} support before the miss has time to repeat.`,
      tone: 'watch',
    });
  }

  if (focusZone && focusZone.status !== 'Ahead' && focusZone.status !== 'Complete') {
    actions.push({
      id: 'clear-focus-zone',
      title: `Open ${focusZone.name} with a constraint check`,
      owner: `${focusZone.name} area lead`,
      timing: 'Pre-shift and first hour',
      reason: `${focusZone.name} carried ${formatWhole(
        focusZone.casesRemaining,
      )} cases open in the last read and paced ${formatSignedWhole(
        focusZone.casePaceVariance,
      )} against time plan.`,
      move: 'Before start, check replenishment plan, aisle congestion, equipment availability, and selector assignment.',
      watchMetric: `${formatRate(focusZone.targetCasesPerHourUsed)} next-shift target CPH in ${focusZone.name}`,
      expectedImpact: 'Targets the area most likely to repeat the finish miss.',
      tone: 'watch',
    });
  }

  if (
    calculation.forkliftDropsRemaining > 0 &&
    (calculation.forkliftDropPaceVariance < 0 ||
      (calculation.requiredForkliftDropsPerHour !== null &&
        calculation.requiredForkliftDropsPerHour >
          calculation.targetForkliftDropsPerHourUsed))
  ) {
    actions.push({
      id: 'forklift-cadence',
      title: 'Build the forklift-drop priority list before start',
      owner: 'Forklift / replenishment lead',
      timing: 'Before doors open',
      reason: `${formatWhole(
        calculation.forkliftDropsRemaining,
      )} forklift drops remained in the last read, and drop pace was behind plan.`,
      move: 'Stage the first wave of drops around the highest-risk zones, then return to normal replenishment sequence.',
      watchMetric: `${formatRate(calculation.targetForkliftDropsPerHourUsed)} planned drops/hour`,
      expectedImpact: 'Reduces the chance that selectors wait on product movement again.',
      tone: 'watch',
    });
  }

  if (calculation.lateRoutes > 0 || calculation.cutRoutes > 0) {
    const truckIssueSummary = formatTruckIssueSummary(
      calculation.lateRoutes,
      calculation.cutRoutes,
    );
    actions.push({
      id: 'route-sheet-review',
      title: 'Review late and cut trucks before the next plan',
      owner: 'Transportation / warehouse lead',
      timing: 'Pre-shift meeting',
      reason: `${truckIssueSummary} ${
        calculation.lateRoutes + calculation.cutRoutes === 1 ? 'is' : 'are'
      } on the route sheet from the last shift.`,
      move: 'Separate selection misses from route-sheet changes so managers know whether the problem was warehouse pace, late loading, route cuts, or upstream schedule movement.',
      watchMetric: `Route sheet: ${calculation.routeSheetStatus}`,
      expectedImpact:
        'Keeps the next-shift plan from treating route timing problems as selector pace problems.',
      tone: 'watch',
    });
  }

  if (isLate) {
    actions.push({
      id: 'pace-huddle',
      title: 'Schedule first-hour and midpoint pace checks',
      owner: 'Operations manager',
      timing: 'Next shift',
      reason: `The finish read was ${calculation.projectedFinishTime}, ${formatSignedMinutes(
        calculation.projectedFinishVarianceMinutes,
      )}.`,
      move: 'Review CPH, focus-zone CPH, active selectors, forklift drops, and delay minutes at the same checkpoint every time.',
      watchMetric: `Last read CPH: ${formatRate(calculation.teamCasesPerHour)}`,
      expectedImpact: 'Catches the same miss earlier on the next night.',
      tone: 'watch',
    });
  }

  if (actions.length === 0) {
    actions.push({
      id: 'hold-plan',
      title: 'Repeat the plan with guardrails',
      owner: 'Shift lead',
      timing: 'Next shift',
      reason: 'The shift finished or forecasted close to plan from the latest read.',
      move: 'Keep the labor plan intact, protect the opening case pace, and avoid pulling support away from active volume too early.',
      watchMetric: `Finish read: ${calculation.projectedFinishTime}`,
      expectedImpact: 'Preserves the finish window without creating avoidable disruption.',
      tone: 'good',
    });
  }

  return actions;
}

function FieldLabel({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="warehouse-field">
      <span>{label}</span>
      {children}
    </label>
  );
}

function ProgressMetric({
  label,
  value,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  tone?: 'neutral' | 'good' | 'watch';
}) {
  return (
    <article className={`warehouse-progress-metric warehouse-progress-metric--${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function LaborMoveCheckSection({
  eyebrow = 'Labor Move Check',
  title,
  helper,
  checks,
}: {
  eyebrow?: string;
  title: string;
  helper: string;
  checks: WarehouseShiftCalculation['laborMoveChecks'];
}) {
  return (
    <section className="warehouse-labor-move-section">
      <div className="section-heading-row">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h2>{title}</h2>
          <p>{helper}</p>
        </div>
      </div>
      <div className="warehouse-labor-move-grid">
        {checks.map((check) => (
          <article
            className={`warehouse-labor-move-card warehouse-labor-move-card--${check.tone}`}
            key={check.id}
          >
            <div className="warehouse-labor-move-head">
              <div>
                <span>{check.title}</span>
                <strong>{check.decision}</strong>
              </div>
              <em>{check.area}</em>
            </div>
            <dl>
              <div>
                <dt>Why</dt>
                <dd>{check.reason}</dd>
              </div>
              <div>
                <dt>Manager Move</dt>
                <dd>{check.move}</dd>
              </div>
              <div>
                <dt>Watch</dt>
                <dd>{check.watchMetric}</dd>
              </div>
            </dl>
          </article>
        ))}
      </div>
    </section>
  );
}

interface RouteSheetSectionProps {
  title: string;
  helper: string;
  shift: WarehouseShiftInput;
  calculation: WarehouseShiftCalculation;
  updateShift: <K extends keyof WarehouseShiftInput>(
    field: K,
    value: WarehouseShiftInput[K],
  ) => void;
  updateRoute: <K extends keyof WarehouseRouteInput>(
    id: string,
    field: K,
    value: WarehouseRouteInput[K],
  ) => void;
  onAddRoute: (count?: number) => void;
  onDeleteRoute: (id: string) => void;
}

function RouteSheetSection({
  title,
  helper,
  shift,
  calculation,
  updateShift,
  updateRoute,
  onAddRoute,
  onDeleteRoute,
}: RouteSheetSectionProps) {
  const [routeFilter, setRouteFilter] = useState<'All' | WarehouseRouteInput['status']>(
    'All',
  );
  const [routeSearch, setRouteSearch] = useState('');
  const [quickAddCount, setQuickAddCount] = useState(10);
  const routeCapacity = Math.max(MAX_WAREHOUSE_ROUTES - shift.routes.length, 0);
  const visibleRoutes = useMemo(() => {
    const query = routeSearch.trim().toLowerCase();
    return shift.routes.filter((route) => {
      const routeIsLate = isRouteLateForDisplay(route, shift.shiftStartTime);
      const matchesStatus =
        routeFilter === 'All' ||
        (routeFilter === 'Late' ? routeIsLate : route.status === routeFilter);
      const matchesSearch =
        query.length === 0 ||
        route.routeName.toLowerCase().includes(query) ||
        route.note.toLowerCase().includes(query);
      return matchesStatus && matchesSearch;
    });
  }, [routeFilter, routeSearch, shift.routes, shift.shiftStartTime]);
  const visibleCases = visibleRoutes.reduce(
    (total, route) => total + route.plannedCases,
    0,
  );
  const quickAddLimit = Math.min(quickAddCount, routeCapacity);

  return (
    <section className="warehouse-route-section">
      <div className="section-heading-row">
        <div>
          <p className="eyebrow">Routes / Trucks</p>
          <h2>{title}</h2>
          <p>{helper}</p>
        </div>
        <div className="warehouse-section-actions">
          <label className="warehouse-field warehouse-route-sheet-status">
            <span>Sheet Status</span>
            <select
              value={shift.routeSheetStatus}
              onChange={(event) =>
                updateShift(
                  'routeSheetStatus',
                  event.target.value as WarehouseShiftInput['routeSheetStatus'],
                )
              }
            >
              <option value="Pending">Pending</option>
              <option value="Preliminary">Preliminary</option>
              <option value="Final">Final</option>
            </select>
          </label>
          <label className="warehouse-field warehouse-route-quick-add">
            <span>Quick Add</span>
            <select
              value={quickAddCount}
              onChange={(event) => setQuickAddCount(toNumber(event.target.value))}
            >
              <option value={1}>1 route</option>
              <option value={5}>5 routes</option>
              <option value={10}>10 routes</option>
              <option value={25}>25 routes</option>
            </select>
          </label>
          <button
            type="button"
            className="secondary-button"
            disabled={routeCapacity <= 0}
            onClick={() => onAddRoute(quickAddCount)}
          >
            {routeCapacity <= 0
              ? 'Route Limit Reached'
              : `Add ${quickAddLimit} Route${quickAddLimit === 1 ? '' : 's'}`}
          </button>
        </div>
      </div>

      <div className="warehouse-route-command-row">
        <div className="warehouse-route-summary" aria-label="Route sheet summary">
          <button
            type="button"
            className={routeFilter === 'All' ? 'is-active' : ''}
            onClick={() => setRouteFilter('All')}
          >
            <span>{calculation.routeSheetStatus}</span>
            <strong>{formatWhole(calculation.totalRoutes)} trucks</strong>
          </button>
          {ROUTE_STATUS_OPTIONS.map((status) => {
            const count =
              status === 'Planned'
                ? calculation.plannedRoutes
                : status === 'Loaded'
                  ? calculation.loadedRoutes
                  : status === 'Late'
                    ? calculation.lateRoutes
                    : calculation.cutRoutes;
            return (
              <button
                type="button"
                className={routeFilter === status ? 'is-active' : ''}
                key={status}
                onClick={() => setRouteFilter(status)}
              >
                <span>{status}</span>
                <strong>{formatWhole(count)}</strong>
              </button>
            );
          })}
        </div>
        <label className="warehouse-field warehouse-route-search">
          <span>Find Route</span>
          <input
            type="search"
            placeholder="Search route or note"
            value={routeSearch}
            onChange={(event) => setRouteSearch(event.target.value)}
          />
        </label>
      </div>

      <div className="warehouse-route-table-meta">
        <span>
          Showing {formatWhole(visibleRoutes.length)} of{' '}
          {formatWhole(shift.routes.length)} routes
        </span>
        <span>{formatWhole(visibleCases)} visible cases</span>
        <span>{formatWhole(routeCapacity)} route slots open</span>
      </div>

      {shift.routes.length === 0 ? (
        <p className="warehouse-route-empty">
          Route sheet can stay pending. Add quick route slots now, then fill in
          route names, load times, cases, and status when the final truck sheet
          lands.
        </p>
      ) : visibleRoutes.length === 0 ? (
        <p className="warehouse-route-empty">
          No routes match the current search or filter.
        </p>
      ) : (
        <div className="warehouse-route-table-wrap">
          <table className="warehouse-route-table">
            <thead>
              <tr>
                <th>Route / Truck</th>
                <th>Status</th>
                <th>Planned Load</th>
                <th>Actual Load</th>
                <th>Cases</th>
                <th>Note</th>
                <th aria-label="Route actions"></th>
              </tr>
            </thead>
            <tbody>
              {visibleRoutes.map((route) => {
                const routeStatusClass = isRouteLateForDisplay(
                  route,
                  shift.shiftStartTime,
                )
                  ? 'late'
                  : statusClassName(route.status);
                return (
                  <tr
                    className={`warehouse-route-row--${routeStatusClass}`}
                    key={route.id}
                  >
                  <td data-label="Route / Truck">
                    <input
                      type="text"
                      aria-label="Route or truck name"
                      value={route.routeName}
                      onChange={(event) =>
                        updateRoute(route.id, 'routeName', event.target.value)
                      }
                    />
                  </td>
                  <td data-label="Status">
                    <select
                      aria-label={`${route.routeName || 'Route'} status`}
                      value={route.status}
                      onChange={(event) =>
                        updateRoute(
                          route.id,
                          'status',
                          event.target.value as WarehouseRouteInput['status'],
                        )
                      }
                    >
                      <option value="Planned">Planned</option>
                      <option value="Loaded">Loaded</option>
                      <option value="Late">Late</option>
                      <option value="Cut">Cut</option>
                    </select>
                  </td>
                  <td data-label="Planned Load">
                    <input
                      type="time"
                      aria-label={`${route.routeName || 'Route'} planned load time`}
                      value={route.plannedLoadTime}
                      onChange={(event) =>
                        updateRoute(route.id, 'plannedLoadTime', event.target.value)
                      }
                    />
                  </td>
                  <td data-label="Actual Load">
                    <input
                      type="time"
                      aria-label={`${route.routeName || 'Route'} actual load time`}
                      value={route.actualLoadTime}
                      onChange={(event) =>
                        updateRoute(route.id, 'actualLoadTime', event.target.value)
                      }
                    />
                  </td>
                  <td data-label="Cases">
                    <input
                      type="number"
                      min="0"
                      aria-label={`${route.routeName || 'Route'} cases`}
                      value={route.plannedCases}
                      onChange={(event) =>
                        updateRoute(route.id, 'plannedCases', toNumber(event.target.value))
                      }
                    />
                  </td>
                  <td data-label="Note">
                    <input
                      type="text"
                      aria-label={`${route.routeName || 'Route'} note`}
                      value={route.note}
                      onChange={(event) =>
                        updateRoute(route.id, 'note', event.target.value)
                      }
                    />
                  </td>
                  <td className="warehouse-route-action-cell">
                    <button
                      type="button"
                      className="secondary-button warehouse-route-delete"
                      onClick={() => onDeleteRoute(route.id)}
                    >
                      Remove
                    </button>
                  </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export function WarehouseShiftPlanner({
  shift,
  onChange,
  onChangeIndustry,
}: WarehouseShiftPlannerProps) {
  const [activeStep, setActiveStep] = useState<WarehouseWorkflowStepKey>('plan');
  const calculation = useMemo(() => calculateWarehouseShift(shift), [shift]);
  const zonePlanTotals = useMemo(
    () =>
      shift.zones.reduce(
        (totals, zone) => ({
          cases: totals.cases + zone.plannedCases,
          forkliftDrops: totals.forkliftDrops + zone.plannedForkliftDrops,
          selectors: totals.selectors + zone.scheduledSelectors,
        }),
        { cases: 0, forkliftDrops: 0, selectors: 0 },
      ),
    [shift.zones],
  );
  const planCasesPerSelector =
    shift.scheduledSelectors > 0 ? shift.plannedCases / shift.scheduledSelectors : 0;
  const isProgressStep = activeStep === 'progress';
  const isResultsStep = activeStep === 'results';
  const isRecoveryStep = activeStep === 'recovery';
  const isSnapshotStep = activeStep === 'snapshot';

  function updateShift<K extends keyof WarehouseShiftInput>(
    field: K,
    value: WarehouseShiftInput[K],
  ) {
    onChange({
      ...shift,
      [field]: value,
    });
  }

  function updateZone<K extends keyof WarehouseZoneInput>(
    id: string,
    field: K,
    value: WarehouseZoneInput[K],
  ) {
    onChange({
      ...shift,
      zones: shift.zones.map((zone) =>
        zone.id === id
          ? {
              ...zone,
              [field]: value,
            }
          : zone,
      ),
    });
  }

  function updateRoute<K extends keyof WarehouseRouteInput>(
    id: string,
    field: K,
    value: WarehouseRouteInput[K],
  ) {
    onChange({
      ...shift,
      routes: shift.routes.map((route) =>
        route.id === id
          ? {
              ...route,
              [field]: value,
            }
          : route,
      ),
    });
  }

  function addRoute(count = 1) {
    const routeCount = Math.min(
      Math.max(Math.floor(count), 1),
      MAX_WAREHOUSE_ROUTES - shift.routes.length,
    );
    if (routeCount <= 0) return;

    onChange({
      ...shift,
      routes: [
        ...shift.routes,
        ...Array.from({ length: routeCount }, (_, index) =>
          createWarehouseRoute(shift.routes.length + index + 1),
        ),
      ],
    });
  }

  function deleteRoute(id: string) {
    onChange({
      ...shift,
      routes: shift.routes.filter((route) => route.id !== id),
    });
  }

  function applyZoneTotals() {
    onChange({
      ...shift,
      plannedCases: zonePlanTotals.cases,
      plannedForkliftDrops: zonePlanTotals.forkliftDrops,
      scheduledSelectors: zonePlanTotals.selectors,
    });
  }

  const heroEyebrow = isSnapshotStep
    ? 'Shift Snapshot'
    : isRecoveryStep
    ? 'Action Plan'
    : isResultsStep
    ? 'Shift Review'
    : isProgressStep
      ? 'Live Shift'
      : 'Shift Planner';
  const heroTitle = isSnapshotStep
    ? 'Package the night into a clean recap.'
    : isRecoveryStep
    ? 'Set the next shift focus.'
    : isResultsStep
    ? 'Compare the finished read against the plan.'
    : isProgressStep
      ? 'Refresh the night while selection is running.'
      : 'Build the plan before the night starts.';
  const heroCopy = isSnapshotStep
    ? 'Send the plan, finish read, labor-hours check, indirect time, late/cut trucks, lag areas, wins, and next-shift action plan in one concise summary.'
    : isRecoveryStep
    ? 'Use the plan-vs-finish review to decide what managers should staff, unblock, and watch first before the next shift starts.'
    : isResultsStep
    ? 'Use this after the shift, or at the final check, to see where the night lagged, where it held, and what changed from plan.'
    : isProgressStep
      ? 'This is the page the team refreshes during the shift: update selected cases, forklift drops, staffing, and delays while the forecast updates live.'
      : 'Set the case volume, forklift-drop plan, staffing, finish target, and zone plan. The next warehouse screens compare actual progress against this baseline.';

  return (
    <main className="warehouse-workspace" aria-labelledby="warehouse-planner-heading">
      <header className="warehouse-shell-header">
        <div className="warehouse-brand-row">
          <div className="logo-mark logo-mark--image" aria-hidden="true">
            <img src="/vyntax-mark.png" alt="" />
          </div>
          <div>
            <p className="eyebrow">Vyntax Systems</p>
            <h1 id="warehouse-planner-heading">Warehouse</h1>
          </div>
        </div>
        <button type="button" className="secondary-button" onClick={onChangeIndustry}>
          Change Industry
        </button>
      </header>

      <nav className="warehouse-workflow-strip" aria-label="Warehouse workflow">
        {WAREHOUSE_WORKFLOW_STEPS.map((step, index) => (
          <button
            type="button"
            className={`warehouse-workflow-step${
              activeStep === step.key ? ' warehouse-workflow-step--active' : ''
            }`}
            key={step.key}
            disabled={!step.enabled}
            onClick={() => setActiveStep(step.key)}
          >
            <span>{index + 1}</span>
            <strong>{step.label}</strong>
            <small>{step.helper}</small>
          </button>
        ))}
      </nav>

      <section className="warehouse-planner-hero">
        <div>
          <p className="eyebrow">{heroEyebrow}</p>
          <h2>{heroTitle}</h2>
          <p>{heroCopy}</p>
        </div>
        <div className="warehouse-hero-actions">
          <button
            type="button"
            className="secondary-button secondary-button--dark"
            onClick={() => onChange(warehouseDemoShift)}
          >
            Load Demo Plan
          </button>
          <div className="warehouse-source-pill">Blue Yonder source ready later</div>
        </div>
      </section>

      <section className="warehouse-plan-summary" aria-label="Shift plan summary">
        <article>
          <span>Planned Cases</span>
          <strong>{formatWhole(shift.plannedCases)}</strong>
        </article>
        <article>
          <span>Forklift Drops</span>
          <strong>{formatWhole(shift.plannedForkliftDrops)}</strong>
        </article>
        <article>
          <span>Scheduled Selectors</span>
          <strong>{formatWhole(shift.scheduledSelectors)}</strong>
        </article>
        <article>
          <span>Target Finish</span>
          <strong>{shift.targetFinishTime || 'Not set'}</strong>
        </article>
        <article>
          <span>Planned Hours</span>
          <strong>{formatDecimal(calculation.plannedShiftHours)}</strong>
        </article>
      </section>

      {isSnapshotStep ? (
        <WarehouseSnapshotStep
          calculation={calculation}
          onBackToActionPlan={() => setActiveStep('recovery')}
        />
      ) : isRecoveryStep ? (
        <WarehouseRecoveryStep
          calculation={calculation}
          onBackToResults={() => setActiveStep('results')}
          onContinue={() => setActiveStep('snapshot')}
        />
      ) : isResultsStep ? (
        <WarehouseResultsStep
          calculation={calculation}
          onBackToProgress={() => setActiveStep('progress')}
          onContinue={() => setActiveStep('recovery')}
        />
      ) : isProgressStep ? (
        <WarehouseProgressStep
          calculation={calculation}
          shift={shift}
          updateShift={updateShift}
          updateZone={updateZone}
          updateRoute={updateRoute}
          onAddRoute={addRoute}
          onDeleteRoute={deleteRoute}
          onBackToPlan={() => setActiveStep('plan')}
          onContinue={() => setActiveStep('results')}
        />
      ) : (
        <WarehousePlanStep
          calculation={calculation}
          planCasesPerSelector={planCasesPerSelector}
          shift={shift}
          updateShift={updateShift}
          updateZone={updateZone}
          updateRoute={updateRoute}
          onAddRoute={addRoute}
          onDeleteRoute={deleteRoute}
          zonePlanTotals={zonePlanTotals}
          onApplyZoneTotals={applyZoneTotals}
          onContinue={() => setActiveStep('progress')}
        />
      )}
    </main>
  );
}

interface WarehousePlanStepProps {
  calculation: WarehouseShiftCalculation;
  planCasesPerSelector: number;
  shift: WarehouseShiftInput;
  updateShift: <K extends keyof WarehouseShiftInput>(
    field: K,
    value: WarehouseShiftInput[K],
  ) => void;
  updateZone: <K extends keyof WarehouseZoneInput>(
    id: string,
    field: K,
    value: WarehouseZoneInput[K],
  ) => void;
  updateRoute: <K extends keyof WarehouseRouteInput>(
    id: string,
    field: K,
    value: WarehouseRouteInput[K],
  ) => void;
  onAddRoute: (count?: number) => void;
  onDeleteRoute: (id: string) => void;
  zonePlanTotals: {
    cases: number;
    forkliftDrops: number;
    selectors: number;
  };
  onApplyZoneTotals: () => void;
  onContinue: () => void;
}

function WarehousePlanStep({
  calculation,
  planCasesPerSelector,
  shift,
  updateShift,
  updateZone,
  updateRoute,
  zonePlanTotals,
  onAddRoute,
  onApplyZoneTotals,
  onDeleteRoute,
  onContinue,
}: WarehousePlanStepProps) {
  return (
    <>
      <section className="warehouse-planner-grid">
        <article className="warehouse-plan-card warehouse-plan-card--primary">
          <div className="section-heading-row">
            <div>
              <p className="eyebrow">Plan Setup</p>
              <h2>Shift Basics</h2>
            </div>
          </div>
          <div className="warehouse-plan-fields">
            <FieldLabel label="Warehouse">
              <input
                type="text"
                value={shift.warehouseName}
                onChange={(event) => updateShift('warehouseName', event.target.value)}
              />
            </FieldLabel>
            <FieldLabel label="Shift">
              <input
                type="text"
                value={shift.shiftName}
                onChange={(event) => updateShift('shiftName', event.target.value)}
              />
            </FieldLabel>
            <FieldLabel label="Shift Date">
              <input
                type="date"
                value={shift.shiftDate}
                onChange={(event) => updateShift('shiftDate', event.target.value)}
              />
            </FieldLabel>
            <FieldLabel label="Shift Start">
              <input
                type="time"
                value={shift.shiftStartTime}
                onChange={(event) => updateShift('shiftStartTime', event.target.value)}
              />
            </FieldLabel>
            <FieldLabel label="Target Finish">
              <input
                type="time"
                value={shift.targetFinishTime}
                onChange={(event) => updateShift('targetFinishTime', event.target.value)}
              />
            </FieldLabel>
          </div>
        </article>

        <article className="warehouse-plan-card">
          <p className="eyebrow">Volume and Labor</p>
          <h2>Night Plan</h2>
          <div className="warehouse-plan-fields warehouse-plan-fields--compact">
            <FieldLabel label="Planned Cases">
              <input
                type="number"
                min="0"
                value={shift.plannedCases}
                onChange={(event) => updateShift('plannedCases', toNumber(event.target.value))}
              />
            </FieldLabel>
            <FieldLabel label="Forklift Drops">
              <input
                type="number"
                min="0"
                value={shift.plannedForkliftDrops}
                onChange={(event) =>
                  updateShift('plannedForkliftDrops', toNumber(event.target.value))
                }
              />
            </FieldLabel>
            <FieldLabel label="Scheduled Selectors">
              <input
                type="number"
                min="0"
                value={shift.scheduledSelectors}
                onChange={(event) =>
                  updateShift('scheduledSelectors', toNumber(event.target.value))
                }
              />
            </FieldLabel>
            <FieldLabel label="Target CPH">
              <input
                type="number"
                min="0"
                value={shift.targetCasesPerHour}
                onChange={(event) =>
                  updateShift('targetCasesPerHour', toNumber(event.target.value))
                }
              />
            </FieldLabel>
            <FieldLabel label="Target Drops / Hr">
              <input
                type="number"
                min="0"
                value={shift.targetForkliftDropsPerHour}
                onChange={(event) =>
                  updateShift(
                    'targetForkliftDropsPerHour',
                    toNumber(event.target.value),
                  )
                }
              />
            </FieldLabel>
          </div>
        </article>

        <article className="warehouse-plan-card warehouse-plan-card--source">
          <p className="eyebrow">Connection Readiness</p>
          <h2>Plan Source</h2>
          <div className="warehouse-source-list">
            <div>
              <span>Manual plan</span>
              <strong>Active</strong>
              <small>Use this screen to build the baseline now.</small>
            </div>
            <div>
              <span>Blue Yonder</span>
              <strong>Prepared</strong>
              <small>Future approved export or connector mapping.</small>
            </div>
            <div>
              <span>CSV / Excel</span>
              <strong>Ready later</strong>
              <small>Good bridge for planner exports before direct access.</small>
            </div>
          </div>
        </article>
      </section>

      <section className="warehouse-prep-grid">
        <article className="warehouse-plan-card">
          <p className="eyebrow">Pre-Shift Inputs</p>
          <h2>What the meeting starts with</h2>
          <div className="warehouse-plan-fields warehouse-plan-fields--compact">
            <FieldLabel label="Prior Throughput CPH">
              <input
                type="number"
                min="0"
                value={shift.priorThroughputCasesPerHour}
                onChange={(event) =>
                  updateShift(
                    'priorThroughputCasesPerHour',
                    toNumber(event.target.value),
                  )
                }
              />
            </FieldLabel>
            <FieldLabel label="Available Selectors">
              <input
                type="number"
                min="0"
                value={shift.availableSelectors}
                onChange={(event) =>
                  updateShift('availableSelectors', toNumber(event.target.value))
                }
              />
            </FieldLabel>
            <FieldLabel label="Call-Offs / Unavailable">
              <input
                type="number"
                min="0"
                value={shift.unavailableSelectors}
                onChange={(event) =>
                  updateShift('unavailableSelectors', toNumber(event.target.value))
                }
              />
            </FieldLabel>
            <FieldLabel label="Forklift Drivers">
              <input
                type="number"
                min="0"
                value={shift.forkliftDrivers}
                onChange={(event) =>
                  updateShift('forkliftDrivers', toNumber(event.target.value))
                }
              />
            </FieldLabel>
            <FieldLabel label="Blue Yonder Man Hours">
              <input
                type="number"
                min="0"
                step="0.25"
                value={shift.blueYonderManHours ?? 0}
                onChange={(event) =>
                  updateShift('blueYonderManHours', toNumber(event.target.value))
                }
              />
            </FieldLabel>
            <FieldLabel label="Starting Cases Picked">
              <input
                type="number"
                min="0"
                value={shift.startingSelectedCases}
                onChange={(event) =>
                  updateShift('startingSelectedCases', toNumber(event.target.value))
                }
              />
            </FieldLabel>
          </div>
        </article>

        <article className="warehouse-plan-card warehouse-plan-card--source">
          <p className="eyebrow">Previous Shift</p>
          <h2>Issues to carry into the plan</h2>
          <label className="warehouse-field">
            <span>Notes from prior shift</span>
            <textarea
              value={shift.previousShiftNotes}
              onChange={(event) =>
                updateShift('previousShiftNotes', event.target.value)
              }
            />
          </label>
          <div className="warehouse-prep-metric-row">
            <span>Net available selectors</span>
            <strong>{formatWhole(calculation.netAvailableSelectors)}</strong>
          </div>
        </article>
      </section>

      <RouteSheetSection
        calculation={calculation}
        helper="Routes can stay pending early in the shift. Add or update them when the truck sheet lands, then late and cut counts carry into review and snapshot."
        shift={shift}
        title="Route sheet readiness"
        updateRoute={updateRoute}
        updateShift={updateShift}
        onAddRoute={onAddRoute}
        onDeleteRoute={onDeleteRoute}
      />

      <section className="warehouse-zone-section">
        <div className="section-heading-row">
          <div>
            <p className="eyebrow">Zone Plan</p>
            <h2>Where the work should happen</h2>
            <p>
              Split planned cases and forklift drops by area so the progress
              screen can show which parts of the night are ahead, stuck, or
              short on labor.
            </p>
          </div>
          <button type="button" className="secondary-button" onClick={onApplyZoneTotals}>
            Use Zone Totals
          </button>
        </div>

        <div className="warehouse-zone-total-row">
          <span>Zone totals</span>
          <strong>{formatWhole(zonePlanTotals.cases)} cases</strong>
          <strong>{formatWhole(zonePlanTotals.forkliftDrops)} drops</strong>
          <strong>{formatWhole(zonePlanTotals.selectors)} selectors</strong>
        </div>

        <div className="warehouse-zone-grid">
          {shift.zones.map((zone) => (
            <article className="warehouse-zone-plan-card" key={zone.id}>
              <div className="warehouse-zone-card-head">
                <FieldLabel label="Area">
                  <input
                    type="text"
                    value={zone.name}
                    onChange={(event) => updateZone(zone.id, 'name', event.target.value)}
                  />
                </FieldLabel>
              </div>
              <div className="warehouse-zone-input-grid">
                <FieldLabel label="Cases">
                  <input
                    type="number"
                    min="0"
                    value={zone.plannedCases}
                    onChange={(event) =>
                      updateZone(zone.id, 'plannedCases', toNumber(event.target.value))
                    }
                  />
                </FieldLabel>
                <FieldLabel label="Drops">
                  <input
                    type="number"
                    min="0"
                    value={zone.plannedForkliftDrops}
                    onChange={(event) =>
                      updateZone(
                        zone.id,
                        'plannedForkliftDrops',
                        toNumber(event.target.value),
                      )
                    }
                  />
                </FieldLabel>
                <FieldLabel label="Selectors">
                  <input
                    type="number"
                    min="0"
                    value={zone.scheduledSelectors}
                    onChange={(event) =>
                      updateZone(
                        zone.id,
                        'scheduledSelectors',
                        toNumber(event.target.value),
                      )
                    }
                  />
                </FieldLabel>
                <FieldLabel label="Target CPH">
                  <input
                    type="number"
                    min="0"
                    value={zone.targetCasesPerHour ?? ''}
                    onChange={(event) =>
                      updateZone(
                        zone.id,
                        'targetCasesPerHour',
                        event.target.value.trim() === ''
                          ? null
                          : toNumber(event.target.value),
                      )
                    }
                  />
                </FieldLabel>
              </div>
              <label className="warehouse-field">
                <span>Plan note</span>
                <input
                  type="text"
                  value={zone.note}
                  onChange={(event) => updateZone(zone.id, 'note', event.target.value)}
                />
              </label>
            </article>
          ))}
        </div>
      </section>

      <section className="warehouse-plan-check">
        <div className="section-heading-row">
          <div>
            <p className="eyebrow">Plan Check</p>
            <h2>Baseline the night will be judged against</h2>
          </div>
          <button type="button" className="primary-button" onClick={onContinue}>
            Start Live Shift
          </button>
        </div>
        <div className="warehouse-plan-check-grid">
          <article>
            <span>Target CPH</span>
            <strong>{formatRate(calculation.targetCasesPerHourUsed)}</strong>
          </article>
          <article>
            <span>Target Drops / Hr</span>
            <strong>{formatRate(calculation.targetForkliftDropsPerHourUsed)}</strong>
          </article>
          <article>
            <span>Cases / Selector</span>
            <strong>{formatWhole(planCasesPerSelector)}</strong>
          </article>
          <article>
            <span>Plan Finish</span>
            <strong>{shift.targetFinishTime || 'Not set'}</strong>
          </article>
        </div>
      </section>
    </>
  );
}

interface WarehouseProgressStepProps {
  calculation: WarehouseShiftCalculation;
  shift: WarehouseShiftInput;
  updateShift: <K extends keyof WarehouseShiftInput>(
    field: K,
    value: WarehouseShiftInput[K],
  ) => void;
  updateZone: <K extends keyof WarehouseZoneInput>(
    id: string,
    field: K,
    value: WarehouseZoneInput[K],
  ) => void;
  updateRoute: <K extends keyof WarehouseRouteInput>(
    id: string,
    field: K,
    value: WarehouseRouteInput[K],
  ) => void;
  onAddRoute: (count?: number) => void;
  onDeleteRoute: (id: string) => void;
  onBackToPlan: () => void;
  onContinue: () => void;
}

function WarehouseProgressStep({
  calculation,
  shift,
  updateShift,
  updateZone,
  updateRoute,
  onAddRoute,
  onBackToPlan,
  onDeleteRoute,
  onContinue,
}: WarehouseProgressStepProps) {
  return (
    <>
      <section className="warehouse-progress-layout">
        <article className="warehouse-plan-card warehouse-progress-entry-card">
          <p className="eyebrow">Live Read</p>
          <h2>Refresh Progress</h2>
          <div className="warehouse-plan-fields warehouse-plan-fields--compact">
            <FieldLabel label="As Of Time">
              <input
                type="time"
                value={shift.asOfTime}
                onChange={(event) => updateShift('asOfTime', event.target.value)}
              />
            </FieldLabel>
            <FieldLabel label="Selected Cases">
              <input
                type="number"
                min="0"
                value={shift.selectedCases}
                onChange={(event) => updateShift('selectedCases', toNumber(event.target.value))}
              />
            </FieldLabel>
            <FieldLabel label="Completed Forklift Drops">
              <input
                type="number"
                min="0"
                value={shift.completedForkliftDrops}
                onChange={(event) =>
                  updateShift('completedForkliftDrops', toNumber(event.target.value))
                }
              />
            </FieldLabel>
            <FieldLabel label="Active Selectors">
              <input
                type="number"
                min="0"
                value={shift.activeSelectors}
                onChange={(event) =>
                  updateShift('activeSelectors', toNumber(event.target.value))
                }
              />
            </FieldLabel>
            <FieldLabel label="Selector Hours Worked">
              <input
                type="number"
                min="0"
                step="0.25"
                value={shift.selectorHoursWorked}
                onChange={(event) =>
                  updateShift('selectorHoursWorked', toNumber(event.target.value))
                }
              />
            </FieldLabel>
            <FieldLabel label="Indirect Hours">
              <input
                type="number"
                min="0"
                step="0.25"
                value={shift.indirectHours}
                onChange={(event) =>
                  updateShift('indirectHours', toNumber(event.target.value))
                }
              />
            </FieldLabel>
            <FieldLabel label="Kronos Logged Hours">
              <input
                type="number"
                min="0"
                step="0.25"
                value={shift.kronosLoggedHours ?? 0}
                onChange={(event) =>
                  updateShift('kronosLoggedHours', toNumber(event.target.value))
                }
              />
            </FieldLabel>
            <FieldLabel label="Downtime Minutes">
              <input
                type="number"
                min="0"
                value={shift.downtimeMinutes}
                onChange={(event) =>
                  updateShift('downtimeMinutes', toNumber(event.target.value))
                }
              />
            </FieldLabel>
          </div>
        </article>

        <article className="warehouse-progress-results-card">
          <div>
            <p className="eyebrow">Forecasted Readout</p>
            <h2>{calculation.status}</h2>
            <p>{calculation.summary}</p>
          </div>
          <div className="warehouse-progress-metric-grid">
            <ProgressMetric
              label="Cases Remaining"
              value={formatWhole(calculation.casesRemaining)}
              tone={calculation.casesRemaining <= 0 ? 'good' : 'watch'}
            />
            <ProgressMetric
              label="Required CPH"
              value={formatRate(calculation.requiredCasesPerHour)}
              tone="watch"
            />
            <ProgressMetric
              label="Forecasted Finish"
              value={calculation.projectedFinishTime}
              tone={calculation.status === 'Ahead' ? 'good' : 'watch'}
            />
            <ProgressMetric
              label="Finish Variance"
              value={formatSignedMinutes(calculation.projectedFinishVarianceMinutes)}
              tone={calculation.status === 'Ahead' ? 'good' : 'watch'}
            />
            <ProgressMetric
              label="Forklift Drops Left"
              value={formatWhole(calculation.forkliftDropsRemaining)}
              tone={calculation.forkliftDropsRemaining <= 0 ? 'good' : 'watch'}
            />
            <ProgressMetric
              label="Selectors Needed"
              value={formatWhole(calculation.additionalSelectorsNeeded)}
              tone={
                calculation.additionalSelectorsNeeded === null ||
                calculation.additionalSelectorsNeeded === 0
                  ? 'good'
                  : 'watch'
              }
            />
          </div>
        </article>
      </section>

      <LaborMoveCheckSection
        checks={calculation.laborMoveChecks}
        helper="Use this before cutting a forklift or selector. It checks drops by area against selector flow so labor savings do not quietly create shorts, idle selectors, or a late finish."
        title="Can we cut or move labor safely?"
      />

      <RouteSheetSection
        calculation={calculation}
        helper="Keep this updated as the truck sheet changes. Late and cut trucks are separated from selector pace so the review is fair."
        shift={shift}
        title="Route sheet live read"
        updateRoute={updateRoute}
        updateShift={updateShift}
        onAddRoute={onAddRoute}
        onDeleteRoute={onDeleteRoute}
      />

      <section className="warehouse-zone-section">
        <div className="section-heading-row">
          <div>
            <p className="eyebrow">Zone Progress</p>
            <h2>What each area has completed so far</h2>
            <p>
              Enter current cases, forklift drops, labor, and delay minutes by
              area. This is the operational read against the plan above.
            </p>
          </div>
          <div className="warehouse-section-actions">
            <button type="button" className="secondary-button" onClick={onBackToPlan}>
              Back to Plan
            </button>
            <button type="button" className="primary-button" onClick={onContinue}>
              Finish Review
            </button>
          </div>
        </div>

        <div className="warehouse-zone-grid warehouse-zone-grid--progress">
          {shift.zones.map((zone) => {
            const zoneResult = calculation.zones.find((item) => item.id === zone.id);
            return (
              <article className="warehouse-zone-plan-card" key={zone.id}>
                <div className="warehouse-zone-progress-head">
                  <div>
                    <p className="eyebrow">Area</p>
                    <h3>{zone.name}</h3>
                  </div>
                  <span
                    className={`warehouse-status-pill warehouse-status-pill--${
                      zoneResult ? statusClassName(zoneResult.status) : 'on-pace'
                    }`}
                  >
                    {zoneResult?.status ?? 'On Pace'}
                  </span>
                </div>
                <div className="warehouse-zone-input-grid">
                  <FieldLabel label="Selected Cases">
                    <input
                      type="number"
                      min="0"
                      value={zone.selectedCases}
                      onChange={(event) =>
                        updateZone(zone.id, 'selectedCases', toNumber(event.target.value))
                      }
                    />
                  </FieldLabel>
                  <FieldLabel label="Forklift Drops">
                    <input
                      type="number"
                      min="0"
                      value={zone.completedForkliftDrops}
                      onChange={(event) =>
                        updateZone(
                          zone.id,
                          'completedForkliftDrops',
                          toNumber(event.target.value),
                        )
                      }
                    />
                  </FieldLabel>
                  <FieldLabel label="Active Selectors">
                    <input
                      type="number"
                      min="0"
                      value={zone.activeSelectors}
                      onChange={(event) =>
                        updateZone(zone.id, 'activeSelectors', toNumber(event.target.value))
                      }
                    />
                  </FieldLabel>
                  <FieldLabel label="Selector Hours">
                    <input
                      type="number"
                      min="0"
                      step="0.25"
                      value={zone.selectorHoursWorked}
                      onChange={(event) =>
                        updateZone(
                          zone.id,
                          'selectorHoursWorked',
                          toNumber(event.target.value),
                        )
                      }
                    />
                  </FieldLabel>
                  <FieldLabel label="Delay Minutes">
                    <input
                      type="number"
                      min="0"
                      value={zone.delayMinutes}
                      onChange={(event) =>
                        updateZone(zone.id, 'delayMinutes', toNumber(event.target.value))
                      }
                    />
                  </FieldLabel>
                </div>
                <div className="warehouse-zone-readout">
                  <span>{formatWhole(zoneResult?.casesRemaining ?? null)} cases left</span>
                  <span>
                    {formatWhole(zoneResult?.forkliftDropsRemaining ?? null)} drops left
                  </span>
                  <span>
                    {formatRate(zoneResult?.requiredCasesPerHour ?? null)} CPH needed
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </>
  );
}

interface WarehouseResultsStepProps {
  calculation: WarehouseShiftCalculation;
  onBackToProgress: () => void;
  onContinue: () => void;
}

function PlanVsFinishCard({
  label,
  plan,
  actual,
  variance,
  tone,
}: {
  label: string;
  plan: string;
  actual: string;
  variance: string;
  tone: 'good' | 'watch' | 'neutral';
}) {
  return (
    <article className={`warehouse-review-card warehouse-review-card--${tone}`}>
      <span>{label}</span>
      <dl>
        <div>
          <dt>Plan</dt>
          <dd>{plan}</dd>
        </div>
        <div>
          <dt>Finish</dt>
          <dd>{actual}</dd>
        </div>
        <div>
          <dt>Variance</dt>
          <dd>{variance}</dd>
        </div>
      </dl>
    </article>
  );
}

function WarehouseResultsStep({
  calculation,
  onBackToProgress,
  onContinue,
}: WarehouseResultsStepProps) {
  const completionPct = safePercent(calculation.selectedCases, calculation.plannedCases);
  const forkliftCompletionPct = safePercent(
    calculation.completedForkliftDrops,
    calculation.plannedForkliftDrops,
  );
  const actualFinishLabel =
    calculation.status === 'Complete' ? calculation.asOfTime : calculation.projectedFinishTime;
  const actualFinishHeading =
    calculation.status === 'Complete' ? 'Actual Finish' : 'Forecasted Finish';
  const caseVariance = calculation.selectedCases - calculation.plannedCases;
  const forkliftVariance =
    calculation.completedForkliftDrops - calculation.plannedForkliftDrops;
  const activeSelectors = calculation.zones.reduce(
    (total, zone) => total + zone.activeSelectors,
    0,
  );
  const scheduledSelectors = calculation.zones.reduce(
    (total, zone) => total + zone.scheduledSelectors,
    0,
  );
  const selectorVariance = activeSelectors - scheduledSelectors;
  const cphVariance = calculation.teamCasesPerHour - calculation.targetCasesPerHourUsed;
  const dropRateVariance =
    calculation.teamForkliftDropsPerHour -
    calculation.targetForkliftDropsPerHourUsed;
  const focusZone = findFocusZone(calculation);
  const riskZones = [...calculation.zones]
    .filter((zone) => zone.status === 'Behind' || zone.status === 'At Risk')
    .sort((a, b) => a.casePaceVariance - b.casePaceVariance);
  const successZones = [...calculation.zones]
    .filter(
      (zone) =>
        zone.status === 'Ahead' ||
        zone.status === 'On Pace' ||
        zone.status === 'Complete',
    )
    .sort((a, b) => b.casePaceVariance - a.casePaceVariance);
  const sortedZones = [...calculation.zones].sort((a, b) => {
    const rank = (status: string) => {
      if (status === 'Behind') return 0;
      if (status === 'At Risk') return 1;
      if (status === 'On Pace') return 2;
      if (status === 'Ahead') return 3;
      return 4;
    };
    return rank(a.status) - rank(b.status);
  });

  return (
    <>
      <section
        className={`warehouse-results-command warehouse-results-command--${statusClassName(
          calculation.status,
        )}`}
      >
        <div className="warehouse-results-main">
          <p className="eyebrow">Plan vs Finish</p>
          <div className="warehouse-results-title-row">
            <h2>{calculation.status === 'Complete' ? 'Finished' : calculation.status}</h2>
            <span
              className={`warehouse-status-pill warehouse-status-pill--${statusClassName(
                calculation.status,
              )}`}
            >
              {formatSignedMinutes(calculation.projectedFinishVarianceMinutes)}
            </span>
          </div>
          <p>
            {calculation.status === 'Complete'
              ? `The shift finished at ${calculation.asOfTime}. Review where the plan held, where it lagged, and what should change next shift.`
              : `Current/final read shows ${formatWhole(
                  calculation.selectedCases,
                )} of ${formatWhole(
                  calculation.plannedCases,
                )} cases selected. Use this as the closeout review when the final read is entered.`}
          </p>
        </div>
        <div className="warehouse-results-finish-card">
          <span>{actualFinishHeading}</span>
          <strong>{actualFinishLabel}</strong>
          <small>Target finish: {calculation.targetFinishTime}</small>
        </div>
      </section>

      <section className="warehouse-review-grid" aria-label="Warehouse plan versus finish">
        <PlanVsFinishCard
          label="Cases"
          plan={formatWhole(calculation.plannedCases)}
          actual={`${formatWhole(calculation.selectedCases)} (${formatPercent(
            completionPct,
          )})`}
          variance={formatSignedWhole(caseVariance)}
          tone={caseVariance >= 0 ? 'good' : 'watch'}
        />
        <PlanVsFinishCard
          label="Finish Time"
          plan={calculation.targetFinishTime}
          actual={actualFinishLabel}
          variance={formatSignedMinutes(calculation.projectedFinishVarianceMinutes)}
          tone={metricToneFromStatus(calculation.status)}
        />
        <PlanVsFinishCard
          label="Forklift Drops"
          plan={formatWhole(calculation.plannedForkliftDrops)}
          actual={`${formatWhole(calculation.completedForkliftDrops)} (${formatPercent(
            forkliftCompletionPct,
          )})`}
          variance={formatSignedWhole(forkliftVariance)}
          tone={forkliftVariance >= 0 ? 'good' : 'watch'}
        />
        <PlanVsFinishCard
          label="Case Pace"
          plan={`${formatRate(calculation.targetCasesPerHourUsed)} CPH`}
          actual={`${formatRate(calculation.teamCasesPerHour)} CPH`}
          variance={`${formatSignedWhole(cphVariance)} CPH`}
          tone={cphVariance >= 0 ? 'good' : 'watch'}
        />
        <PlanVsFinishCard
          label="Forklift Cadence"
          plan={`${formatRate(calculation.targetForkliftDropsPerHourUsed)} drops/hr`}
          actual={`${formatRate(calculation.teamForkliftDropsPerHour)} drops/hr`}
          variance={`${formatSignedWhole(dropRateVariance)} drops/hr`}
          tone={dropRateVariance >= 0 ? 'good' : 'watch'}
        />
        <PlanVsFinishCard
          label="Selectors"
          plan={formatWhole(scheduledSelectors)}
          actual={formatWhole(activeSelectors)}
          variance={formatSignedWhole(selectorVariance)}
          tone={selectorVariance >= 0 ? 'good' : 'watch'}
        />
        <PlanVsFinishCard
          label="Labor Hours"
          plan={`${formatHours(calculation.blueYonderManHours)} BY`}
          actual={`${formatHours(calculation.kronosLoggedHours)} Kronos`}
          variance={formatSignedHours(calculation.laborHourVariance)}
          tone={calculation.laborHourVariance <= 0 ? 'good' : 'watch'}
        />
        <PlanVsFinishCard
          label="Indirect Time"
          plan="Kronos logged"
          actual={formatHours(calculation.indirectHours)}
          variance={`${formatPercent(
            safePercent(calculation.indirectHours, calculation.kronosLoggedHours),
          )} indirect`}
          tone={
            calculation.kronosLoggedHours > 0 &&
            calculation.indirectHours / calculation.kronosLoggedHours > 0.12
              ? 'watch'
              : 'neutral'
          }
        />
        <PlanVsFinishCard
          label="Routes / Trucks"
          plan={`${formatWhole(calculation.totalRoutes)} on sheet`}
          actual={`${formatWhole(calculation.loadedRoutes)} loaded`}
          variance={`${formatWhole(calculation.lateRoutes)} late / ${formatWhole(
            calculation.cutRoutes,
          )} cut`}
          tone={
            calculation.lateRoutes === 0 && calculation.cutRoutes === 0
              ? 'good'
              : 'watch'
          }
        />
        <PlanVsFinishCard
          label="Route Sheet"
          plan="Expected final sheet"
          actual={calculation.routeSheetStatus}
          variance={`${formatWhole(calculation.plannedRouteCases)} route cases`}
          tone={calculation.routeSheetStatus === 'Final' ? 'good' : 'neutral'}
        />
      </section>

      <section className="warehouse-results-focus-grid">
        <article className="warehouse-results-focus-card">
          <p className="eyebrow">Where We Lagged</p>
          <h2>{focusZone ? focusZone.name : 'No major lag'}</h2>
          <p>
            {riskZones.length > 0
              ? `${riskZones[0].name} was the highest-risk area from this read. Use this to shape the next shift plan.`
              : 'No area is currently marked behind or at risk from the latest read.'}
          </p>
          {riskZones.length > 0 ? (
            <div className="warehouse-review-zone-list">
              {riskZones.map((zone) => (
                <div key={zone.id}>
                  <strong>{zone.name}</strong>
                  <span>{zone.status}</span>
                  <small>
                    {formatSignedWhole(zone.casePaceVariance)} cases vs time plan,
                    {` ${formatWhole(zone.delayMinutes)}`} min delay
                  </small>
                </div>
              ))}
            </div>
          ) : null}
        </article>

        <article className="warehouse-results-focus-card warehouse-results-focus-card--quiet">
          <p className="eyebrow">Where We Held</p>
          <h2>{successZones.length > 0 ? successZones[0].name : 'No clear win yet'}</h2>
          <p>
            {successZones.length > 0
              ? 'These areas had the best cushion against the time plan. They are the first places to study before changing labor.'
              : 'No area has built clear cushion yet.'}
          </p>
          {successZones.length > 0 ? (
            <div className="warehouse-review-zone-list">
              {successZones.map((zone) => (
                <div key={zone.id}>
                  <strong>{zone.name}</strong>
                  <span>{zone.status}</span>
                  <small>
                    {formatSignedWhole(zone.casePaceVariance)} cases vs time plan,
                    {` ${formatRate(zone.teamCasesPerHour)}`} CPH
                  </small>
                </div>
              ))}
            </div>
          ) : null}
        </article>
      </section>

      <section className="warehouse-results-zone-section">
        <div className="section-heading-row">
          <div>
            <p className="eyebrow">Area Results</p>
            <h2>Final area readout</h2>
            <p>
              Plan-versus-finish by area, sorted with the highest-risk zones first.
              This is the source for the next-shift action plan.
            </p>
          </div>
          <div className="warehouse-section-actions">
            <button type="button" className="secondary-button" onClick={onBackToProgress}>
              Back to Progress
            </button>
            <button type="button" className="primary-button" onClick={onContinue}>
              Build Next Shift Plan
            </button>
          </div>
        </div>

        <div className="warehouse-results-zone-grid">
          {sortedZones.map((zone) => (
            <article
              className={`warehouse-results-zone-card warehouse-results-zone-card--${statusClassName(
                zone.status,
              )}`}
              key={zone.id}
            >
              <div className="warehouse-zone-progress-head">
                <div>
                  <p className="eyebrow">Area</p>
                  <h3>{zone.name}</h3>
                </div>
                <span
                  className={`warehouse-status-pill warehouse-status-pill--${statusClassName(
                    zone.status,
                  )}`}
                >
                  {zone.status}
                </span>
              </div>
              <div className="warehouse-results-zone-stats">
                <div>
                  <span>Selected / Plan</span>
                  <strong>
                    {formatWhole(zone.selectedCases)} / {formatWhole(zone.plannedCases)}
                  </strong>
                </div>
                <div>
                  <span>Cases Left</span>
                  <strong>{formatWhole(zone.casesRemaining)}</strong>
                </div>
                <div>
                  <span>Required CPH</span>
                  <strong>{formatRate(zone.requiredCasesPerHour)}</strong>
                </div>
                <div>
                  <span>Drops Left</span>
                  <strong>{formatWhole(zone.forkliftDropsRemaining)}</strong>
                </div>
                <div>
                  <span>Pace Variance</span>
                  <strong>{formatSignedWhole(zone.casePaceVariance)}</strong>
                </div>
                <div>
                  <span>Delay</span>
                  <strong>{formatWhole(zone.delayMinutes)} min</strong>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}

interface WarehouseRecoveryStepProps {
  calculation: WarehouseShiftCalculation;
  onBackToResults: () => void;
  onContinue: () => void;
}

function WarehouseRecoveryStep({
  calculation,
  onBackToResults,
  onContinue,
}: WarehouseRecoveryStepProps) {
  const actions = buildWarehouseRecoveryActions(calculation);
  const focusZone = findFocusZone(calculation);
  const supportZones = calculation.zones
    .filter(
      (zone) =>
        (zone.status === 'Ahead' || zone.status === 'On Pace') &&
        zone.activeSelectors > 0 &&
        zone.id !== focusZone?.id,
    )
    .sort((a, b) => b.casePaceVariance - a.casePaceVariance);
  const riskZones = calculation.zones.filter(
    (zone) => zone.status === 'Behind' || zone.status === 'At Risk',
  );

  return (
    <>
      <section
        className={`warehouse-recovery-command warehouse-recovery-command--${statusClassName(
          calculation.status,
        )}`}
      >
        <div>
          <p className="eyebrow">Next-Shift Plan</p>
          <h2>
            {calculation.status === 'Complete'
              ? 'Repeat the clean finish'
              : calculation.projectedFinishVarianceMinutes !== null &&
                  calculation.projectedFinishVarianceMinutes > 15
                ? 'Plan the correction'
                : 'Protect the flow'}
          </h2>
          <p>
            {calculation.status === 'Complete'
              ? 'The next shift should start by repeating the conditions that kept the finish on plan.'
              : buildFocusNote(calculation, focusZone)}
          </p>
        </div>
        <div className="warehouse-recovery-scorecard">
          <ProgressMetric
            label="Last Finish Read"
            value={calculation.projectedFinishTime}
            tone={metricToneFromStatus(calculation.status)}
          />
          <ProgressMetric
            label="Miss / Cushion"
            value={formatSignedMinutes(calculation.projectedFinishVarianceMinutes)}
            tone={metricToneFromStatus(calculation.status)}
          />
          <ProgressMetric
            label="Flex to Pre-Plan"
            value={formatWhole(calculation.additionalSelectorsNeeded)}
            tone={
              calculation.additionalSelectorsNeeded === null ||
              calculation.additionalSelectorsNeeded === 0
                ? 'good'
                : 'watch'
            }
          />
        </div>
      </section>

      <LaborMoveCheckSection
        checks={calculation.laborMoveChecks}
        eyebrow="Next-Shift Labor Guardrails"
        helper="Carry these guardrails into the next pre-shift meeting before anyone cuts a forklift, selector, or support area."
        title="Labor moves to protect flow"
      />

      <section className="warehouse-recovery-action-section">
        <div className="section-heading-row">
          <div>
            <p className="eyebrow">Next-Shift Actions</p>
            <h2>What managers should walk in with</h2>
            <p>
              These are next-shift recommendations from the plan-vs-finish math.
              They are meant for the pre-shift conversation, not a live status read.
            </p>
          </div>
          <div className="warehouse-section-actions">
            <button type="button" className="secondary-button" onClick={onBackToResults}>
              Back to Results
            </button>
            <button type="button" className="primary-button" onClick={onContinue}>
              Build Snapshot
            </button>
          </div>
        </div>

        <div className="warehouse-recovery-action-grid">
          {actions.map((action, index) => (
            <article
              className={`warehouse-recovery-action-card warehouse-recovery-action-card--${action.tone}`}
              key={action.id}
            >
              <div className="warehouse-recovery-action-head">
                <span>{index + 1}</span>
                <div>
                  <p className="eyebrow">Next Move</p>
                  <h3>{action.title}</h3>
                </div>
              </div>
              <dl className="warehouse-recovery-detail-list">
                <div>
                  <dt>Owner</dt>
                  <dd>{action.owner}</dd>
                </div>
                <div>
                  <dt>Timing</dt>
                  <dd>{action.timing}</dd>
                </div>
                <div>
                  <dt>From Last Shift</dt>
                  <dd>{action.reason}</dd>
                </div>
                <div>
                  <dt>Manager Move</dt>
                  <dd>{action.move}</dd>
                </div>
                <div>
                  <dt>Watch First</dt>
                  <dd>{action.watchMetric}</dd>
                </div>
                <div>
                  <dt>Impact</dt>
                  <dd>{action.expectedImpact}</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      </section>

      <section className="warehouse-recovery-support-grid">
        <article className="warehouse-recovery-support-card">
          <p className="eyebrow">Support Sources</p>
          <h2>Areas that may have room to help next shift</h2>
          {supportZones.length > 0 ? (
            <div className="warehouse-recovery-zone-list">
              {supportZones.map((zone) => (
                <div key={zone.id}>
                  <strong>{zone.name}</strong>
                  <span>{zone.status}</span>
                  <small>
                    {formatSignedWhole(zone.casePaceVariance)} cases vs time plan,
                    {` ${zone.activeSelectors}`} active selectors
                  </small>
                </div>
              ))}
            </div>
          ) : (
            <p className="warehouse-recovery-empty">
              No clear support source from the last read. Keep staffing stable
              until another area shows cushion.
            </p>
          )}
        </article>

        <article className="warehouse-recovery-support-card warehouse-recovery-support-card--risk">
          <p className="eyebrow">Risk Areas</p>
          <h2>Areas to keep in the next huddle</h2>
          {riskZones.length > 0 ? (
            <div className="warehouse-recovery-zone-list">
              {riskZones.map((zone) => (
                <div key={zone.id}>
                  <strong>{zone.name}</strong>
                  <span>{zone.status}</span>
                  <small>
                    {formatWhole(zone.casesRemaining)} cases left,
                    {` ${formatRate(zone.requiredCasesPerHour)}`} CPH needed
                  </small>
                </div>
              ))}
            </div>
          ) : (
            <p className="warehouse-recovery-empty">
              No area was marked behind or at risk in the last read.
            </p>
          )}
        </article>
      </section>
    </>
  );
}

interface WarehouseSnapshotStepProps {
  calculation: WarehouseShiftCalculation;
  onBackToActionPlan: () => void;
}

function WarehouseSnapshotStep({
  calculation,
  onBackToActionPlan,
}: WarehouseSnapshotStepProps) {
  const actions = buildWarehouseRecoveryActions(calculation);
  const riskZones = calculation.zones.filter(
    (zone) => zone.status === 'Behind' || zone.status === 'At Risk',
  );
  const successZones = calculation.zones.filter(
    (zone) =>
      zone.status === 'Ahead' ||
      zone.status === 'On Pace' ||
      zone.status === 'Complete',
  );
  const indirectPct = safePercent(
    calculation.indirectHours,
    calculation.kronosLoggedHours,
  );

  return (
    <section className="warehouse-snapshot-card">
      <div className="section-heading-row">
        <div>
          <p className="eyebrow">Sendable Snapshot</p>
          <h2>{calculation.shiftName} recap</h2>
          <p>
            One-page plan vs finish recap with labor-hour checks, late/cut
            trucks, lag areas, wins, and the next-shift action plan.
          </p>
        </div>
        <div className="warehouse-section-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={onBackToActionPlan}
          >
            Back to Action Plan
          </button>
          <button
            type="button"
            className="primary-button"
            onClick={() => window.print()}
          >
            Print / Export PDF
          </button>
        </div>
      </div>

      <div className="warehouse-snapshot-header">
        <div>
          <span>Warehouse</span>
          <strong>{calculation.warehouseName}</strong>
        </div>
        <div>
          <span>Shift Date</span>
          <strong>{calculation.shiftDate}</strong>
        </div>
        <div>
          <span>Status</span>
          <strong>{calculation.status}</strong>
        </div>
        <div>
          <span>Finish</span>
          <strong>{calculation.projectedFinishTime}</strong>
        </div>
        <div>
          <span>Route Sheet</span>
          <strong>{calculation.routeSheetStatus}</strong>
        </div>
      </div>

      <div className="warehouse-snapshot-labor-strip">
        <div>
          <span>Blue Yonder Man Hours</span>
          <strong>{formatHours(calculation.blueYonderManHours)}</strong>
        </div>
        <div>
          <span>Kronos Logged Hours</span>
          <strong>{formatHours(calculation.kronosLoggedHours)}</strong>
        </div>
        <div>
          <span>Labor Hour Variance</span>
          <strong>{formatSignedHours(calculation.laborHourVariance)}</strong>
        </div>
        <div>
          <span>Indirect Time</span>
          <strong>
            {formatHours(calculation.indirectHours)}
            <small>{formatPercent(indirectPct)} of logged hours</small>
          </strong>
        </div>
      </div>

      <LaborMoveCheckSection
        checks={calculation.laborMoveChecks}
        eyebrow="Labor Move Guidance"
        helper="Forklift and selector move checks carried from the final read."
        title="Cut and rebalance guidance"
      />

      <div className="warehouse-snapshot-grid">
        <PlanVsFinishCard
          label="Cases"
          plan={formatWhole(calculation.plannedCases)}
          actual={formatWhole(calculation.selectedCases)}
          variance={formatSignedWhole(calculation.selectedCases - calculation.plannedCases)}
          tone={
            calculation.selectedCases >= calculation.plannedCases ? 'good' : 'watch'
          }
        />
        <PlanVsFinishCard
          label="Finish Time"
          plan={calculation.targetFinishTime}
          actual={calculation.projectedFinishTime}
          variance={formatSignedMinutes(calculation.projectedFinishVarianceMinutes)}
          tone={metricToneFromStatus(calculation.status)}
        />
        <PlanVsFinishCard
          label="Forklift Drops"
          plan={formatWhole(calculation.plannedForkliftDrops)}
          actual={formatWhole(calculation.completedForkliftDrops)}
          variance={formatSignedWhole(
            calculation.completedForkliftDrops - calculation.plannedForkliftDrops,
          )}
          tone={
            calculation.completedForkliftDrops >= calculation.plannedForkliftDrops
              ? 'good'
              : 'watch'
          }
        />
        <PlanVsFinishCard
          label="Trucks"
          plan={`${formatWhole(calculation.totalRoutes)} on sheet`}
          actual={`${formatWhole(calculation.loadedRoutes)} loaded`}
          variance={`${formatWhole(calculation.lateRoutes)} late / ${formatWhole(
            calculation.cutRoutes,
          )} cut`}
          tone={
            calculation.lateRoutes === 0 && calculation.cutRoutes === 0
              ? 'good'
              : 'watch'
          }
        />
      </div>

      <div className="warehouse-snapshot-two-column">
        <article>
          <p className="eyebrow">Lag Areas</p>
          <h3>Where we missed</h3>
          {riskZones.length > 0 ? (
            <ul>
              {riskZones.map((zone) => (
                <li key={zone.id}>
                  <strong>{zone.name}</strong>: {formatSignedWhole(zone.casePaceVariance)} cases vs time plan; {formatWhole(zone.delayMinutes)} min delay.
                </li>
              ))}
            </ul>
          ) : (
            <p>No lag area identified from the final read.</p>
          )}
        </article>
        <article>
          <p className="eyebrow">Wins</p>
          <h3>Where we held</h3>
          {successZones.length > 0 ? (
            <ul>
              {successZones.map((zone) => (
                <li key={zone.id}>
                  <strong>{zone.name}</strong>: {zone.status}; {formatRate(zone.teamCasesPerHour)} CPH.
                </li>
              ))}
            </ul>
          ) : (
            <p>No clear cushion identified from the final read.</p>
          )}
        </article>
      </div>

      <article className="warehouse-snapshot-actions">
        <p className="eyebrow">Next-Shift Action Plan</p>
        <h3>What managers should review next</h3>
        <ol>
          {actions.map((action) => (
            <li key={action.id}>
              <strong>{action.title}</strong>
              <span>{action.move}</span>
            </li>
          ))}
        </ol>
      </article>
    </section>
  );
}
