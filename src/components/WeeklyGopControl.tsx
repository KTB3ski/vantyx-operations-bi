import { useEffect, useRef, useState, type ReactNode } from 'react';
import { formatCurrency, formatPercent } from '../domain/formatters';
import {
  calculateWeeklyGopControl,
  operatingAreaVarianceDemoData,
  weeklyGopDemoData,
  weeklyRecoveryActions,
  type OperatingAreaVarianceLabel,
  type WeeklyGopStatus,
} from '../domain/weeklyGopControl';
import type { OperatingAreaId } from '../domain/propertySetup';

interface WeeklyGopControlProps {
  enabledOperatingAreaIds: OperatingAreaId[];
  remainingMonthlyGopGap: number;
}

interface DetailRow {
  label: string;
  value: string;
  tone?: 'positive' | 'negative' | 'neutral';
}

interface SummaryCardPopoverProps {
  activeId: string | null;
  align?: 'start' | 'center' | 'end';
  ariaLabel: string;
  badgeClassName: string;
  badgeLabel: string;
  children: ReactNode;
  id: string;
  note: string;
  rows: DetailRow[];
  setActiveId: (id: string | null) => void;
  title: string;
}

function weeklyStatusClass(status: WeeklyGopStatus) {
  return status.toLowerCase().replace(/\s+/g, '-');
}

function weeklyCardClass(status: WeeklyGopStatus) {
  return `weekly-card weekly-card--${weeklyStatusClass(status)}`;
}

function areaLabelClass(label: OperatingAreaVarianceLabel) {
  if (label === 'Gap') return 'behind';
  if (label === 'On Target') return 'on-target';
  return 'ahead';
}

function netAreaLabel(value: number): OperatingAreaVarianceLabel {
  if (Math.abs(value) <= 1) return 'On Target';
  return value < 0 ? 'Gap' : 'Surplus';
}

function gapLabel(gap: number) {
  if (Math.abs(gap) <= 1) return 'On Target';
  return gap > 0 ? 'Behind' : 'Ahead';
}

function gapValue(gap: number) {
  return formatCurrency(Math.abs(gap));
}

function varianceLabel(value: number) {
  if (Math.abs(value) <= 1) return 'On Target';
  return value < 0 ? 'Behind' : 'Ahead';
}

function signedCurrency(value: number) {
  if (Math.abs(value) <= 1) return formatCurrency(0);
  return `${value > 0 ? '+' : '-'}${formatCurrency(Math.abs(value))}`;
}

function varianceTone(value: number): DetailRow['tone'] {
  if (Math.abs(value) <= 1) return 'neutral';
  return value > 0 ? 'positive' : 'negative';
}

