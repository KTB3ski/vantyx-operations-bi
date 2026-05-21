import type { OperatingAreaId } from './propertySetup';

export type WeeklyGopStatus =
  | 'Needs Recovery'
  | 'Below Plan'
  | 'On Plan'
  | 'Above Plan'
  | 'Slight Variance';
export type WeeklyValueMode = 'Actual' | 'Forecasted';
export type OperatingAreaVarianceLabel = 'Gap' | 'Surplus' | 'On Target';

export interface WeeklyGopInput {
  week: string;
  revenueGoal: number;
  actualRevenue?: number;
  projectedRevenue?: number;
  gopGoal: number;
  actualGop?: number;
  projectedGop?: number;
  status: WeeklyGopStatus;
}

export interface WeeklyGopCalculation {
  week: string;
  revenueGoal: number;
  revenue: number;
  revenueMode: WeeklyValueMode;
  gopGoal: number;
  gop: number;
  gopMode: WeeklyValueMode;
  weeklyGopPercent: number;
  weeklyGap: number;
  status: WeeklyGopStatus;
}

export interface WeeklyGopControlCalculation {
  weeks: WeeklyGopCalculation[];
  monthlyWeeklyGapTotal: number;
  operatingAreaNetVariance: number;
  operatingAreaSurplusTotal: number;
  operatingAreaGapTotal: number;
  remainingWeeks: number;
  weeklyRecoveryNeeded: number;
  focusWeek: WeeklyGopCalculation;
}

export interface OperatingAreaVariance {
  id: OperatingAreaId;
  area: string;
  weeklyPlan: number;
  actual: number;
  variance: number;
  label: OperatingAreaVarianceLabel;
  helperText: string;
}

export const weeklyGopDemoData = [
  {
    week: 'Week 1',
    revenueGoal: 220_000,
    actualRevenue: 218_500,
    gopGoal: 66_000,
    actualGop: 64_200,
    status: 'Below Plan',
  },
  {
    week: 'Week 2',
    revenueGoal: 245_000,
    actualRevenue: 251_000,
    gopGoal: 73_500,
    actualGop: 76_200,
    status: 'Above Plan',
  },
  {
    week: 'Week 3',
    revenueGoal: 255_000,
    projectedRevenue: 248_000,
    gopGoal: 76_500,
    projectedGop: 71_000,
    status: 'Needs Recovery',
  },
  {
    week: 'Week 4',
    revenueGoal: 237_515,
    projectedRevenue: 240_000,
    gopGoal: 71_255,
    projectedGop: 72_000,
    status: 'Slight Variance',
  },
] satisfies WeeklyGopInput[];

export const operatingAreaVarianceDemoData = [
  {
    id: 'housekeeping',
    area: 'Housekeeping',
    weeklyPlan: 8_500,
    actual: 9_750,
    variance: 1_250,
    label: 'Surplus',
    helperText: 'Above weekly plan',
  },
  {
    id: 'shuttle-drivers',
    area: 'Shuttle Drivers',
    weeklyPlan: 2_000,
    actual: 1_580,
    variance: -420,
    label: 'Gap',
    helperText: 'Below weekly plan',
  },
  {
    id: 'food-services',
    area: 'Food Services',
    weeklyPlan: 6_000,
    actual: 4_820,
    variance: -1_180,
    label: 'Gap',
    helperText: 'Below weekly plan',
  },
  {
    id: 'banquets-events',
    area: 'Banquets / Events',
    weeklyPlan: 7_400,
    actual: 6_830,
    variance: -570,
    label: 'Gap',
    helperText: 'Below weekly plan',
  },
  {
    id: 'gift-shop',
    area: 'Gift Shop / Retail',
    weeklyPlan: 1_350,
    actual: 1_560,
    variance: 210,
    label: 'Surplus',
    helperText: 'Above weekly plan',
  },
  {
    id: 'valet',
    area: 'Valet',
    weeklyPlan: 2_250,
    actual: 2_110,
    variance: -140,
    label: 'Gap',
    helperText: 'Below weekly plan',
  },
  {
    id: 'parking',
    area: 'Parking',
    weeklyPlan: 1_900,
    actual: 1_900,
    variance: 0,
    label: 'On Target',
    helperText: 'Tracking to plan',
  },
  {
    id: 'front-desk',
    area: 'Front Desk',
    weeklyPlan: 3_500,
    actual: 3_500,
    variance: 0,
    label: 'On Target',
    helperText: 'Tracking to plan',
  },
  {
    id: 'maintenance',
    area: 'Maintenance',
    weeklyPlan: 2_400,
    actual: 2_755,
    variance: 355,
    label: 'Surplus',
    helperText: 'Above weekly plan',
  },
  {
    id: 'spa-wellness',
    area: 'Spa / Wellness',
    weeklyPlan: 3_200,
    actual: 3_540,
    variance: 340,
    label: 'Surplus',
    helperText: 'Above weekly plan',
  },
  {
    id: 'security',
    area: 'Security',
    weeklyPlan: 1_800,
    actual: 1_650,
    variance: -150,
    label: 'Gap',
    helperText: 'Below weekly plan',
  },
] satisfies OperatingAreaVariance[];

