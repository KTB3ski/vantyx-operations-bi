import { useEffect, useMemo, useState } from 'react';
import { Controls } from './components/Controls';
import { DataSources } from './components/DataSources';
import {
  ExecutiveSummaryCard,
  GopCommandCenter,
} from './components/GopCommandCenter';
import { Header } from './components/Header';
import { PeriodCard } from './components/PeriodCard';
import { ProjectionTable } from './components/ProjectionTable';
import { PropertySetup } from './components/PropertySetup';
import { ReportingViewSelector } from './components/ReportingViewSelector';
import { SavedSnapshots } from './components/SavedSnapshots';
import { SnapshotReport } from './components/SnapshotReport';
import { WarehouseShiftPlanner } from './components/WarehouseShiftPlanner';
import {
  calculatePeriod,
  calculateProjection,
} from './domain/calculations';
import {
  buildVyntaxAnalystBriefing,
  type VyntaxAnalystBriefing,
} from './domain/analyst';
import {
  cleanActionPlanNote,
  generateActionPlanRecommendations,
} from './domain/actionPlan';
import {
  buildAiActionPlanRequest,
  createDefaultAiSettings,
  draftAiActionPlan,
  mergeAiActionPlanDraft,
  toProjectionAdjustments,
  type AiSettings,
} from './domain/aiActionPlan';
import { createDemoDraft } from './domain/demoData';
import {
  createEmptyExpenseBreakdown,
  EXPENSE_BREAKDOWN_FIELD_KEYS,
} from './domain/expenseBreakdown';
import { parsePlanAssistAccessFile } from './domain/planAssistAccess';
import {
  createDefaultPropertySetup,
  normalizePropertySetup,
  type PropertySetup as PropertySetupModel,
} from './domain/propertySetup';
import {
  formatIsoDate,
  getTodayIsoDate,
  getUpcomingSunday,
  parseLocalDate,
} from './domain/datePeriods';
import {
  formatCurrency,
  formatPercent,
} from './domain/formatters';
import {
  buildWeeklySummaryText,
  copyWeeklySummary,
  exportSnapshotCsv,
} from './domain/exporting';
import {
  buildPeriodDateContexts,
  getPeriodDisplayLabel,
  getSelectedReportingDateContext,
  getReportingPeriodKey,
} from './domain/reporting';
import { SNAPSHOT_REPORT_SCOPES } from './domain/snapshotReports';
import {
  clearDraft,
  clearAiSettings,
  deleteSnapshot,
  isTauriRuntime,
  loadAiSettings,
  loadDraft,
  loadSavedSnapshots,
  saveAiSettings,
  saveDraft,
  saveSnapshot,
} from './domain/storage';
import type {
  AdjustmentType,
  DisplaySettings,
  PeriodCalculation,
  PeriodInput,
  PeriodKey,
  ProjectionAdjustment,
  ProjectionCalculation,
  SavedSnapshot,
  SnapshotDraft,
  SnapshotReportScope,
} from './domain/types';
import { PERIOD_KEYS, PERIOD_LABELS } from './domain/types';
import {
  warehouseDemoShift,
  type WarehouseShiftInput,
} from './domain/warehouse';

type FeedbackKind = 'success' | 'warning' | 'error' | 'info';
type IndustryKey = 'hotel' | 'warehouse' | 'custom';
type PublicRoute = 'landing' | 'app' | 'demo';

interface Feedback {
  kind: FeedbackKind;
  message: string;
}