function SummaryCardPopover({
  activeId,
  align = 'center',
  ariaLabel,
  badgeClassName,
  badgeLabel,
  children,
  id,
  note,
  rows,
  setActiveId,
  title,
}: SummaryCardPopoverProps) {
  const isActive = activeId === id;
  const popoverId = `${id}-detail`;
  const lastPointerTypeRef = useRef<string | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isActive) return undefined;

    function closeOnOutsidePress(event: MouseEvent | TouchEvent) {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (!popoverRef.current?.contains(target)) {
        setActiveId(null);
      }
    }

    document.addEventListener('mousedown', closeOnOutsidePress);
    document.addEventListener('touchstart', closeOnOutsidePress, {
      passive: true,
    });

    return () => {
      document.removeEventListener('mousedown', closeOnOutsidePress);
      document.removeEventListener('touchstart', closeOnOutsidePress);
    };
  }, [isActive, setActiveId]);

  function closePopover() {
    if (isActive) setActiveId(null);
  }

  return (
    <div
      ref={popoverRef}
      className={`summary-popover summary-popover--align-${align} ${
        isActive ? 'summary-popover--active' : ''
      }`}
      tabIndex={0}
      role="group"
      aria-label={ariaLabel}
      aria-describedby={isActive ? popoverId : undefined}
      onPointerEnter={(event) => {
        if (event.pointerType !== 'touch') setActiveId(id);
      }}
      onPointerLeave={(event) => {
        if (event.pointerType !== 'touch') closePopover();
      }}
      onPointerDown={(event) => {
        lastPointerTypeRef.current = event.pointerType;
      }}
      onClick={() => {
        if (lastPointerTypeRef.current === 'mouse' && isActive) return;
        setActiveId(isActive ? null : id);
      }}
      onFocus={() => setActiveId(id)}
      onBlur={(event) => {
        const nextFocus = event.relatedTarget;
        if (!(nextFocus instanceof Node) || !event.currentTarget.contains(nextFocus)) {
          setActiveId(null);
        }
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          setActiveId(null);
          event.currentTarget.blur();
        }
      }}
    >
      {children}
      {isActive ? (
        <aside className="summary-popover-detail" id={popoverId} role="note">
          <div className="summary-popover-detail-header">
            <strong>{title}</strong>
            <span className={`mini-badge summary-popover-badge ${badgeClassName}`}>
              {badgeLabel}
            </span>
          </div>
          <div className="summary-popover-rule" />
          <dl>
            {rows.map((row) => (
              <div
                className={row.tone ? `detail-row--${row.tone}` : undefined}
                key={row.label}
              >
                <dt>{row.label}</dt>
                <dd>{row.value}</dd>
              </div>
            ))}
          </dl>
          <p>
            <span className="summary-popover-note-label">Note</span>
            <span className="summary-popover-note-text">{note}</span>
          </p>
        </aside>
      ) : null}
    </div>
  );
}

