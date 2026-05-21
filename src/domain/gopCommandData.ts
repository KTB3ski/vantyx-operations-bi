export type LeakSeverity = 'Low' | 'Medium' | 'High';
export type ActionDifficulty = 'Low' | 'Medium' | 'High';
export type ActionTimeframe = 'Today' | 'This Week' | 'Month-End';
export type ProtectionLevel =
  | 'Needs Recovery'
  | 'Below Plan'
  | 'On Plan'
  | 'Above Plan';
export type PropertyPerformanceStatus = 'Behind' | 'On Target' | 'Ahead';

export interface MarginLeak {
  department: string;
  amountOverBudget: number;
  gopImpactPoints: number;
  severity: LeakSeverity;
}

export interface RecoveryAction {
  title: string;
  estimatedImpact: number;
  difficulty: ActionDifficulty;
  timeframe: ActionTimeframe;
}

export const hotelDemoData = {
  property: 'Juniper Shores Hotel',
  operator: 'Summit Ridge Hospitality',
  rooms: 230,
  targetGopPct: 0.3,
  occupancy: 66.8,
  adr: 207.74,
  revpar: 138.85,
  marginLeaks: [
    {
      department: 'Labor',
      amountOverBudget: 8_400,
      gopImpactPoints: -0.7,
      severity: 'High',
    },
    {
      department: 'F&B Cost',
      amountOverBudget: 4_900,
      gopImpactPoints: -0.4,
      severity: 'Medium',
    },
    {
      department: 'Repairs & Maintenance',
      amountOverBudget: 3_200,
      gopImpactPoints: -0.3,
      severity: 'Medium',
    },
    {
      department: 'OTA Commissions',
      amountOverBudget: 2_250,
      gopImpactPoints: -0.2,
      severity: 'Low',
    },
  ] satisfies MarginLeak[],
  recoveryActions: [
    {
      title: 'Reduce overtime by 14 hours',
      estimatedImpact: 1_120,
      difficulty: 'Low',
      timeframe: 'Today',
    },
    {
      title: 'Push direct booking mix',
      estimatedImpact: 3_000,
      difficulty: 'Medium',
      timeframe: 'This Week',
    },
    {
      title: 'Tighten F&B purchasing variance',
      estimatedImpact: 3_500,
      difficulty: 'Medium',
      timeframe: 'This Week',
    },
    {
      title: 'Raise ADR by $6 on compression nights',
      estimatedImpact: 7_000,
      difficulty: 'High',
      timeframe: 'Month-End',
    },
    {
      title: 'Pause discretionary expenses',
      estimatedImpact: 2_500,
      difficulty: 'Low',
      timeframe: 'Today',
    },
    {
      title: 'Review staffing vs occupancy',
      estimatedImpact: 1_800,
      difficulty: 'Medium',
      timeframe: 'Today',
    },
  ] satisfies RecoveryAction[],
};

export function getProtectionLevel(gopPct: number): ProtectionLevel {
  if (gopPct < 0.27) return 'Needs Recovery';
  if (gopPct < 0.3) return 'Below Plan';
  if (gopPct <= 0.32) return 'On Plan';
  return 'Above Plan';
}

export function getPropertyPerformanceStatus(
  gopPct: number,
  targetGopPct = hotelDemoData.targetGopPct,
): PropertyPerformanceStatus {
  if (gopPct < targetGopPct) return 'Behind';
  if (gopPct <= targetGopPct + 0.02) return 'On Target';
  return 'Ahead';
}

export function getMeterPosition(gopPct: number) {
  const min = 0.24;
  const max = 0.36;
  const clamped = Math.min(Math.max(gopPct, min), max);
  return ((clamped - min) / (max - min)) * 100;
}
