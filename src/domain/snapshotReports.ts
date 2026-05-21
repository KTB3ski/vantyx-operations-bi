import { getPeriodDisplayLabel, getReportingPeriodKey } from './reporting';
import type { PeriodKey, SnapshotDraft, SnapshotReportScope } from './types';

export const SNAPSHOT_REPORT_SCOPES: Array<{
  key: SnapshotReportScope;
  label: string;
  helper: string;
}> = [
  {
    key: 'weekly',
    label: 'Weekly',
    helper: 'Current reporting view',
  },
  {
    key: 'monthly',
    label: 'Monthly',
    helper: 'Month / MTD',
  },
  {
    key: 'ninetyDay',
    label: '90 Day',
    helper: 'Quarter / QTD',
  },
];

export function getSnapshotReportTitle(scope: SnapshotReportScope) {
  if (scope === 'monthly') return 'Monthly Financial Snapshot';
  if (scope === 'ninetyDay') return '90 Day Financial Snapshot';
  return 'Weekly Financial Snapshot';
}

export function getSnapshotReportScopeLabel(scope: SnapshotReportScope) {
  if (scope === 'monthly') return 'Monthly';
  if (scope === 'ninetyDay') return '90 Day';
  return 'Weekly';
}

export function getSnapshotReportPeriods(
  scope: SnapshotReportScope,
  draft: SnapshotDraft,
): PeriodKey[] {
  if (scope === 'monthly') return ['month'];
  if (scope === 'ninetyDay') return ['quarter'];
  return [getReportingPeriodKey(draft.reportingView)];
}

export function getSnapshotReportPeriodLabel(
  scope: SnapshotReportScope,
  period: PeriodKey,
  draft: SnapshotDraft,
) {
  if (scope === 'monthly') return 'Month / MTD';
  if (scope === 'ninetyDay') return 'Quarter / QTD';
  return getPeriodDisplayLabel(period, draft.reportingView);
}