export const weeklyRecoveryActions = [
  'Cut overtime hours',
  'Raise ADR on compression nights',
  'Tighten F&B purchasing',
];

function isProjectedWeek(input: WeeklyGopInput) {
  return input.actualRevenue === undefined || input.actualGop === undefined;
}

export function getWeeklyGopStatus(
  input: WeeklyGopInput,
  weeklyGap: number,
): WeeklyGopStatus {
  if (weeklyGap > 5_000) return 'Needs Recovery';
  if (weeklyGap > 0) return 'Below Plan';
  if (isProjectedWeek(input) && Math.abs(weeklyGap) <= 2_500) {
    return 'Slight Variance';
  }
  if (Math.abs(weeklyGap) <= 1) return 'On Plan';
  return 'Above Plan';
}

export function calculateWeeklyGop(input: WeeklyGopInput): WeeklyGopCalculation {
  const revenue =
    input.actualRevenue === undefined
      ? input.projectedRevenue || 0
      : input.actualRevenue;
  const gop = input.actualGop === undefined ? input.projectedGop || 0 : input.actualGop;
  const weeklyGap = input.gopGoal - gop;

  return {
    week: input.week,
    revenueGoal: input.revenueGoal,
    revenue,
    revenueMode: input.actualRevenue === undefined ? 'Forecasted' : 'Actual',
    gopGoal: input.gopGoal,
    gop,
    gopMode: input.actualGop === undefined ? 'Forecasted' : 'Actual',
    weeklyGopPercent: revenue === 0 ? 0 : gop / revenue,
    weeklyGap,
    status: getWeeklyGopStatus(input, weeklyGap),
  };
}

export function calculateWeeklyGopControl(
  weeklyInputs: WeeklyGopInput[],
  remainingMonthlyGopGap: number,
  operatingAreas: OperatingAreaVariance[] = operatingAreaVarianceDemoData,
): WeeklyGopControlCalculation {
  const weeks = weeklyInputs.map(calculateWeeklyGop);
  const monthlyWeeklyGapTotal = weeks.reduce(
    (total, week) => total + week.weeklyGap,
    0,
  );
  const operatingAreaNetVariance = operatingAreas.reduce(
    (total, area) => total + area.variance,
    0,
  );
  const operatingAreaSurplusTotal = operatingAreas.reduce(
    (total, area) => total + Math.max(area.variance, 0),
    0,
  );
  const operatingAreaGapTotal = operatingAreas.reduce(
    (total, area) => total + Math.min(area.variance, 0),
    0,
  );
  const remainingWeeks = Math.max(
    weeks.filter((week) => week.gopMode === 'Forecasted').length,
    1,
  );
  const monthlyGapForRecovery =
    remainingMonthlyGopGap > 0
      ? remainingMonthlyGopGap
      : Math.max(monthlyWeeklyGapTotal, 0);
  const weeklyRecoveryNeeded = monthlyGapForRecovery / remainingWeeks;
  const projectedGaps = weeks.filter(
    (week) => week.gopMode === 'Forecasted' && week.weeklyGap > 0,
  );
  const allGaps = weeks.filter((week) => week.weeklyGap > 0);
  const focusPool = projectedGaps.length > 0 ? projectedGaps : allGaps;
  const focusWeek =
    [...focusPool].sort((a, b) => b.weeklyGap - a.weeklyGap)[0] ||
    weeks.find((week) => week.status === 'On Plan') ||
    weeks[weeks.length - 1];

  return {
    weeks,
    monthlyWeeklyGapTotal,
    operatingAreaNetVariance,
    operatingAreaSurplusTotal,
    operatingAreaGapTotal,
    remainingWeeks,
    weeklyRecoveryNeeded,
    focusWeek,
  };
}
