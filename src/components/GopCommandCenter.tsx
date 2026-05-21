import {
  formatCurrency,
  formatPercent,
  formatSignedCurrency,
} from '../domain/formatters';
import { formatDisplayDate } from '../domain/datePeriods';
import {
  getMeterPosition,
  getPropertyPerformanceStatus,
  getProtectionLevel,
  hotelDemoData,
  type ActionDifficulty,
  type LeakSeverity,
  type ProtectionLevel,
  type PropertyPerformanceStatus,
} from '../domain/gopCommandData';
import {
  buildViewPerformanceSentence,
  buildYoySummaryLine,
  type PeriodDateContext,
  getReportingViewLabel,
  getReportingViewTitle,
} from '../domain/reporting';
import type { OperatingAreaId } from '../domain/propertySetup';
import type {
  PeriodCalculation,
  PeriodInput,
  ProjectionCalculation,
  ReportingView,
} from '../domain/types';
import { WeeklyGopControl } from './WeeklyGopControl';

interface GopCommandCenterProps {
  periodInput: PeriodInput;
  calculation: PeriodCalculation;
  projection: ProjectionCalculation;
  dateContext: PeriodDateContext;
  reportingView: ReportingView;
  ptdPeriodName: string;
  propertyName: string;
  operatorName: string;
  rooms: number;
  reportingMonth: string;
  targetGopPct: number;
  enabledOperatingAreaIds: OperatingAreaId[];
}

interface ExecutiveSummaryCardProps {
  calculation: PeriodCalculation;
  projection: ProjectionCalculation;
  dateContext: PeriodDateContext;
  reportingView: ReportingView;
  ptdPeriodName: string;
}