function getPublicRoute(): PublicRoute {
  if (typeof window === 'undefined') return 'landing';
  const route = window.location.hash.replace(/^#\/?/, '').toLowerCase();
  if (route === 'app') return 'app';
  if (route === 'demo' || route === 'hotel-demo') return 'demo';
  return 'landing';
}

type WorkflowStepKey = 'setup' | 'numbers' | 'results' | 'actionPlan' | 'snapshot';

const WORKFLOW_STEPS: Array<{
  key: WorkflowStepKey;
  label: string;
  helper: string;
}> = [
  {
    key: 'setup',
    label: 'Setup',
    helper: 'Property, view, and access',
  },
  {
    key: 'numbers',
    label: 'Enter Numbers',
    helper: 'Month, quarter, and year',
  },
  {
    key: 'results',
    label: 'Review Results',
    helper: 'GOP position and variance',
  },
  {
    key: 'actionPlan',
    label: 'Action Plan',
    helper: 'Recovery actions',
  },
  {
    key: 'snapshot',
    label: 'Send Snapshot',
    helper: 'Preview, print, and copy',
  },
];

const INDUSTRY_OPTIONS: Array<{
  key: IndustryKey;
  label: string;
  helper: string;
}> = [
  {
    key: 'hotel',
    label: 'Hotel GOP Control',
    helper: 'GOP tracking, recovery planning, and sendable snapshots.',
  },
  {
    key: 'warehouse',
    label: 'Warehouse Shift Control',
    helper: 'Shift pace, route flow, finish forecast, and next-shift actions.',
  },
  {
    key: 'custom',
    label: 'Custom Operating Model',
    helper: 'A focused target dashboard for a specific business.',
  },
];

interface IndustryHomeProps {
  onSelect: (industry: IndustryKey) => void;
}

interface PublicLandingProps {
  onOpenApp: () => void;
  onOpenDemo: () => void;
}

function PublicLanding({ onOpenApp, onOpenDemo }: PublicLandingProps) {
  return (
    <main className="public-landing" aria-labelledby="public-landing-heading">
      <section className="public-hero">
        <div className="public-preview-scene" aria-hidden="true">
          <div className="public-preview-bar">
            <span />
            <span />
            <span />
          </div>
          <div className="public-preview-grid">
            <div className="public-preview-readout">
              <small>Operating Read</small>
              <strong>Gap is recoverable</strong>
              <p>Food Services is the clearest controllable gap.</p>
            </div>
            <div>
              <small>Current Position</small>
              <strong>$2,128</strong>
            </div>
            <div>
              <small>Forecast</small>
              <strong>Surplus $1.83</strong>
            </div>
            <div>
              <small>Recovery Revenue</small>
              <strong>$10,640</strong>
            </div>
            <div>
              <small>Action Plan</small>
              <strong>3 moves ready</strong>
            </div>
          </div>
        </div>

        <div className="public-hero-content">
          <img src="/vyntax-mark.png" alt="" />
          <p className="public-kicker">No-download browser demo</p>
          <h1 id="public-landing-heading">Vyntax</h1>
          <p>
            Turn messy finance and operating numbers into a clear read, a
            recovery plan, and a sendable snapshot accountants can review with a
            client.
          </p>
          <div className="public-actions">
            <button type="button" className="primary-button" onClick={onOpenDemo}>
              Open Live Demo
            </button>
            <button type="button" className="secondary-button" onClick={onOpenApp}>
              Start Blank Workspace
            </button>
          </div>
          <div className="public-trust-row" aria-label="Demo trust notes">
            <span>No install</span>
            <span>Sample data</span>
            <span>Local browser storage</span>
          </div>
        </div>
      </section>

      <section className="public-proof-band" aria-label="Vyntax use cases">
        <div>
          <span>For accountants</span>
          <strong>Advisory-ready client snapshots</strong>
        </div>
        <div>
          <span>For operators</span>
          <strong>Gap, forecast, and recovery actions</strong>
        </div>
        <div>
          <span>For pilots</span>
          <strong>Try the workflow before desktop install</strong>
        </div>
      </section>
    </main>
  );
}

function IndustryHome({ onSelect }: IndustryHomeProps) {
  return (
    <main className="industry-home" aria-labelledby="industry-home-heading">
      <section className="industry-home-hero">
        <div className="industry-home-brand">
          <img src="/vyntax-mark.png" alt="" />
          <div>
            <p className="industry-kicker">Vyntax Systems</p>
            <h1 id="industry-home-heading">Choose your workspace.</h1>
          </div>
        </div>
        <p>
          Local-first operating control for turning current numbers into a read,
          a plan, and a sendable update.
        </p>
      </section>

      <section className="industry-tile-grid" aria-label="Choose an industry">
        {INDUSTRY_OPTIONS.map((industry) => (
          <button
            type="button"
            className={`industry-tile industry-tile--${industry.key}`}
            key={industry.key}
            onClick={() => onSelect(industry.key)}
          >
            <strong>{industry.label}</strong>
            <small>{industry.helper}</small>
          </button>
        ))}
      </section>
    </main>
  );
}

interface IndustryPlaceholderProps {
  industryLabel: string;
  onChangeIndustry: () => void;
}

function IndustryPlaceholder({
  industryLabel,
  onChangeIndustry,
}: IndustryPlaceholderProps) {
  return (
    <main className="industry-placeholder" aria-labelledby="industry-placeholder-heading">
      <div className="industry-placeholder-head">
        <div className="logo-mark logo-mark--image" aria-hidden="true">
          <img src="/vyntax-mark.png" alt="" />
        </div>
        <div>
          <p className="eyebrow">Vyntax Systems</p>
          <h1 id="industry-placeholder-heading">{industryLabel}</h1>
        </div>
        <button
          type="button"
          className="secondary-button"
          onClick={onChangeIndustry}
        >
          Change Industry
        </button>
      </div>
      <section className="warehouse-preview-card">
        <p className="eyebrow">Next Dashboard Build</p>
        <h2>
          {industryLabel === 'Warehouse'
            ? 'Shift command center coming next'
            : 'Custom dashboard setup coming next'}
        </h2>
        <p>
          This industry slot is ready for its own Vyntax workflow: setup, enter
          or import operating numbers, review the target position, build a
          recovery plan, and send the snapshot.
        </p>
        <div className="warehouse-preview-steps">
          <span>Setup</span>
          <span>Enter / Import</span>
          <span>Shift Control</span>
          <span>Recovery Plan</span>
          <span>Send Snapshot</span>
        </div>
      </section>
    </main>
  );
}

interface ResultsFlowThroughKpisProps {
  input: PeriodInput;
  calculation: PeriodCalculation;
  displaySettings: DisplaySettings;
}

interface ProjectionVarianceSummaryProps {
  projections: Record<PeriodKey, ProjectionCalculation>;
  displaySettings: DisplaySettings;
}

function ResultsFlowThroughKpis({
  input,
  calculation,
  displaySettings,
}: ResultsFlowThroughKpisProps) {
  const money = (value: number) =>
    formatCurrency(value, displaySettings.currencyDisplay);
  const percent = (value: number) =>
    formatPercent(value, displaySettings.percentageDecimals);
  const actualFlow = calculation.actualFlow;
  const actualFlowThroughPct = actualFlow.actualFlowThroughPct;
  const flexFlowPct = actualFlow.flexFlowPct;
  const actualFlowTone =
    actualFlowThroughPct === null
      ? 'neutral'
      : actualFlowThroughPct >= input.flowThroughPct
        ? 'positive'
        : 'watch';
  const actualFlowValue =
    actualFlowThroughPct === null ? 'Needs plan' : percent(actualFlowThroughPct);
  const actualFlowNote =
    actualFlowThroughPct === null
      ? input.revenuePlan === null
        ? 'Add Revenue Plan in Enter Numbers > More inputs > Actual flow.'
        : actualFlow.message || 'Actual flow-through is not available yet.'
      : `Actual conversion compared with ${percent(input.flowThroughPct)} recovery target.`;
  const flexFlowTone =
    flexFlowPct === null ? 'neutral' : flexFlowPct >= 0 ? 'positive' : 'watch';
  const flexFlowValue =
    flexFlowPct === null ? 'Needs plan' : percent(flexFlowPct);
  const flexFlowNote =
    flexFlowPct === null
      ? 'Calculated after revenue plan and GOP plan are entered.'
      : 'Formula: GOP variance / revenue target variance minus 1.';
  const revenueRecovery = calculation.revenueNeededAtFlowThrough;

  return (
    <section
      className="results-flow-strip"
      aria-label="Flow-through and recovery KPIs"
    >
      <article className="results-flow-card results-flow-card--neutral">
        <span>Recovery Flow-Through</span>
        <strong>{percent(input.flowThroughPct)}</strong>
        <small>Used to estimate revenue needed to close the GOP gap.</small>
      </article>
      <article className={`results-flow-card results-flow-card--${actualFlowTone}`}>
        <span>Actual Flow-Through</span>
        <strong>{actualFlowValue}</strong>
        <small>{actualFlowNote}</small>
      </article>
      <article className={`results-flow-card results-flow-card--${flexFlowTone}`}>
        <span>Flex / Flow</span>
        <strong>{flexFlowValue}</strong>
        <small>{flexFlowNote}</small>
      </article>
      <article
        className={`results-flow-card ${
          revenueRecovery.achievable
            ? 'results-flow-card--watch'
            : 'results-flow-card--neutral'
        }`}
      >
        <span>Revenue Needed</span>
        <strong>
          {revenueRecovery.achievable
            ? money(revenueRecovery.amount)
            : 'Not applicable'}
        </strong>
        <small>
          {revenueRecovery.achievable
            ? 'Estimated at the recovery flow-through rate.'
            : revenueRecovery.message}
        </small>
      </article>
      <article
        className={`results-flow-card ${
          calculation.dailyRecoveryNeeded > 0
            ? 'results-flow-card--watch'
            : 'results-flow-card--positive'
        }`}
      >
        <span>Daily GOP Recovery</span>
        <strong>{money(calculation.dailyRecoveryNeeded)}</strong>
        <small>Daily GOP improvement needed for the selected period.</small>
      </article>
    </section>
  );
}

function ProjectionVarianceSummary({
  projections,
  displaySettings,
}: ProjectionVarianceSummaryProps) {
  const money = (value: number) =>
    formatCurrency(value, displaySettings.currencyDisplay);

  return (
    <section className="projection-result-summary" aria-label="Forecasted variance">
      <div className="section-heading compact">
        <div>
          <p className="eyebrow">Forecasted Position</p>
          <h3>After Current Action Plan</h3>
        </div>
      </div>
      <div className="projection-summary-grid">
        {PERIOD_KEYS.map((period) => (
          <div className="projection-summary" key={period}>
            <span>{PERIOD_LABELS[period]} Forecasted Variance</span>
            <strong
              className={
                projections[period].projectedRemainingGap > 0
                  ? 'negative-value'
                  : 'positive-value'
              }
            >
              {money(projections[period].projectedRemainingGap)}
            </strong>
            <small>{projections[period].projectedStatus}</small>
          </div>
        ))}
      </div>
    </section>
  );
}

interface AnalystBriefingPanelProps {
  briefing: VyntaxAnalystBriefing;
}

function AnalystBriefingPanel({ briefing }: AnalystBriefingPanelProps) {
  return (
    <section
      className={`analyst-briefing analyst-briefing--${briefing.tone}`}
      aria-label="Vyntax operating read"
    >
      <div className="analyst-briefing-main">
        <p className="eyebrow">Operating Read</p>
        <h2>{briefing.headline}</h2>
        <p>{briefing.summary}</p>
        <strong>{briefing.primaryRecommendation}</strong>
      </div>
      <dl className="analyst-evidence-grid">
        {briefing.evidence.map((item) => (
          <div className={`analyst-evidence analyst-evidence--${item.tone}`} key={item.label}>
            <dt>{item.label}</dt>
            <dd>{item.value}</dd>
            <small>{item.detail}</small>
          </div>
        ))}
      </dl>
      <div className="analyst-next-steps">
        <div>
          <span>Confidence</span>
          <strong>{briefing.confidence}</strong>
          <small>{briefing.confidenceReason}</small>
        </div>
        <ol>
          {briefing.nextSteps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </div>
    </section>
  );
}

interface DemoModeGuideProps {
  activeWorkflowStep: WorkflowStepKey;
  briefing: VyntaxAnalystBriefing;
  onCreateSnapshot: () => void;
  onGoToStep: (step: WorkflowStepKey) => void;
}

const DEMO_GUIDE_ACTIONS: Array<{
  label: string;
  helper: string;
  step: WorkflowStepKey;
}> = [
  {
    label: 'Review Results',
    helper: 'See GOP, flow-through, weekly variance, and forecast.',
    step: 'results',
  },
  {
    label: 'Open Action Plan',
    helper: 'Use the current recovery read or edit the plan.',
    step: 'actionPlan',
  },
  {
    label: 'Try Inputs',
    helper: 'Change revenue, expenses, GOP, dates, or flow-through.',
    step: 'numbers',
  },
  {
    label: 'Send Snapshot',
    helper: 'Preview the operator-ready summary.',
    step: 'snapshot',
  },
];

function DemoModeGuide({
  activeWorkflowStep,
  briefing,
  onCreateSnapshot,
  onGoToStep,
}: DemoModeGuideProps) {
  return (
    <section className="demo-guide no-print" aria-label="Demo mode guide">
      <div className="demo-guide-main">
        <p className="eyebrow">Paid Pilot Demo</p>
        <h2>Hotel GOP command center is live.</h2>
        <p>
          Vyntax turns hotel revenue, expenses, target GOP, weekly operating
          areas, and recovery actions into one operating read and a sendable
          snapshot.
        </p>
        <div className="demo-guide-assurance">
          Manual inputs stay editable. Change any number and the operating read,
          forecast, action plan, and snapshot update from those inputs.
        </div>
      </div>

      <div className="demo-guide-path">
        {DEMO_GUIDE_ACTIONS.map((action) => {
          const isActive = activeWorkflowStep === action.step;
          return (
            <button
              type="button"
              className={isActive ? 'demo-guide-step is-active' : 'demo-guide-step'}
              key={action.step}
              onClick={() => {
                onGoToStep(action.step);
                if (action.step === 'snapshot') onCreateSnapshot();
              }}
            >
              <strong>{action.label}</strong>
              <span>{action.helper}</span>
            </button>
          );
        })}
      </div>

      <div className="demo-guide-analyst">
        <span>Operating read</span>
        <strong>{briefing.headline}</strong>
        <small>{briefing.primaryRecommendation}</small>
      </div>
    </section>
  );
}

function createDefaultDisplaySettings(): DisplaySettings {
  return {
    currencyDisplay: 'cents',
    percentageDecimals: 2,
    roundCalculationsToWholeDollars: false,
  };
}

function createId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createEmptyPeriod(): PeriodInput {
  return {
    revenue: 0,
    expenses: 0,
    ...createEmptyExpenseBreakdown(),
    manualGopOverride: false,
    manualGop: 0,
    revenueAccruals: 0,
    expenseAccruals: 0,
    otherGopAdjustments: 0,
    accrualNotes: '',
    useAccrualAdjustedViewForVariance: false,
    targetGopPct: 0,
    targetGopDollarOverrideEnabled: false,
    targetGopDollarOverride: 0,
    budgetedGopPct: null,
    daysRemaining: 0,
    daysRemainingOverride: false,
    flowThroughPct: 0,
    revenuePlan: null,
    gopPlan: null,
    priorYearRevenue: null,
    priorYearExpenses: null,
    priorYearGop: null,
    priorYearGopPct: null,
    workCalculatedGap: null,
    workNotes: '',
    notes: '',
  };
}

function createEmptyDraft(): SnapshotDraft {
  const asOfDate = getTodayIsoDate();
  return {
    weekEnding: formatIsoDate(getUpcomingSunday(parseLocalDate(asOfDate))),
    asOfDate,
    preparedBy: '',
    propertyLocation: '',
    operatorName: '',
    rooms: 0,
    reportingMonth: '',
    reportingView: 'MTD',
    ptdPeriodName: '',
    periodStart: '',
    periodEnd: '',
    daysElapsed: 0,
    reportingDaysRemaining: 0,
    propertyTargetGopPct: 0.3,
    displaySettings: createDefaultDisplaySettings(),
    propertySetup: createDefaultPropertySetup(),
    demoMode: false,
    periods: {
      month: createEmptyPeriod(),
      quarter: createEmptyPeriod(),
      year: createEmptyPeriod(),
    },
    adjustments: [],
  };
}

function migrateAdjustment(adjustment: ProjectionAdjustment): ProjectionAdjustment {
  const legacy = adjustment as ProjectionAdjustment & {
    label?: string;
  };
  const legacyType = String(
    (adjustment as ProjectionAdjustment & { type?: unknown }).type ?? '',
  );
  let type = legacy.type as AdjustmentType;
  let monthImpact = legacy.monthImpact || 0;
  let quarterImpact = legacy.quarterImpact || 0;
  let yearImpact = legacy.yearImpact || 0;

  if (legacyType === 'Expense Saving') type = 'Expense cut / savings';
  if (legacyType === 'Expense Increase') {
    type = 'Other';
    monthImpact = -monthImpact;
    quarterImpact = -quarterImpact;
    yearImpact = -yearImpact;
  }
  if (legacyType === 'Revenue Increase') type = 'Revenue increase';
  if (legacyType === 'Revenue Decrease') {
    type = 'Other';
    monthImpact = -monthImpact;
    quarterImpact = -quarterImpact;
    yearImpact = -yearImpact;
  }

  return {
    id: legacy.id || createId(),
    description: legacy.description || legacy.label || '',
    type,
    monthImpact,
    quarterImpact,
    yearImpact,
    flowThroughPct:
      legacy.flowThroughPct === undefined ? null : legacy.flowThroughPct,
    notes: cleanActionPlanNote(legacy.notes || ''),
    source: legacy.source === 'recommended' ? 'recommended' : 'manual',
    recommendationId: legacy.recommendationId,
  };
}

function normalizeDraft(draft: SnapshotDraft | null): SnapshotDraft {
  if (!draft) return createEmptyDraft();
  const fallback = createEmptyDraft();

  return {
    ...fallback,
    ...draft,
    weekEnding: draft.weekEnding || fallback.weekEnding,
    asOfDate: draft.asOfDate || fallback.asOfDate,
    demoMode: Boolean(draft.demoMode),
    displaySettings: {
      ...createDefaultDisplaySettings(),
      ...draft.displaySettings,
    },
    propertySetup: normalizePropertySetup(draft.propertySetup),
    periods: {
      month: { ...createEmptyPeriod(), ...draft.periods?.month },
      quarter: { ...createEmptyPeriod(), ...draft.periods?.quarter },
      year: { ...createEmptyPeriod(), ...draft.periods?.year },
    },
    adjustments: (draft.adjustments || []).map(migrateAdjustment),
  };
}

function hasDraftContent(draft: SnapshotDraft) {
  const emptyDraft = createEmptyDraft();
  if (
    draft.weekEnding !== emptyDraft.weekEnding ||
    draft.asOfDate !== emptyDraft.asOfDate ||
    draft.preparedBy ||
    draft.propertyLocation ||
    draft.operatorName ||
    draft.rooms !== 0 ||
    draft.reportingMonth ||
    draft.reportingView !== 'MTD' ||
    draft.ptdPeriodName ||
    draft.periodStart ||
    draft.periodEnd ||
    draft.daysElapsed !== 0 ||
    draft.reportingDaysRemaining !== 0 ||
    draft.propertyTargetGopPct !== 0.3
  ) {
    return true;
  }
  if (draft.adjustments.length > 0) return true;
  if (
    draft.propertySetup.enabledOperatingAreaIds.join('|') !==
    emptyDraft.propertySetup.enabledOperatingAreaIds.join('|')
  ) {
    return true;
  }

  return PERIOD_KEYS.some((period) => {
    const input = draft.periods[period];
    return (
      input.revenue !== 0 ||
      input.expenses !== 0 ||
      input.expenseBreakdownEnabled ||
      EXPENSE_BREAKDOWN_FIELD_KEYS.some((key) => input[key] !== 0) ||
      input.manualGopOverride ||
      input.manualGop !== 0 ||
      input.revenueAccruals !== 0 ||
      input.expenseAccruals !== 0 ||
      input.otherGopAdjustments !== 0 ||
      input.accrualNotes.trim() !== '' ||
      input.useAccrualAdjustedViewForVariance ||
      input.targetGopPct !== 0 ||
      input.targetGopDollarOverrideEnabled ||
      input.targetGopDollarOverride !== 0 ||
      input.budgetedGopPct !== null ||
      input.daysRemaining !== 0 ||
      input.flowThroughPct !== 0 ||
      input.revenuePlan !== null ||
      input.gopPlan !== null ||
      input.priorYearRevenue !== null ||
      input.priorYearExpenses !== null ||
      input.priorYearGop !== null ||
      input.priorYearGopPct !== null ||
      input.workCalculatedGap !== null ||
      input.workNotes.trim() !== '' ||
      input.notes.trim() !== ''
    );
  });
}

export default function App() {
  const initialPublicRoute = getPublicRoute();
  const [publicRoute, setPublicRoute] = useState<PublicRoute>(
    () => initialPublicRoute,
  );
  const [selectedIndustry, setSelectedIndustry] = useState<IndustryKey | null>(
    () => (initialPublicRoute === 'demo' ? 'hotel' : null),
  );
  const [warehouseShift, setWarehouseShift] = useState<WarehouseShiftInput>(
    () => warehouseDemoShift,
  );
  const [draft, setDraft] = useState<SnapshotDraft>(() =>
    initialPublicRoute === 'demo' ? createDemoDraft() : createEmptyDraft(),
  );
  const [savedSnapshots, setSavedSnapshots] = useState<SavedSnapshot[]>([]);
  const [feedback, setFeedback] = useState<Feedback>({
    kind: 'info',
    message: 'Local desktop pilot ready',
  });
  const [storageReady, setStorageReady] = useState(false);
  const [isArchiveOpen, setIsArchiveOpen] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [reportScope, setReportScope] = useState<SnapshotReportScope>('weekly');
  const [isSnapshotPreviewOpen, setIsSnapshotPreviewOpen] = useState(false);
  const [snapshotGeneratedAt, setSnapshotGeneratedAt] = useState<Date | null>(null);
  const [activeWorkflowStep, setActiveWorkflowStep] =
    useState<WorkflowStepKey>(() =>
      initialPublicRoute === 'demo' ? 'results' : 'setup',
    );
  const [aiSettings, setAiSettings] = useState<AiSettings>(() =>
    createDefaultAiSettings(),
  );
  const [isAiBusy, setIsAiBusy] = useState(false);
  const periodDateContexts = useMemo(() => buildPeriodDateContexts(draft), [draft]);
  const selectedDateContext = useMemo(
    () => getSelectedReportingDateContext(draft),
    [draft],
  );
  const effectivePeriods = useMemo(
    () =>
      Object.fromEntries(
        PERIOD_KEYS.map((period) => {
          const input = draft.periods[period];
          return [
            period,
            {
              ...input,
              daysRemaining: input.daysRemainingOverride
                ? input.daysRemaining
                : period === 'month' && draft.reportingView === 'PTD'
                  ? selectedDateContext.daysRemaining
                  : periodDateContexts[period].daysRemaining,
            },
          ];
        }),
      ) as Record<PeriodKey, PeriodInput>,
    [draft.periods, draft.reportingView, periodDateContexts, selectedDateContext],
  );
  const reportingPeriodKey = getReportingPeriodKey(draft.reportingView);

  const calculations = useMemo(
    () =>
      Object.fromEntries(
        PERIOD_KEYS.map((period) => [
          period,
          calculatePeriod(effectivePeriods[period], {
            roundCalculationsToWholeDollars:
              draft.displaySettings.roundCalculationsToWholeDollars,
          }),
        ]),
      ) as Record<PeriodKey, PeriodCalculation>,
    [
      draft.displaySettings.roundCalculationsToWholeDollars,
      effectivePeriods,
    ],
  );

  const projections = useMemo(
    () =>
      Object.fromEntries(
        PERIOD_KEYS.map((period) => [
          period,
          calculateProjection(
            period,
            effectivePeriods[period],
            draft.adjustments,
            {
              roundCalculationsToWholeDollars:
                draft.displaySettings.roundCalculationsToWholeDollars,
            },
          ),
        ]),
      ) as Record<PeriodKey, ProjectionCalculation>,
    [
      draft.adjustments,
      draft.displaySettings.roundCalculationsToWholeDollars,
      effectivePeriods,
    ],
  );
  const analystBriefing = useMemo(
    () =>
      buildVyntaxAnalystBriefing({
        draft,
        periodInputs: effectivePeriods,
        calculations,
        projections,
        reportingPeriodKey,
      }),
    [calculations, draft, effectivePeriods, projections, reportingPeriodKey],
  );

  useEffect(() => {
    function syncRoute() {
      setPublicRoute(getPublicRoute());
    }

    window.addEventListener('hashchange', syncRoute);
    return () => window.removeEventListener('hashchange', syncRoute);
  }, []);

  useEffect(() => {
    if (publicRoute === 'demo') {
      loadPublicHotelDemo();
      return;
    }

    if (publicRoute === 'app') {
      setSelectedIndustry(null);
      setFeedback({
        kind: 'info',
        message: 'Choose a workspace',
      });
    }
  }, [publicRoute]);

  useEffect(() => {
    let cancelled = false;

    loadAiSettings()
      .then((settings) => {
        if (!cancelled && settings) {
          setAiSettings({
            ...createDefaultAiSettings(),
            ...settings,
          });
        }
      })
      .catch((error) => console.error(error));

    async function hydrate() {
      try {
        if (getPublicRoute() === 'demo') {
          if (cancelled) return;
          loadPublicHotelDemo();
          setSavedSnapshots([]);
          setFeedback({
            kind: 'success',
            message: 'Browser demo loaded',
          });
          return;
        }

        const [loadedDraft, snapshots] = await Promise.all([
          loadDraft(),
          loadSavedSnapshots(),
        ]);
        if (cancelled) return;
        setDraft(normalizeDraft(loadedDraft));
        setSavedSnapshots(snapshots.map((snapshot) => normalizeDraft(snapshot) as SavedSnapshot));
        setFeedback({
          kind: 'success',
          message: loadedDraft ? 'Loaded saved draft' : 'Ready for a new snapshot',
        });
      } catch (error) {
        console.error(error);
        if (!cancelled) {
          setFeedback({
            kind: 'warning',
            message: 'Storage load failed. Browser fallback remains available.',
          });
        }
      } finally {
        if (!cancelled) setStorageReady(true);
      }
    }

    hydrate();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!storageReady || publicRoute === 'landing' || publicRoute === 'demo') {
      return undefined;
    }

    const autosave = window.setTimeout(() => {
      saveDraft(draft).catch((error) => {
        console.error(error);
        setFeedback({ kind: 'error', message: 'Autosave failed' });
      });
    }, 350);

    return () => window.clearTimeout(autosave);
  }, [draft, publicRoute, storageReady]);

  useEffect(() => {
    if (!isTauriRuntime()) return undefined;
    let active = true;
    let unlisten: (() => void) | undefined;

    import('@tauri-apps/api/event')
      .then(({ listen }) =>
        listen<string>('vyntax-menu', (event) => {
          if (event.payload === 'save-snapshot') void handleSave();
          if (event.payload === 'export-csv') void handleExportCsv();
          if (event.payload === 'print') handlePrintSnapshot();
          if (event.payload === 'about') setShowAbout(true);
        }),
      )
      .then((cleanup) => {
        if (active) {
          unlisten = cleanup;
        } else {
          cleanup();
        }
      })
      .catch((error) => console.error(error));

    return () => {
      active = false;
      if (unlisten) unlisten();
    };
  }, [draft, calculations, projections]);

  function updateHeader<K extends keyof SnapshotDraft>(
    field: K,
    value: SnapshotDraft[K],
  ) {
    if (field === 'asOfDate' && typeof value === 'string') {
      setDraft((current) => ({
        ...current,
        asOfDate: value,
        weekEnding: formatIsoDate(getUpcomingSunday(parseLocalDate(value))),
      }));
      return;
    }

    if (field === 'propertyTargetGopPct' && typeof value === 'number') {
      setDraft((current) => ({
        ...current,
        propertyTargetGopPct: value,
        periods: {
          month: { ...current.periods.month, targetGopPct: value },
          quarter: { ...current.periods.quarter, targetGopPct: value },
          year: { ...current.periods.year, targetGopPct: value },
        },
      }));
      return;
    }

    setDraft((current) => ({ ...current, [field]: value }));
  }

  function updatePeriod<K extends keyof PeriodInput>(
    period: PeriodKey,
    field: K,
    value: PeriodInput[K],
  ) {
    setDraft((current) => ({
      ...current,
      periods: {
        ...current.periods,
        [period]: {
          ...current.periods[period],
          [field]: value,
        },
      },
    }));
  }

  function updateDisplaySettings<K extends keyof DisplaySettings>(
    field: K,
    value: DisplaySettings[K],
  ) {
    setDraft((current) => ({
      ...current,
      displaySettings: {
        ...current.displaySettings,
        [field]: value,
      },
    }));
  }

  async function handleForgetAiSettings() {
    try {
      await clearAiSettings();
      setAiSettings(createDefaultAiSettings());
      setFeedback({ kind: 'success', message: 'Plan Assist access cleared' });
    } catch (error) {
      console.error(error);
      setFeedback({ kind: 'error', message: 'Plan Assist access clear failed' });
    }
  }

  async function handleImportPlanAssistAccess(fileText: string) {
    try {
      const settings = parsePlanAssistAccessFile(fileText);
      setAiSettings(settings);
      await saveAiSettings(settings);
      setFeedback({
        kind: 'success',
        message: 'Plan Assist access imported',
      });
    } catch (error) {
      console.error(error);
      setFeedback({
        kind: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'Plan Assist access import failed',
      });
    }
  }

  function updatePropertySetup(propertySetup: PropertySetupModel) {
    setDraft((current) => ({
      ...current,
      propertySetup: normalizePropertySetup(propertySetup),
    }));
  }

  function addAdjustment() {
    const adjustment: ProjectionAdjustment = {
      id: createId(),
      description: '',
      type: 'Expense cut / savings',
      monthImpact: 0,
      quarterImpact: 0,
      yearImpact: 0,
      flowThroughPct: null,
      notes: '',
      source: 'manual',
    };

    setDraft((current) => ({
      ...current,
      adjustments: [...current.adjustments, adjustment],
    }));
  }

  function generateActionPlan() {
    const manualAdjustments = draft.adjustments.filter(
      (adjustment) => adjustment.source !== 'recommended',
    );
    const manualProjections = Object.fromEntries(
      PERIOD_KEYS.map((period) => [
        period,
        calculateProjection(period, effectivePeriods[period], manualAdjustments, {
          roundCalculationsToWholeDollars:
            draft.displaySettings.roundCalculationsToWholeDollars,
        }),
      ]),
    ) as Record<PeriodKey, ProjectionCalculation>;
    const recommendations = generateActionPlanRecommendations({
      draft: {
        ...draft,
        adjustments: manualAdjustments,
      },
      periodInputs: effectivePeriods,
      calculations,
      projections: manualProjections,
      reportingPeriodKey,
    });
    const generatedAdjustments = recommendations.map((recommendation) => ({
      id: createId(),
      ...recommendation,
    }));

    setDraft((current) => ({
      ...current,
      adjustments: [
        ...current.adjustments.filter(
          (adjustment) => adjustment.source !== 'recommended',
        ),
        ...generatedAdjustments,
      ],
    }));
    setFeedback({
      kind: recommendations.length > 0 ? 'success' : 'info',
      message:
        recommendations.length > 0
          ? `Suggested ${recommendations.length} recovery action${
              recommendations.length === 1 ? '' : 's'
            }`
          : 'No recovery actions needed from the current numbers',
    });
  }

  async function buildEnhancedActionPlan() {
    const apiKey = aiSettings.apiKey.trim();
    if (!apiKey) {
      generateActionPlan();
      return;
    }

    const manualAdjustments = draft.adjustments.filter(
      (adjustment) => adjustment.source !== 'recommended',
    );
    const manualProjections = Object.fromEntries(
      PERIOD_KEYS.map((period) => [
        period,
        calculateProjection(period, effectivePeriods[period], manualAdjustments, {
          roundCalculationsToWholeDollars:
            draft.displaySettings.roundCalculationsToWholeDollars,
        }),
      ]),
    ) as Record<PeriodKey, ProjectionCalculation>;
    const baseRecommendations = generateActionPlanRecommendations({
      draft: {
        ...draft,
        adjustments: manualAdjustments,
      },
      periodInputs: effectivePeriods,
      calculations,
      projections: manualProjections,
      reportingPeriodKey,
    });

    if (baseRecommendations.length === 0) {
      setFeedback({
        kind: 'info',
        message: 'No enhanced action plan needed from the current numbers',
      });
      return;
    }

    const payload = buildAiActionPlanRequest(
      {
        ...draft,
        adjustments: manualAdjustments,
      },
      effectivePeriods,
      calculations,
      manualProjections,
      reportingPeriodKey,
      baseRecommendations,
    );

    setIsAiBusy(true);
    setFeedback({ kind: 'info', message: 'Building action plan...' });
    try {
      const aiDraft = await draftAiActionPlan(aiSettings, payload);
      const polishedRecommendations = mergeAiActionPlanDraft(
        baseRecommendations,
        aiDraft,
      );
      const generatedAdjustments = toProjectionAdjustments(
        polishedRecommendations,
        createId,
      );

      setDraft((current) => ({
        ...current,
        adjustments: [
          ...current.adjustments.filter(
            (adjustment) => adjustment.source !== 'recommended',
          ),
          ...generatedAdjustments,
        ],
      }));
      setFeedback({
        kind: 'success',
        message: 'Action plan built',
      });
    } catch (error) {
      console.error(error);
      const fallbackAdjustments = toProjectionAdjustments(
        baseRecommendations,
        createId,
      );
      setDraft((current) => ({
        ...current,
        adjustments: [
          ...current.adjustments.filter(
            (adjustment) => adjustment.source !== 'recommended',
          ),
          ...fallbackAdjustments,
        ],
      }));
      setFeedback({
        kind: 'warning',
        message: 'Enhanced planning failed; local suggestions were added',
      });
    } finally {
      setIsAiBusy(false);
    }
  }

  function updateAdjustment<K extends keyof ProjectionAdjustment>(
    id: string,
    field: K,
    value: ProjectionAdjustment[K],
  ) {
    setDraft((current) => ({
      ...current,
      adjustments: current.adjustments.map((adjustment) =>
        adjustment.id === id ? { ...adjustment, [field]: value } : adjustment,
      ),
    }));
  }

  function deleteAdjustment(id: string) {
    setDraft((current) => ({
      ...current,
      adjustments: current.adjustments.filter((adjustment) => adjustment.id !== id),
    }));
  }

  async function refreshSavedSnapshots() {
    setSavedSnapshots(await loadSavedSnapshots());
  }

  async function handleSave() {
    try {
      const snapshot = await saveSnapshot(draft);
      setDraft(snapshot);
      await refreshSavedSnapshots();
      setFeedback({
        kind: 'success',
        message: `Saved ${new Date().toLocaleTimeString()}`,
      });
    } catch (error) {
      console.error(error);
      setFeedback({ kind: 'error', message: 'Save failed' });
    }
  }

  async function handleLoad(snapshot: SavedSnapshot) {
    try {
      const loaded = normalizeDraft(snapshot);
      setDraft(loaded);
      await saveDraft(loaded);
      setFeedback({
        kind: 'success',
        message: `Loaded ${snapshot.weekEnding || 'snapshot'}`,
      });
    } catch (error) {
      console.error(error);
      setFeedback({ kind: 'error', message: 'Load failed' });
    }
  }

  async function handleDeleteSnapshot(id: string) {
    try {
      await deleteSnapshot(id);
      await refreshSavedSnapshots();
      setDraft((current) =>
        current.id === id ? { ...current, id: undefined } : current,
      );
      setFeedback({ kind: 'success', message: 'Deleted snapshot' });
    } catch (error) {
      console.error(error);
      setFeedback({ kind: 'error', message: 'Delete failed' });
    }
  }

  function loadPublicHotelDemo() {
    setSelectedIndustry('hotel');
    setDraft(createDemoDraft());
    setActiveWorkflowStep('results');
    setIsSnapshotPreviewOpen(false);
    setSnapshotGeneratedAt(null);
    setReportScope('weekly');
    setFeedback({
      kind: 'success',
      message: 'Browser demo loaded',
    });
  }

  function openPublicRoute(route: PublicRoute) {
    if (route === 'landing') {
      window.history.pushState(null, '', window.location.pathname);
      setPublicRoute('landing');
      return;
    }

    if (window.location.hash !== `#${route}`) {
      window.location.hash = route;
    }
    setPublicRoute(route);

    if (route === 'demo') {
      loadPublicHotelDemo();
      return;
    }

    setSelectedIndustry(null);
    setFeedback({
      kind: 'info',
      message: 'Choose a workspace',
    });
  }

  async function handleReset() {
    try {
      const nextDraft = createEmptyDraft();
      await clearDraft();
      setDraft(nextDraft);
      setFeedback({ kind: 'success', message: 'Draft reset' });
    } catch (error) {
      console.error(error);
      setFeedback({ kind: 'error', message: 'Reset failed' });
    }
  }

  function handleLoadDemoMode() {
    if (
      hasDraftContent(draft) &&
      !window.confirm(
        'Load Demo Mode and overwrite the current draft? Saved snapshots will not be deleted.',
      )
    ) {
      setFeedback({ kind: 'info', message: 'Demo Mode cancelled' });
      return;
    }

    setDraft(createDemoDraft());
    setActiveWorkflowStep('results');
    setIsSnapshotPreviewOpen(false);
    setSnapshotGeneratedAt(null);
    setReportScope('weekly');
    setFeedback({
      kind: 'success',
      message: 'Demo Mode live: results, action plan, and snapshot are ready',
    });
  }

  async function handleExitDemoMode() {
    await handleReset();
    setFeedback({ kind: 'success', message: 'Demo Mode cleared' });
  }

  async function handleExportCsv() {
    try {
      const result = await exportSnapshotCsv(draft, calculations, projections);
      if (result.cancelled) {
        setFeedback({ kind: 'info', message: 'Export cancelled' });
        return;
      }
      setFeedback({ kind: 'success', message: 'Export successful' });
    } catch (error) {
      console.error(error);
      setFeedback({ kind: 'error', message: 'Export failed' });
    }
  }

  async function handleCopySummary() {
    try {
      await copyWeeklySummary(draft, calculations, projections, reportScope);
      setFeedback({ kind: 'success', message: 'Copied summary' });
    } catch (error) {
      console.error(error);
      setFeedback({ kind: 'error', message: 'Copy summary failed' });
    }
  }

  function handleCreateSnapshotPreview() {
    setActiveWorkflowStep('snapshot');
    setSnapshotGeneratedAt(new Date());
    setIsSnapshotPreviewOpen(true);
    setFeedback({ kind: 'success', message: 'Snapshot preview ready' });
  }

  function handlePrintSnapshot() {
    setActiveWorkflowStep('snapshot');
    setSnapshotGeneratedAt(new Date());
    setIsSnapshotPreviewOpen(true);
    setFeedback({ kind: 'info', message: 'Opening snapshot preview for print' });
    window.setTimeout(() => window.print(), 150);
  }

  const activeWorkflowStepIndex = WORKFLOW_STEPS.findIndex(
    (step) => step.key === activeWorkflowStep,
  );
  const activeWorkflowStepMeta =
    WORKFLOW_STEPS[activeWorkflowStepIndex] ?? WORKFLOW_STEPS[0];
  const previousWorkflowStep =
    activeWorkflowStepIndex > 0
      ? WORKFLOW_STEPS[activeWorkflowStepIndex - 1]
      : null;
  const nextWorkflowStep =
    activeWorkflowStepIndex >= 0 &&
    activeWorkflowStepIndex < WORKFLOW_STEPS.length - 1
      ? WORKFLOW_STEPS[activeWorkflowStepIndex + 1]
      : null;

  useEffect(() => {
    if (activeWorkflowStep !== 'snapshot' && isArchiveOpen) {
      setIsArchiveOpen(false);
    }
  }, [activeWorkflowStep, isArchiveOpen]);

  if (publicRoute === 'landing') {
    return (
      <div className="app-shell app-shell--public">
        <PublicLanding
          onOpenApp={() => openPublicRoute('app')}
          onOpenDemo={() => openPublicRoute('demo')}
        />
      </div>
    );
  }

  if (selectedIndustry === null) {
    return (
      <div className="app-shell app-shell--home">
        <IndustryHome onSelect={setSelectedIndustry} />
      </div>
    );
  }

  if (selectedIndustry === 'warehouse') {
    return (
      <div className="app-shell app-shell--warehouse">
        <WarehouseShiftPlanner
          shift={warehouseShift}
          onChange={setWarehouseShift}
          onChangeIndustry={() => setSelectedIndustry(null)}
        />
      </div>
    );
  }

  if (selectedIndustry === 'custom') {
    return (
      <div className="app-shell app-shell--home">
        <IndustryPlaceholder
          industryLabel="Custom"
          onChangeIndustry={() => setSelectedIndustry(null)}
        />
      </div>
    );
  }

  return (
    <div className="app-shell">
      <Header
        draft={draft}
        isDemoMode={Boolean(draft.demoMode)}
        onChange={updateHeader}
      />
      <Controls
        feedback={feedback}
        isDesktop={isTauriRuntime()}
        isDemoMode={Boolean(draft.demoMode)}
        onLoadDemoMode={handleLoadDemoMode}
        onExitDemoMode={() => void handleExitDemoMode()}
        onSave={() => void handleSave()}
        onExportCsv={() => void handleExportCsv()}
        onPrint={handlePrintSnapshot}
        onCopySummary={() => void handleCopySummary()}
        onAbout={() => setShowAbout(true)}
        onReset={() => void handleReset()}
      />

      <div className="top-utility-row no-print">
        <div className="top-utility-group">
          <div
            className="data-mode-note"
            title={
              draft.demoMode
                ? 'Demo numbers loaded; manual inputs remain editable'
                : 'No live data connected'
            }
            aria-label={
              draft.demoMode
                ? 'Demo Mode Live. Manual inputs remain editable.'
                : 'Manual Input Mode. No live data connected.'
            }
          >
            <span>{draft.demoMode ? 'Demo data active' : 'Manual entry'}</span>
            <small>
              {draft.demoMode ? 'Inputs remain editable' : 'No live data connected'}
            </small>
          </div>

          <button
            type="button"
            className="secondary-button industry-change-button"
            onClick={() => setSelectedIndustry(null)}
          >
            Change Industry
          </button>
        </div>

        <details className="display-settings-menu">
          <summary>Display Settings</summary>
          <div className="display-settings">
            <label>
              <span>Currency Display</span>
              <select
                value={draft.displaySettings.currencyDisplay}
                onChange={(event) =>
                  updateDisplaySettings(
                    'currencyDisplay',
                    event.target.value as DisplaySettings['currencyDisplay'],
                  )
                }
              >
                <option value="cents">Cents</option>
                <option value="whole">Whole dollars</option>
              </select>
            </label>
            <label>
              <span>Percentage Display</span>
              <select
                value={draft.displaySettings.percentageDecimals}
                onChange={(event) =>
                  updateDisplaySettings(
                    'percentageDecimals',
                    Number(event.target.value) as DisplaySettings['percentageDecimals'],
                  )
                }
              >
                <option value={1}>1 decimal</option>
                <option value={2}>2 decimals</option>
              </select>
            </label>
            <label className="checkbox-field compact-checkbox">
              <input
                type="checkbox"
                checked={draft.displaySettings.roundCalculationsToWholeDollars}
                onChange={(event) =>
                  updateDisplaySettings(
                    'roundCalculationsToWholeDollars',
                    event.target.checked,
                  )
                }
              />
              <span>Round calculations to whole dollars</span>
            </label>
            {draft.displaySettings.roundCalculationsToWholeDollars ? (
              <p className="rounding-warning">
                Calculation rounding can create small differences from source
                systems.
              </p>
            ) : null}
          </div>
        </details>
      </div>

      {draft.demoMode ? (
        <DemoModeGuide
          activeWorkflowStep={activeWorkflowStep}
          briefing={analystBriefing}
          onCreateSnapshot={handleCreateSnapshotPreview}
          onGoToStep={setActiveWorkflowStep}
        />
      ) : null}

      <main className="dashboard-layout no-print">
        <div className="workspace">
          <section className="workflow-shell" aria-label="Vyntax workflow">
            <div className="workflow-stepper" aria-label="Workflow steps">
              {WORKFLOW_STEPS.map((step, index) => {
                const isActive = step.key === activeWorkflowStep;
                return (
                  <button
                    type="button"
                    key={step.key}
                    className={isActive ? 'workflow-step active' : 'workflow-step'}
                    aria-current={isActive ? 'step' : undefined}
                    onClick={() => setActiveWorkflowStep(step.key)}
                  >
                    <span className="workflow-step-count">Step {index + 1}</span>
                    <span className="workflow-step-label">{step.label}</span>
                    <small>{step.helper}</small>
                  </button>
                );
              })}
            </div>
          </section>

          {activeWorkflowStep === 'setup' ? (
            <section
              className="workflow-panel workflow-panel--setup"
              aria-labelledby="workflow-setup-heading"
            >
              <div className="workflow-panel-heading">
                <div>
                  <p className="eyebrow">Step 1</p>
                  <h2 id="workflow-setup-heading">Setup</h2>
                  <p className="section-subtitle">
                    Confirm the reporting view, property profile, and local data
                    readiness.
                  </p>
                </div>
              </div>
              <ReportingViewSelector draft={draft} onChange={updateHeader} />
              <PropertySetup
                setup={draft.propertySetup}
                onChange={updatePropertySetup}
              />
              <DataSources />
            </section>
          ) : null}

          {activeWorkflowStep === 'numbers' ? (
            <section
              className="workflow-panel manual-entry-section"
              aria-labelledby="manual-period-inputs-heading"
            >
              <div className="workflow-panel-heading">
                <div>
                  <p className="eyebrow">Step 2</p>
                  <h2 id="manual-period-inputs-heading">Enter Numbers</h2>
                  <p className="section-subtitle">
                    Start with the core Month, Quarter, and Year fields. Open
                    More inputs only for payroll detail, accruals, flow-through
                    checks, YoY, or work comparison.
                  </p>
                </div>
              </div>

              <section className="period-grid" aria-label="Period performance">
                {PERIOD_KEYS.map((period) => (
                  <PeriodCard
                    key={period}
                    label={getPeriodDisplayLabel(period, draft.reportingView)}
                    periodKey={period}
                    input={draft.periods[period]}
                    effectiveInput={effectivePeriods[period]}
                    calculation={calculations[period]}
                    projection={projections[period]}
                    dateContext={
                      period === 'month' && draft.reportingView === 'PTD'
                        ? selectedDateContext
                        : periodDateContexts[period]
                    }
                    displaySettings={draft.displaySettings}
                    onChange={updatePeriod}
                  />
                ))}
              </section>
            </section>
          ) : null}

          {activeWorkflowStep === 'results' ? (
            <section
              className="workflow-panel performance-summary-section"
              aria-labelledby="performance-summary-heading"
            >
              <div className="workflow-panel-heading">
                <div>
                  <p className="eyebrow">Step 3</p>
                  <h2 id="performance-summary-heading">Review Results</h2>
                  <p className="section-subtitle">
                    See where the property stands before building the recovery
                    plan.
                  </p>
                </div>
              </div>

              <AnalystBriefingPanel briefing={analystBriefing} />

              <ExecutiveSummaryCard
                calculation={calculations[reportingPeriodKey]}
                projection={projections[reportingPeriodKey]}
                dateContext={selectedDateContext}
                reportingView={draft.reportingView}
                ptdPeriodName={draft.ptdPeriodName}
              />

              <ResultsFlowThroughKpis
                input={effectivePeriods[reportingPeriodKey]}
                calculation={calculations[reportingPeriodKey]}
                displaySettings={draft.displaySettings}
              />

              <ProjectionVarianceSummary
                projections={projections}
                displaySettings={draft.displaySettings}
              />

              <GopCommandCenter
                periodInput={effectivePeriods[reportingPeriodKey]}
                calculation={calculations[reportingPeriodKey]}
                projection={projections[reportingPeriodKey]}
                dateContext={selectedDateContext}
                reportingView={draft.reportingView}
                ptdPeriodName={draft.ptdPeriodName}
                propertyName={draft.propertyLocation}
                operatorName={draft.operatorName}
                rooms={draft.rooms}
                reportingMonth={draft.reportingMonth}
                targetGopPct={draft.propertyTargetGopPct}
                enabledOperatingAreaIds={draft.propertySetup.enabledOperatingAreaIds}
              />
            </section>
          ) : null}

          {activeWorkflowStep === 'actionPlan' ? (
            <section
              className="workflow-panel workflow-panel--action-plan"
              aria-labelledby="workflow-action-plan-heading"
            >
              <div className="visually-hidden">
                <h2 id="workflow-action-plan-heading">Action Plan</h2>
              </div>
              <ProjectionTable
                adjustments={draft.adjustments}
                analystBriefing={analystBriefing}
                hasPlanAssistAccess={aiSettings.apiKey.trim() !== ''}
                isPlanAssistBusy={isAiBusy}
                onAdd={addAdjustment}
                onBuildActionPlan={() => void buildEnhancedActionPlan()}
                onClearPlanAssistAccess={() => void handleForgetAiSettings()}
                onDelete={deleteAdjustment}
                onImportPlanAssistAccess={(fileText) =>
                  void handleImportPlanAssistAccess(fileText)
                }
                onUpdate={updateAdjustment}
              />
            </section>
          ) : null}

          {activeWorkflowStep === 'snapshot' ? (
            <section
              className="workflow-panel workflow-panel--snapshot"
              aria-labelledby="snapshot-preview-heading"
            >
              <section
                className="snapshot-preview-launcher"
                aria-label="Snapshot preview controls"
              >
                <div>
                  <p className="eyebrow">Step 5</p>
                  <h2 id="snapshot-preview-heading">Send Snapshot</h2>
                  <p>
                    Pick a sendable snapshot type, then generate the preview
                    when it is time to print, export PDF, or copy the summary.
                  </p>
                </div>
                <div className="snapshot-launcher-tools">
                  <div className="snapshot-scope-options">
                    {SNAPSHOT_REPORT_SCOPES.map((scope) => (
                      <button
                        type="button"
                        className={
                          scope.key === reportScope ? 'active-scope' : undefined
                        }
                        key={scope.key}
                        onClick={() => setReportScope(scope.key)}
                      >
                        <span>{scope.label}</span>
                        <small>{scope.helper}</small>
                      </button>
                    ))}
                  </div>
                  <div className="snapshot-preview-actions">
                    <button
                      type="button"
                      className="primary-button"
                      onClick={handleCreateSnapshotPreview}
                    >
                      {isSnapshotPreviewOpen ? 'Refresh Preview' : 'Create Preview'}
                    </button>
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={handlePrintSnapshot}
                    >
                      Print / Export PDF
                    </button>
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => void handleCopySummary()}
                    >
                      Copy Summary
                    </button>
                    {isSnapshotPreviewOpen ? (
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => setIsSnapshotPreviewOpen(false)}
                      >
                        Hide Preview
                      </button>
                    ) : null}
                  </div>
                </div>
              </section>

              <div className="snapshot-archive-slot">
                <div>
                  <p className="eyebrow">Local Archive</p>
                  <h3>Saved snapshots</h3>
                  <p>
                    Load or remove saved snapshots from this computer when you
                    are preparing a new sendable report.
                  </p>
                </div>
                <SavedSnapshots
                  activeId={draft.id}
                  isOpen={isArchiveOpen}
                  snapshots={savedSnapshots}
                  onClose={() => setIsArchiveOpen(false)}
                  onOpen={() => setIsArchiveOpen(true)}
                  onLoad={(snapshot) => {
                    void handleLoad(snapshot);
                    setIsArchiveOpen(false);
                  }}
                  onDelete={(id) => void handleDeleteSnapshot(id)}
                />
              </div>
            </section>
          ) : null}

          <nav className="workflow-footer" aria-label="Workflow navigation">
            <button
              type="button"
              className="secondary-button"
              disabled={!previousWorkflowStep}
              onClick={() => {
                if (previousWorkflowStep) {
                  setActiveWorkflowStep(previousWorkflowStep.key);
                }
              }}
            >
              Back
            </button>
            <div>
              <span>{activeWorkflowStepMeta.label}</span>
              <small>{activeWorkflowStepMeta.helper}</small>
            </div>
            {nextWorkflowStep ? (
              <button
                type="button"
                className="primary-button"
                onClick={() => setActiveWorkflowStep(nextWorkflowStep.key)}
              >
                Next: {nextWorkflowStep.label}
              </button>
            ) : (
              <button
                type="button"
                className="secondary-button"
                onClick={() => setActiveWorkflowStep('setup')}
              >
                Back to Setup
              </button>
            )}
          </nav>
        </div>

      </main>

      {activeWorkflowStep === 'snapshot' && isSnapshotPreviewOpen ? (
        <SnapshotReport
          draft={draft}
          calculations={calculations}
          projections={projections}
          generatedAt={snapshotGeneratedAt ?? new Date()}
          reportScope={reportScope}
          showScopeSelector={false}
          summaryText={buildWeeklySummaryText(
            draft,
            calculations,
            projections,
            reportScope,
          )}
          onReportScopeChange={setReportScope}
        />
      ) : null}

      {showAbout ? (
        <div className="modal-backdrop no-print" role="presentation">
          <section className="about-modal" role="dialog" aria-modal="true">
            <p className="eyebrow">About</p>
            <h2>Vyntax</h2>
            <p>Weekly GOP Target Snapshot</p>
            <dl>
              <div>
                <dt>Version</dt>
                <dd>0.1.0</dd>
              </div>
              <div>
                <dt>Mode</dt>
                <dd>Local-first desktop pilot</dd>
              </div>
              <div>
                <dt>Connection</dt>
                <dd>No cloud connection required</dd>
              </div>
            </dl>
            <button
              type="button"
              className="primary-button"
              onClick={() => setShowAbout(false)}
            >
              Close
            </button>
          </section>
        </div>
      ) : null}
    </div>
  );
}