export function WeeklyGopControl({
  enabledOperatingAreaIds,
  remainingMonthlyGopGap,
}: WeeklyGopControlProps) {
  const [activeSummaryId, setActiveSummaryId] = useState<string | null>(null);
  const activeOperatingAreas = operatingAreaVarianceDemoData.filter((area) =>
    enabledOperatingAreaIds.includes(area.id),
  );
  const weeklyControl = calculateWeeklyGopControl(
    weeklyGopDemoData,
    remainingMonthlyGopGap,
    activeOperatingAreas,
  );
  const focus = weeklyControl.focusWeek;
  const netVariance = weeklyControl.operatingAreaNetVariance;
  const netVarianceText = `${varianceLabel(netVariance)} ${formatCurrency(
    Math.abs(netVariance),
  )}`;
  const netSummaryNote =
    netVariance < 0
      ? 'Combined area gap'
      : netVariance > 0
        ? 'Combined area surplus'
        : 'Tracking to plan';
  const netStatus = netAreaLabel(netVariance);

  return (
    <section
      className="weekly-control-panel"
      aria-label="Weekly Variance Review"
    >
      <div className="weekly-control-header">
        <div>
          <p className="eyebrow">Operating Area Review</p>
          <h2>Weekly Variance Review</h2>
          <p>
            Review weekly performance by area and identify recovery
            opportunities.
          </p>
        </div>
      </div>

      <div className="operating-variance-panel">
        <SummaryCardPopover
          activeId={activeSummaryId}
          align="start"
          ariaLabel="Net Weekly Variance breakdown"
          badgeClassName={areaLabelClass(netStatus)}
          badgeLabel={netStatus}
          id="net-weekly-variance"
          note={netSummaryNote}
          rows={[
            {
              label: 'Surplus Areas',
              value: signedCurrency(weeklyControl.operatingAreaSurplusTotal),
              tone: 'positive',
            },
            {
              label: 'Gap Areas',
              value: signedCurrency(weeklyControl.operatingAreaGapTotal),
              tone: 'negative',
            },
            {
              label: 'Net Variance',
              value: signedCurrency(netVariance),
              tone: varianceTone(netVariance),
            },
          ]}
          setActiveId={setActiveSummaryId}
          title="Net Weekly Variance"
        >
          <div className="weekly-total-card">
            <span>Net Weekly Variance</span>
            <strong>{netVarianceText}</strong>
            <small>{netSummaryNote}</small>
          </div>
        </SummaryCardPopover>
        <div className="operating-area-grid">
          {activeOperatingAreas.length === 0 ? (
            <p className="empty-state operating-area-empty">
              No operating areas enabled. Open Property Setup to choose the
              areas this hotel uses.
            </p>
          ) : null}
          {activeOperatingAreas.map((area, index) => (
            <SummaryCardPopover
              activeId={activeSummaryId}
              align={
                index === 0
                  ? 'start'
                  : index === activeOperatingAreas.length - 1
                    ? 'end'
                    : 'center'
              }
              ariaLabel={`${area.area} breakdown`}
              badgeClassName={areaLabelClass(area.label)}
              badgeLabel={area.label}
              id={`operating-area-${area.area.toLowerCase().replace(/\s+/g, '-')}`}
              key={area.area}
              note={area.helperText}
              rows={[
                {
                  label: 'Plan',
                  value: formatCurrency(area.weeklyPlan),
                },
                {
                  label: 'Actual',
                  value: formatCurrency(area.actual),
                },
                {
                  label: 'Variance',
                  value: signedCurrency(area.variance),
                  tone: varianceTone(area.variance),
                },
              ]}
              setActiveId={setActiveSummaryId}
              title={area.area}
            >
              <article className="operating-area-card">
                <span>{area.area}</span>
                <strong>{formatCurrency(Math.abs(area.variance))}</strong>
                <em className={`mini-badge ${areaLabelClass(area.label)}`}>
                  {area.label}
                </em>
                <small>{area.helperText}</small>
              </article>
            </SummaryCardPopover>
          ))}
        </div>
      </div>

      <div className="weekly-control-grid">
        {weeklyControl.weeks.map((week) => (
          <article className={weeklyCardClass(week.status)} key={week.week}>
            <div className="weekly-card-title">
              <strong>{week.week}</strong>
              <em
                className={`mini-badge weekly-status-badge ${weeklyStatusClass(
                  week.status,
                )}`}
              >
                {week.status}
              </em>
            </div>
            <dl>
              <div>
                <dt>Revenue Goal</dt>
                <dd>{formatCurrency(week.revenueGoal)}</dd>
              </div>
              <div>
                <dt>{week.revenueMode} Revenue</dt>
                <dd>{formatCurrency(week.revenue)}</dd>
              </div>
              <div>
                <dt>GOP Goal</dt>
                <dd>{formatCurrency(week.gopGoal)}</dd>
              </div>
              <div>
                <dt>{week.gopMode} GOP</dt>
                <dd>{formatCurrency(week.gop)}</dd>
              </div>
              <div>
                <dt>GOP %</dt>
                <dd>{formatPercent(week.weeklyGopPercent)}</dd>
              </div>
              <div>
                <dt>{gapLabel(week.weeklyGap)}</dt>
                <dd>{gapValue(week.weeklyGap)}</dd>
              </div>
            </dl>
          </article>
        ))}
      </div>

      <article className="weekly-focus-card">
        <div>
          <p className="eyebrow">This Week's Recovery Focus</p>
          <h3>{focus.week}</h3>
        </div>
        <div className="weekly-focus-metrics">
          <div>
            <span>Current week status</span>
            <strong
              className={`focus-status mini-badge weekly-status-badge ${weeklyStatusClass(
                focus.status,
              )}`}
            >
              {focus.status}
            </strong>
          </div>
          <div>
            <span>GOP variance</span>
            <strong>
              {focus.weeklyGap > 0
                ? formatCurrency(focus.weeklyGap)
                : `Surplus ${gapValue(focus.weeklyGap)}`}
            </strong>
          </div>
          <div>
            <span>Suggested weekly recovery</span>
            <strong>{formatCurrency(weeklyControl.weeklyRecoveryNeeded)}</strong>
          </div>
        </div>
        <ul>
          {weeklyRecoveryActions.map((action) => (
            <li key={action}>{action}</li>
          ))}
        </ul>
      </article>
    </section>
  );
}