function classToken(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

function performanceText(level: ProtectionLevel) {
  return level;
}

function statusClass(status: PropertyPerformanceStatus) {
  if (status === 'Behind') return 'behind';
  if (status === 'On Target') return 'on-target';
  return 'ahead';
}

function severityClass(severity: LeakSeverity) {
  if (severity === 'High') return 'needs-recovery';
  if (severity === 'Medium') return 'below-plan';
  return 'above-plan';
}

function difficultyClass(difficulty: ActionDifficulty) {
  if (difficulty === 'High') return 'needs-recovery';
  if (difficulty === 'Medium') return 'below-plan';
  return 'above-plan';
}

function varianceSummary(calculation: PeriodCalculation) {
  if (calculation.dollarGap > 1) {
    return `Behind by ${formatCurrency(calculation.dollarGap)}`;
  }

  if (calculation.dollarGap < -1) {
    return `Ahead by ${formatCurrency(Math.abs(calculation.dollarGap))}`;
  }

  return `On Target ${formatCurrency(0)}`;
}

export function ExecutiveSummaryCard({
  calculation,
  projection,
  dateContext,
  reportingView,
  ptdPeriodName,
}: ExecutiveSummaryCardProps) {
  const executiveSummary = buildViewPerformanceSentence(
    reportingView,
    calculation,
    projection,
  );

  return (
    <article className="executive-summary-card">
      <div>
        <p className="eyebrow">Vyntax Summary</p>
        <h2>{executiveSummary}</h2>
        {reportingView === 'YoY' ? <small>{buildYoySummaryLine(calculation)}</small> : null}
      </div>
      <dl className="executive-summary-meta">
        <div>
          <dt>Reporting View</dt>
          <dd>{getReportingViewLabel(reportingView, ptdPeriodName)}</dd>
        </div>
        <div>
          <dt>Variance</dt>
          <dd>{varianceSummary(calculation)}</dd>
        </div>
        <div>
          <dt>Period Range</dt>
          <dd>{dateContext.periodRangeLabel}</dd>
        </div>
        <div>
          <dt>Next Period Begins</dt>
          <dd>{formatDisplayDate(dateContext.nextPeriodBegins)}</dd>
        </div>
      </dl>
    </article>
  );
}

export function GopCommandCenter({
  periodInput,
  calculation,
  projection,
  dateContext,
  reportingView,
  ptdPeriodName,
  propertyName,
  operatorName,
  rooms,
  reportingMonth: _reportingMonth,
  targetGopPct: _headerTargetGopPct,
  enabledOperatingAreaIds,
}: GopCommandCenterProps) {
  const targetGopPct =
    calculation.targetGopPctUsed || periodInput.targetGopPct || hotelDemoData.targetGopPct;
  const currentRevenue = calculation.actualRevenue;
  const currentGop = calculation.actualGop;
  const currentGopPct = calculation.actualGopPct;
  const gapToTarget = calculation.dollarGap;
  const recoveryNeeded = calculation.gopImprovementNeeded;
  const surplus = Math.max(-calculation.dollarGap, 0);
  const daysLeft = periodInput.daysRemaining;
  const dailyRecoveryNeeded = calculation.dailyRecoveryNeeded;
  const projectedRevenue = projection.projectedRevenue;
  const projectedGop = projection.projectedGop;
  const projectedGopPct =
    projectedRevenue === 0 ? 0 : projectedGop / projectedRevenue;
  const projectedGap = projection.projectedRemainingGap;
  const projectedDollarMiss = Math.max(projectedGap, 0);
  const projectedSurplus = Math.max(-projectedGap, 0);
  const revenueNeeded =
    calculation.revenueNeededAtFlowThrough.achievable
      ? calculation.revenueNeededAtFlowThrough.amount
      : 0;
  const currentProtection = getProtectionLevel(currentGopPct);
  const projectedProtection = getProtectionLevel(projectedGopPct);
  const propertyStatus = getPropertyPerformanceStatus(
    currentGopPct,
    targetGopPct,
  );
  const meterPosition = getMeterPosition(projectedGopPct);
  const viewTitle = getReportingViewTitle(reportingView, ptdPeriodName);
  const viewLabel = getReportingViewLabel(reportingView, ptdPeriodName);
  const monthLabel = dateContext.label;

  const kpis = [
    {
      label: 'Current GOP %',
      value: formatPercent(currentGopPct),
      tone: classToken(currentProtection),
    },
    {
      label: 'Forecasted GOP %',
      value: formatPercent(projectedGopPct),
      tone: classToken(projectedProtection),
    },
    {
      label: 'Target GOP %',
      value: formatPercent(targetGopPct),
      tone: 'neutral',
    },
    {
      label: 'Variance to Target',
      value:
        gapToTarget > 0
          ? `Gap ${formatCurrency(gapToTarget)}`
          : `Surplus ${formatCurrency(surplus)}`,
      tone: gapToTarget > 0 ? 'needs-recovery' : 'above-plan',
    },
    {
      label: 'Days Remaining',
      value: `${daysLeft}`,
      tone: 'neutral',
    },
    {
      label: 'Daily GOP Recovery Needed',
      value: formatCurrency(dailyRecoveryNeeded),
      tone: dailyRecoveryNeeded > 0 ? 'below-plan' : 'above-plan',
    },
  ];

  return (
    <section className="gop-command-center" aria-label="Profit Performance Overview">
      <div className="command-hero">
        <div>
          <p className="eyebrow">Hotel Operating Performance</p>
          <h2>{viewTitle}</h2>
          <p>
            Profit Performance Overview: Monitor GOP performance,
            flow-through, accrual adjustments, and recovery opportunities
            across the month, quarter, and year.
          </p>
        </div>
        <div className={`command-status ${statusClass(propertyStatus)}`}>
          <small>Position</small>
          <strong>{propertyStatus}</strong>
        </div>
      </div>

      <div className="property-command-card">
        <div>
          <span>Property</span>
          <strong>{propertyName || hotelDemoData.property}</strong>
        </div>
        <div>
          <span>Operator</span>
          <strong>{operatorName || hotelDemoData.operator}</strong>
        </div>
        <div>
          <span>Rooms</span>
          <strong>{rooms > 0 ? rooms : 'Not set'}</strong>
        </div>
        <div>
          <span>Target GOP</span>
          <strong>{formatPercent(targetGopPct)}</strong>
        </div>
        <div>
          <span>Reporting View</span>
          <strong>{viewLabel}</strong>
        </div>
        <div>
          <span>Report Period</span>
          <strong>{monthLabel}</strong>
        </div>
        <div>
          <span>Status</span>
          <strong>{propertyStatus}</strong>
        </div>
      </div>

      <div className="kpi-grid">
        {kpis.map((kpi) => (
          <article className={`kpi-card ${kpi.tone}`} key={kpi.label}>
            <span>{kpi.label}</span>
            <strong>{kpi.value}</strong>
          </article>
        ))}
      </div>

      <WeeklyGopControl
        enabledOperatingAreaIds={enabledOperatingAreaIds}
        remainingMonthlyGopGap={recoveryNeeded}
      />

      <div className="command-split">
        <article className="meter-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">GOP Performance Meter</p>
              <h2>{performanceText(projectedProtection)}</h2>
            </div>
            <strong>{formatPercent(projectedGopPct)}</strong>
          </div>
          <div className="meter-track" aria-hidden="true">
            <span className="meter-needs-recovery" />
            <span className="meter-below-plan" />
            <span className="meter-on-plan" />
            <span className="meter-above-plan" />
            <i style={{ left: `${meterPosition}%` }} />
          </div>
          <div className="meter-labels">
            <span>Needs Recovery &lt;27%</span>
            <span>Below Plan 27-29.9%</span>
            <span>On Plan 30-32%</span>
            <span>Above Plan &gt;32%</span>
          </div>
          <div className="recovery-strip">
            <div>
              <span>Revenue Needed to Recover</span>
              <strong>
                {calculation.revenueNeededAtFlowThrough.achievable
                  ? formatCurrency(revenueNeeded)
                  : calculation.revenueNeededAtFlowThrough.message}
              </strong>
            </div>
            <div>
              <span>Expense Reduction Needed</span>
              <strong>{formatCurrency(recoveryNeeded)}</strong>
            </div>
          </div>
        </article>

        <article className="projection-panel">
          <p className="eyebrow">Month-End Forecast</p>
          <h2>{projectedGap > 0 ? 'Still Short' : 'Forecasted to Hit'}</h2>
          <dl>
            <div>
              <dt>Current Pace</dt>
              <dd>{formatPercent(currentGopPct)} GOP</dd>
            </div>
            <div>
              <dt>Forecasted GOP %</dt>
              <dd>{formatPercent(projectedGopPct)}</dd>
            </div>
            <div>
              <dt>Forecasted GOP $</dt>
              <dd>{formatCurrency(projectedGop)}</dd>
            </div>
            <div>
              <dt>Forecasted Variance</dt>
              <dd>{formatSignedCurrency(-projectedGap)}</dd>
            </div>
          </dl>
          <p className="projection-language">
            {projectedGap > 0
              ? `Forecasted remaining gap to GOP target is ${formatCurrency(projectedDollarMiss)} before recovery actions.`
              : `Forecasted surplus to GOP target is ${formatCurrency(projectedSurplus)}. Maintain operating discipline.`}
          </p>
        </article>
      </div>

      <div className="command-split leaks-actions-layout">
        <section className="leaks-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Operating Variances</p>
              <h2>Department Variance</h2>
            </div>
          </div>
          <div className="leak-grid">
            {hotelDemoData.marginLeaks.map((leak) => (
              <article className="leak-card" key={leak.department}>
                <div>
                  <strong>{leak.department}</strong>
                  <span>{formatCurrency(leak.amountOverBudget)} over target</span>
                </div>
                <div>
                  <small>GOP impact</small>
                  <b>{leak.gopImpactPoints.toFixed(1)} pts</b>
                </div>
                <em className={`mini-badge ${severityClass(leak.severity)}`}>
                  {leak.severity}
                </em>
              </article>
            ))}
          </div>
        </section>

        <section className="actions-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Recovery Actions</p>
              <h2>Margin Recovery Cards</h2>
            </div>
          </div>
          <div className="action-grid">
            {hotelDemoData.recoveryActions.map((action) => (
              <article className="action-card" key={action.title}>
                <strong>{action.title}</strong>
                <span>{formatCurrency(action.estimatedImpact)} estimated impact</span>
                <div>
                  <em className={`mini-badge ${difficultyClass(action.difficulty)}`}>
                    {action.difficulty}
                  </em>
                  <small>{action.timeframe}</small>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}
