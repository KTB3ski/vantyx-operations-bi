export type WarehouseShiftStatus =
  | 'Ahead'
  | 'On Pace'
  | 'At Risk'
  | 'Behind'
  | 'Complete';

export type WarehouseRouteSheetStatus = 'Pending' | 'Preliminary' | 'Final';

export type WarehouseRouteStatus = 'Planned' | 'Loaded' | 'Late' | 'Cut';

export type WarehouseLaborMoveTone = 'good' | 'watch' | 'neutral';

export type WarehouseLaborMoveDecision =
  | 'Safe to Flex'
  | 'Hold Coverage'
  | 'Do Not Cut'
  | 'Rebalance Support'
  | 'Hold Layout';

export interface WarehouseRouteInput {
  id: string;
  routeName: string;
  plannedLoadTime: string;
  actualLoadTime: string;
  plannedCases: number;
  status: WarehouseRouteStatus;
  note: string;
}

export interface WarehouseZoneInput {
  id: string;
  name: string;
  plannedCases: number;
  selectedCases: number;
  plannedForkliftDrops: number;
  completedForkliftDrops: number;
  scheduledSelectors: number;
  activeSelectors: number;
  targetCasesPerHour: number | null;
  selectorHoursWorked: number;
  delayMinutes: number;
  note: string;
}

export interface WarehouseShiftInput {
  warehouseName: string;
  shiftName: string;
  shiftDate: string;
  shiftStartTime: string;
  asOfTime: string;
  targetFinishTime: string;
  priorThroughputCasesPerHour: number;
  availableSelectors: number;
  unavailableSelectors: number;
  forkliftDrivers: number;
  startingSelectedCases: number;
  previousShiftNotes: string;
  routeSheetStatus: WarehouseRouteSheetStatus;
  plannedCases: number;
  selectedCases: number;
  plannedForkliftDrops: number;
  completedForkliftDrops: number;
  scheduledSelectors: number;
  activeSelectors: number;
  selectorHoursWorked: number;
  indirectHours: number;
  blueYonderManHours: number;
  kronosLoggedHours: number;
  downtimeMinutes: number;
  targetCasesPerHour: number;
  targetForkliftDropsPerHour: number;
  routes: WarehouseRouteInput[];
  zones: WarehouseZoneInput[];
}

export interface WarehouseZoneCalculation {
  id: string;
  name: string;
  plannedCases: number;
  selectedCases: number;
  casesRemaining: number;
  expectedCasesByNow: number;
  casePaceVariance: number;
  teamCasesPerHour: number;
  requiredCasesPerHour: number | null;
  targetCasesPerHourUsed: number;
  plannedForkliftDrops: number;
  completedForkliftDrops: number;
  forkliftDropsRemaining: number;
  scheduledSelectors: number;
  activeSelectors: number;
  selectorHoursWorked: number;
  delayMinutes: number;
  status: WarehouseShiftStatus;
  note: string;
}

export interface WarehouseLaborMoveCheck {
  id: string;
  title: string;
  decision: WarehouseLaborMoveDecision;
  area: string;
  reason: string;
  move: string;
  watchMetric: string;
  tone: WarehouseLaborMoveTone;
}

export interface WarehouseShiftCalculation {
  warehouseName: string;
  shiftName: string;
  shiftDate: string;
  shiftStartTime: string;
  asOfTime: string;
  targetFinishTime: string;
  priorThroughputCasesPerHour: number;
  availableSelectors: number;
  unavailableSelectors: number;
  netAvailableSelectors: number;
  forkliftDrivers: number;
  startingSelectedCases: number;
  previousShiftNotes: string;
  routeSheetStatus: WarehouseRouteSheetStatus;
  plannedShiftHours: number;
  elapsedHours: number;
  remainingHours: number;
  progressPctByTime: number;
  plannedCases: number;
  selectedCases: number;
  casesRemaining: number;
  expectedCasesByNow: number;
  casePaceVariance: number;
  plannedForkliftDrops: number;
  completedForkliftDrops: number;
  forkliftDropsRemaining: number;
  expectedForkliftDropsByNow: number;
  forkliftDropPaceVariance: number;
  targetCasesPerHourUsed: number;
  targetForkliftDropsPerHourUsed: number;
  teamCasesPerHour: number;
  teamForkliftDropsPerHour: number;
  directSelectorHours: number;
  indirectHours: number;
  downtimeMinutes: number;
  blueYonderManHours: number;
  kronosLoggedHours: number;
  laborHourVariance: number;
  casesPerSelectorHour: number | null;
  forkliftDropsPerSelectorHour: number | null;
  requiredCasesPerHour: number | null;
  requiredForkliftDropsPerHour: number | null;
  projectedFinishTime: string;
  projectedFinishVarianceMinutes: number | null;
  selectorsNeededToFinish: number | null;
  additionalSelectorsNeeded: number | null;
  totalRoutes: number;
  loadedRoutes: number;
  lateRoutes: number;
  cutRoutes: number;
  plannedRoutes: number;
  plannedRouteCases: number;
  status: WarehouseShiftStatus;
  summary: string;
  routes: WarehouseRouteInput[];
  zones: WarehouseZoneCalculation[];
  laborMoveChecks: WarehouseLaborMoveCheck[];
}

const MINUTES_PER_DAY = 24 * 60;
const CLOSE_ENOUGH_MINUTES = 15;
const AT_RISK_MINUTES = 45;

function safeDivide(numerator: number, denominator: number) {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator)) return 0;
  if (Math.abs(denominator) < 0.000001) return 0;
  return numerator / denominator;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function parseClockTime(value: string) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return 0;

  const hours = clamp(Number(match[1]), 0, 23);
  const minutes = clamp(Number(match[2]), 0, 59);
  return hours * 60 + minutes;
}

function minutesFromShiftStart(startTime: string, clockTime: string) {
  const start = parseClockTime(startTime);
  const current = parseClockTime(clockTime);
  const diff = current - start;
  return diff >= 0 ? diff : diff + MINUTES_PER_DAY;
}

function elapsedMinutesFromShiftStart(
  startTime: string,
  asOfTime: string,
  targetFinishTime: string,
) {
  const plannedMinutes = minutesFromShiftStart(startTime, targetFinishTime);
  const rawElapsedMinutes = minutesFromShiftStart(startTime, asOfTime);

  // With clock-only inputs, a time just before the shift start can otherwise
  // look like almost a full day elapsed.
  if (plannedMinutes > 0 && rawElapsedMinutes > plannedMinutes + 12 * 60) {
    return 0;
  }

  return rawElapsedMinutes;
}

function formatClockTimeFromShiftStart(startTime: string, minutesFromStart: number) {
  if (!Number.isFinite(minutesFromStart)) return 'Not available';

  const start = parseClockTime(startTime);
  const totalMinutes = Math.max(0, Math.round(start + minutesFromStart));
  const dayOffset = Math.floor(totalMinutes / MINUTES_PER_DAY);
  const clockMinutes = totalMinutes % MINUTES_PER_DAY;
  const hours = Math.floor(clockMinutes / 60);
  const minutes = clockMinutes % 60;
  const time = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;

  return dayOffset > 0 ? `${time} (+${dayOffset}d)` : time;
}

function deriveTarget(rate: number | null | undefined, plannedAmount: number, plannedHours: number) {
  if (rate !== null && rate !== undefined && rate > 0) return rate;
  return safeDivide(plannedAmount, plannedHours);
}

function statusFromFinishVariance(
  casesRemaining: number,
  projectedFinishVarianceMinutes: number | null,
  paceVariance: number,
): WarehouseShiftStatus {
  if (casesRemaining <= 0) return 'Complete';

  if (projectedFinishVarianceMinutes === null) {
    return paceVariance < 0 ? 'Behind' : 'On Pace';
  }

  if (projectedFinishVarianceMinutes <= -CLOSE_ENOUGH_MINUTES) return 'Ahead';
  if (projectedFinishVarianceMinutes <= CLOSE_ENOUGH_MINUTES) return 'On Pace';
  if (projectedFinishVarianceMinutes <= AT_RISK_MINUTES) return 'At Risk';
  return 'Behind';
}

function isRouteLoadedLate(route: WarehouseRouteInput, shiftStartTime: string) {
  if (route.status === 'Late') return true;
  if (route.status !== 'Loaded') return false;
  if (!route.plannedLoadTime || !route.actualLoadTime) return false;

  const plannedMinutes = minutesFromShiftStart(shiftStartTime, route.plannedLoadTime);
  const actualMinutes = minutesFromShiftStart(shiftStartTime, route.actualLoadTime);
  return actualMinutes > plannedMinutes;
}

function statusFromZoneVariance(
  plannedCases: number,
  casesRemaining: number,
  paceVariance: number,
  delayMinutes: number,
): WarehouseShiftStatus {
  if (casesRemaining <= 0) return 'Complete';

  const plannedVarianceRatio = plannedCases > 0 ? paceVariance / plannedCases : 0;
  if (plannedVarianceRatio >= 0.04) return 'Ahead';
  if (plannedVarianceRatio >= -0.03 && delayMinutes < 20) return 'On Pace';
  if (plannedVarianceRatio >= -0.08 && delayMinutes < 40) return 'At Risk';
  return 'Behind';
}

function buildShiftSummary(
  status: WarehouseShiftStatus,
  projectedFinishTime: string,
  projectedFinishVarianceMinutes: number | null,
  requiredCasesPerHour: number | null,
) {
  if (status === 'Complete') {
    return 'Selection is complete for the planned case volume.';
  }

  if (projectedFinishVarianceMinutes === null) {
    return 'Forecast needs selected cases or elapsed time before Vyntax can estimate finish.';
  }

  const absoluteVariance = Math.abs(Math.round(projectedFinishVarianceMinutes));
  const paceText =
    requiredCasesPerHour === null
      ? 'No remaining case pace required.'
      : `Required pace from here is ${Math.round(requiredCasesPerHour).toLocaleString()} cases/hour.`;

  if (projectedFinishVarianceMinutes > CLOSE_ENOUGH_MINUTES) {
    return `Forecasted finish is ${projectedFinishTime}, about ${absoluteVariance} minutes late. ${paceText}`;
  }

  if (projectedFinishVarianceMinutes < -CLOSE_ENOUGH_MINUTES) {
    return `Forecasted finish is ${projectedFinishTime}, about ${absoluteVariance} minutes early. ${paceText}`;
  }

  return `Forecasted finish is ${projectedFinishTime}, tracking close to plan. ${paceText}`;
}

function calculateWarehouseZone(
  zone: WarehouseZoneInput,
  elapsedHours: number,
  remainingHours: number,
  progressPctByTime: number,
  plannedShiftHours: number,
): WarehouseZoneCalculation {
  const casesRemaining = Math.max(zone.plannedCases - zone.selectedCases, 0);
  const forkliftDropsRemaining = Math.max(
    zone.plannedForkliftDrops - zone.completedForkliftDrops,
    0,
  );
  const expectedCasesByNow = zone.plannedCases * progressPctByTime;
  const casePaceVariance = zone.selectedCases - expectedCasesByNow;
  const targetCasesPerHourUsed = deriveTarget(
    zone.targetCasesPerHour,
    zone.plannedCases,
    plannedShiftHours,
  );
  const teamCasesPerHour = safeDivide(zone.selectedCases, elapsedHours);
  const requiredCasesPerHour =
    casesRemaining <= 0
      ? 0
      : remainingHours > 0
        ? casesRemaining / remainingHours
        : null;
  const status = statusFromZoneVariance(
    zone.plannedCases,
    casesRemaining,
    casePaceVariance,
    zone.delayMinutes,
  );

  return {
    id: zone.id,
    name: zone.name,
    plannedCases: zone.plannedCases,
    selectedCases: zone.selectedCases,
    casesRemaining,
    plannedForkliftDrops: zone.plannedForkliftDrops,
    completedForkliftDrops: zone.completedForkliftDrops,
    forkliftDropsRemaining,
    expectedCasesByNow,
    casePaceVariance,
    teamCasesPerHour,
    requiredCasesPerHour,
    targetCasesPerHourUsed,
    scheduledSelectors: zone.scheduledSelectors,
    activeSelectors: zone.activeSelectors,
    selectorHoursWorked: zone.selectorHoursWorked,
    delayMinutes: zone.delayMinutes,
    status,
    note: zone.note,
  };
}

function formatWholeNumber(value: number | null) {
  if (value === null || !Number.isFinite(value)) return 'not available';
  return Math.round(value).toLocaleString();
}

function zoneHasSelectorFlowRisk(zone: WarehouseZoneCalculation) {
  const requiredPaceRisk =
    zone.requiredCasesPerHour !== null &&
    zone.teamCasesPerHour > 0 &&
    zone.requiredCasesPerHour > zone.teamCasesPerHour * 1.08;
  return (
    zone.status === 'Behind' ||
    zone.status === 'At Risk' ||
    requiredPaceRisk ||
    zone.delayMinutes >= 25
  );
}

function buildLaborMoveChecks({
  zones,
  activeSelectors,
  additionalSelectorsNeeded,
  projectedFinishVarianceMinutes,
  forkliftDropPaceVariance,
  targetForkliftDropsPerHourUsed,
}: {
  zones: WarehouseZoneCalculation[];
  activeSelectors: number;
  additionalSelectorsNeeded: number | null;
  projectedFinishVarianceMinutes: number | null;
  forkliftDropPaceVariance: number;
  targetForkliftDropsPerHourUsed: number;
}): WarehouseLaborMoveCheck[] {
  const riskZones = zones.filter(zoneHasSelectorFlowRisk);
  const zonesWithDrops = zones
    .filter((zone) => zone.forkliftDropsRemaining > 0)
    .sort((a, b) => {
      const riskDifference = Number(zoneHasSelectorFlowRisk(b)) - Number(zoneHasSelectorFlowRisk(a));
      if (riskDifference !== 0) return riskDifference;
      return b.forkliftDropsRemaining - a.forkliftDropsRemaining;
    });
  const focusZone =
    riskZones.sort((a, b) => a.casePaceVariance - b.casePaceVariance)[0] ??
    zonesWithDrops[0] ??
    zones[0];
  const supportZone = [...zones]
    .filter(
      (zone) =>
        (zone.status === 'Ahead' || zone.status === 'On Pace') &&
        zone.activeSelectors > 1 &&
        zone.id !== focusZone?.id,
    )
    .sort((a, b) => b.casePaceVariance - a.casePaceVariance)[0];
  const totalDropsRemaining = zones.reduce(
    (total, zone) => total + zone.forkliftDropsRemaining,
    0,
  );
  const isLate =
    projectedFinishVarianceMinutes !== null && projectedFinishVarianceMinutes > 15;
  const isEarly =
    projectedFinishVarianceMinutes !== null && projectedFinishVarianceMinutes < -30;

  let forkliftCheck: WarehouseLaborMoveCheck;
  if (zonesWithDrops.length > 0) {
    const dropRiskZone = zonesWithDrops[0];
    const decision: WarehouseLaborMoveDecision =
      zoneHasSelectorFlowRisk(dropRiskZone) || forkliftDropPaceVariance < 0
        ? 'Do Not Cut'
        : 'Hold Coverage';
    forkliftCheck = {
      id: 'forklift-coverage',
      title: 'Cut 1 Forklift?',
      decision,
      area: dropRiskZone.name,
      reason: `${dropRiskZone.name} still has ${formatWholeNumber(
        dropRiskZone.forkliftDropsRemaining,
      )} drops left while selector flow needs ${formatWholeNumber(
        dropRiskZone.requiredCasesPerHour,
      )} CPH.`,
      move:
        decision === 'Do Not Cut'
          ? 'Hold forklift coverage until drops and selector flow are both stable.'
          : 'Hold the cut for one more checkpoint, then recheck drop pace by area.',
      watchMetric: `${formatWholeNumber(
        totalDropsRemaining,
      )} total drops left; ${formatWholeNumber(
        targetForkliftDropsPerHourUsed,
      )} planned drops/hr`,
      tone: decision === 'Do Not Cut' ? 'watch' : 'neutral',
    };
  } else if (riskZones.length > 0 || isLate) {
    forkliftCheck = {
      id: 'forklift-coverage',
      title: 'Cut 1 Forklift?',
      decision: 'Hold Coverage',
      area: focusZone?.name ?? 'Shift',
      reason:
        'Drops are clear, but selector flow is still tight enough that a cut could create a restart problem.',
      move: 'Keep forklift coverage until the next selector-flow read confirms the pace is stable.',
      watchMetric: `${formatWholeNumber(
        focusZone?.requiredCasesPerHour ?? null,
      )} CPH needed in ${focusZone?.name ?? 'the focus area'}`,
      tone: 'neutral',
    };
  } else {
    forkliftCheck = {
      id: 'forklift-coverage',
      title: 'Cut 1 Forklift?',
      decision: 'Safe to Flex',
      area: 'Shift',
      reason:
        'No area has remaining forklift drops and selector flow is not showing a major risk.',
      move: 'Flex one forklift only with a timed recheck so shorts or replenishment issues do not build quietly.',
      watchMetric: 'Recheck drops, shorts, and selector idle time next checkpoint',
      tone: 'good',
    };
  }

  let selectorCheck: WarehouseLaborMoveCheck;
  if ((additionalSelectorsNeeded ?? 0) > 0 || riskZones.length > 0 || isLate) {
    selectorCheck = {
      id: 'selector-coverage',
      title: 'Cut 1 Selector?',
      decision: 'Do Not Cut',
      area: focusZone?.name ?? 'Shift',
      reason: `${focusZone?.name ?? 'The shift'} is still carrying pace risk, and the model shows ${formatWholeNumber(
        additionalSelectorsNeeded,
      )} extra selector${additionalSelectorsNeeded === 1 ? '' : 's'} may be needed to protect finish.`,
      move: 'Do not cut selectors yet. Rebalance first, then review again after the next case-pick read.',
      watchMetric: `${formatWholeNumber(
        focusZone?.casesRemaining ?? null,
      )} cases left in ${focusZone?.name ?? 'the focus area'}`,
      tone: 'watch',
    };
  } else if (isEarly && activeSelectors > 1) {
    selectorCheck = {
      id: 'selector-coverage',
      title: 'Cut 1 Selector?',
      decision: 'Safe to Flex',
      area: 'Shift',
      reason:
        'Finish forecast has cushion and no area is currently showing selector-flow risk.',
      move: 'Flex one selector only if the next route window and zone case pace are still clean.',
      watchMetric: 'Recheck required CPH and route load timing before the next cut',
      tone: 'good',
    };
  } else {
    selectorCheck = {
      id: 'selector-coverage',
      title: 'Cut 1 Selector?',
      decision: 'Hold Coverage',
      area: 'Shift',
      reason:
        'The shift is close enough to plan that cutting a selector could erase the finish cushion.',
      move: 'Hold selector coverage and use the next checkpoint to decide whether the cushion is real.',
      watchMetric: 'Required CPH vs actual CPH at next checkpoint',
      tone: 'neutral',
    };
  }

  const rebalanceCheck: WarehouseLaborMoveCheck =
    focusZone && supportZone && riskZones.length > 0
      ? {
          id: 'rebalance-support',
          title: 'Move Support?',
          decision: 'Rebalance Support',
          area: `${supportZone.name} -> ${focusZone.name}`,
          reason: `${focusZone.name} is the first risk area, while ${supportZone.name} has the best cushion.`,
          move: `Move short-term support from ${supportZone.name} to ${focusZone.name}, then return it if ${supportZone.name} starts losing pace.`,
          watchMetric: `${focusZone.name}: ${formatWholeNumber(
            focusZone.requiredCasesPerHour,
          )} CPH needed`,
          tone: 'watch',
        }
      : {
          id: 'rebalance-support',
          title: 'Move Support?',
          decision: 'Hold Layout',
          area: 'Shift',
          reason:
            'No clear support area and risk area pairing is visible from the current zone read.',
          move: 'Keep labor in place until an area clearly builds cushion or falls behind.',
          watchMetric: 'Zone pace variance and active selector count',
          tone: 'neutral',
        };

  return [forkliftCheck, selectorCheck, rebalanceCheck];
}

export function calculateWarehouseShift(
  input: WarehouseShiftInput,
): WarehouseShiftCalculation {
  const plannedShiftMinutes = minutesFromShiftStart(
    input.shiftStartTime,
    input.targetFinishTime,
  );
  const elapsedMinutes = elapsedMinutesFromShiftStart(
    input.shiftStartTime,
    input.asOfTime,
    input.targetFinishTime,
  );
  const plannedShiftHours = plannedShiftMinutes / 60;
  const elapsedHours = elapsedMinutes / 60;
  const remainingMinutes = Math.max(plannedShiftMinutes - elapsedMinutes, 0);
  const remainingHours = remainingMinutes / 60;
  const progressPctByTime =
    plannedShiftMinutes > 0 ? clamp(elapsedMinutes / plannedShiftMinutes, 0, 1) : 0;

  const casesRemaining = Math.max(input.plannedCases - input.selectedCases, 0);
  const forkliftDropsRemaining = Math.max(
    input.plannedForkliftDrops - input.completedForkliftDrops,
    0,
  );
  const expectedCasesByNow = input.plannedCases * progressPctByTime;
  const casePaceVariance = input.selectedCases - expectedCasesByNow;
  const expectedForkliftDropsByNow = input.plannedForkliftDrops * progressPctByTime;
  const forkliftDropPaceVariance =
    input.completedForkliftDrops - expectedForkliftDropsByNow;
  const targetCasesPerHourUsed = deriveTarget(
    input.targetCasesPerHour,
    input.plannedCases,
    plannedShiftHours,
  );
  const targetForkliftDropsPerHourUsed = deriveTarget(
    input.targetForkliftDropsPerHour,
    input.plannedForkliftDrops,
    plannedShiftHours,
  );
  const teamCasesPerHour = safeDivide(input.selectedCases, elapsedHours);
  const teamForkliftDropsPerHour = safeDivide(
    input.completedForkliftDrops,
    elapsedHours,
  );
  const directSelectorHours = Math.max(input.selectorHoursWorked - input.indirectHours, 0);
  const blueYonderManHours =
    input.blueYonderManHours ?? input.scheduledSelectors * plannedShiftHours;
  const kronosLoggedHours = input.kronosLoggedHours ?? input.selectorHoursWorked;
  const laborHourVariance = kronosLoggedHours - blueYonderManHours;
  const casesPerSelectorHour =
    directSelectorHours > 0 ? input.selectedCases / directSelectorHours : null;
  const forkliftDropsPerSelectorHour =
    directSelectorHours > 0 ? input.completedForkliftDrops / directSelectorHours : null;
  const requiredCasesPerHour =
    casesRemaining <= 0
      ? 0
      : remainingHours > 0
        ? casesRemaining / remainingHours
        : null;
  const requiredForkliftDropsPerHour =
    forkliftDropsRemaining <= 0
      ? 0
      : remainingHours > 0
        ? forkliftDropsRemaining / remainingHours
        : null;
  const projectedFinishMinutesFromStart =
    casesRemaining <= 0
      ? elapsedMinutes
      : teamCasesPerHour > 0
        ? elapsedMinutes + (casesRemaining / teamCasesPerHour) * 60
        : Number.POSITIVE_INFINITY;
  const projectedFinishVarianceMinutes = Number.isFinite(projectedFinishMinutesFromStart)
    ? projectedFinishMinutesFromStart - plannedShiftMinutes
    : null;
  const projectedFinishTime = formatClockTimeFromShiftStart(
    input.shiftStartTime,
    projectedFinishMinutesFromStart,
  );
  const selectorsNeededToFinish =
    remainingHours > 0 && casesPerSelectorHour !== null && casesPerSelectorHour > 0
      ? casesRemaining / casesPerSelectorHour / remainingHours
      : null;
  const additionalSelectorsNeeded =
    selectorsNeededToFinish === null
      ? null
      : Math.max(Math.ceil(selectorsNeededToFinish - input.activeSelectors), 0);
  const status = statusFromFinishVariance(
    casesRemaining,
    projectedFinishVarianceMinutes,
    casePaceVariance,
  );
  const totalRoutes = input.routes.length;
  const loadedRoutes = input.routes.filter((route) => route.status === 'Loaded').length;
  const lateRoutes = input.routes.filter((route) =>
    isRouteLoadedLate(route, input.shiftStartTime),
  ).length;
  const cutRoutes = input.routes.filter((route) => route.status === 'Cut').length;
  const plannedRoutes = input.routes.filter((route) => route.status === 'Planned').length;
  const plannedRouteCases = input.routes.reduce(
    (total, route) => total + route.plannedCases,
    0,
  );
  const zones = input.zones.map((zone) =>
    calculateWarehouseZone(
      zone,
      elapsedHours,
      remainingHours,
      progressPctByTime,
      plannedShiftHours,
    ),
  );
  const laborMoveChecks = buildLaborMoveChecks({
    zones,
    activeSelectors: input.activeSelectors,
    additionalSelectorsNeeded,
    projectedFinishVarianceMinutes,
    forkliftDropPaceVariance,
    targetForkliftDropsPerHourUsed,
  });

  return {
    warehouseName: input.warehouseName,
    shiftName: input.shiftName,
    shiftDate: input.shiftDate,
    shiftStartTime: input.shiftStartTime,
    asOfTime: input.asOfTime,
    targetFinishTime: input.targetFinishTime,
    priorThroughputCasesPerHour: input.priorThroughputCasesPerHour,
    availableSelectors: input.availableSelectors,
    unavailableSelectors: input.unavailableSelectors,
    netAvailableSelectors: Math.max(
      input.availableSelectors - input.unavailableSelectors,
      0,
    ),
    forkliftDrivers: input.forkliftDrivers,
    startingSelectedCases: input.startingSelectedCases,
    previousShiftNotes: input.previousShiftNotes,
    routeSheetStatus: input.routeSheetStatus,
    plannedShiftHours,
    elapsedHours,
    remainingHours,
    progressPctByTime,
    plannedCases: input.plannedCases,
    selectedCases: input.selectedCases,
    casesRemaining,
    plannedForkliftDrops: input.plannedForkliftDrops,
    completedForkliftDrops: input.completedForkliftDrops,
    forkliftDropsRemaining,
    expectedCasesByNow,
    casePaceVariance,
    expectedForkliftDropsByNow,
    forkliftDropPaceVariance,
    targetCasesPerHourUsed,
    targetForkliftDropsPerHourUsed,
    teamCasesPerHour,
    teamForkliftDropsPerHour,
    directSelectorHours,
    indirectHours: input.indirectHours,
    downtimeMinutes: input.downtimeMinutes,
    blueYonderManHours,
    kronosLoggedHours,
    laborHourVariance,
    casesPerSelectorHour,
    forkliftDropsPerSelectorHour,
    requiredCasesPerHour,
    requiredForkliftDropsPerHour,
    projectedFinishTime,
    projectedFinishVarianceMinutes,
    selectorsNeededToFinish,
    additionalSelectorsNeeded,
    totalRoutes,
    loadedRoutes,
    lateRoutes,
    cutRoutes,
    plannedRoutes,
    plannedRouteCases,
    status,
    summary: buildShiftSummary(
      status,
      projectedFinishTime,
      projectedFinishVarianceMinutes,
      requiredCasesPerHour,
    ),
    routes: input.routes,
    zones,
    laborMoveChecks,
  };
}

export const warehouseDemoShift: WarehouseShiftInput = {
  warehouseName: 'Demo Distribution Center',
  shiftName: 'Night Selection',
  shiftDate: '2026-05-08',
  shiftStartTime: '18:00',
  asOfTime: '22:30',
  targetFinishTime: '02:00',
  priorThroughputCasesPerHour: 7_100,
  availableSelectors: 45,
  unavailableSelectors: 3,
  forkliftDrivers: 6,
  startingSelectedCases: 4_800,
  previousShiftNotes:
    'Freezer ran late after replenishment delay; two routes loaded after target.',
  routeSheetStatus: 'Preliminary',
  plannedCases: 58_000,
  selectedCases: 28_400,
  plannedForkliftDrops: 430,
  completedForkliftDrops: 208,
  scheduledSelectors: 42,
  activeSelectors: 39,
  selectorHoursWorked: 166,
  indirectHours: 13.5,
  blueYonderManHours: 176,
  kronosLoggedHours: 179.5,
  downtimeMinutes: 18,
  targetCasesPerHour: 7_250,
  targetForkliftDropsPerHour: 54,
  routes: [
    {
      id: 'route-112',
      routeName: 'Route 112',
      plannedLoadTime: '21:15',
      actualLoadTime: '21:05',
      plannedCases: 4_600,
      status: 'Loaded',
      note: 'Loaded ahead of planned window.',
    },
    {
      id: 'route-148',
      routeName: 'Route 148',
      plannedLoadTime: '22:00',
      actualLoadTime: '22:28',
      plannedCases: 5_200,
      status: 'Late',
      note: 'Waited on freezer replenishment.',
    },
    {
      id: 'route-203',
      routeName: 'Route 203',
      plannedLoadTime: '23:10',
      actualLoadTime: '',
      plannedCases: 3_900,
      status: 'Planned',
      note: 'Pending final truck sheet confirmation.',
    },
    {
      id: 'route-219',
      routeName: 'Route 219',
      plannedLoadTime: '23:45',
      actualLoadTime: '',
      plannedCases: 2_700,
      status: 'Cut',
      note: 'Cut from current route sheet.',
    },
  ],
  zones: [
    {
      id: 'dry',
      name: 'Dry',
      plannedCases: 24_000,
      selectedCases: 14_200,
      plannedForkliftDrops: 170,
      completedForkliftDrops: 88,
      scheduledSelectors: 16,
      activeSelectors: 15,
      targetCasesPerHour: 3_000,
      selectorHoursWorked: 64,
      delayMinutes: 0,
      note: 'Highest case volume zone.',
    },
    {
      id: 'cooler',
      name: 'Cooler',
      plannedCases: 14_000,
      selectedCases: 5_100,
      plannedForkliftDrops: 110,
      completedForkliftDrops: 50,
      scheduledSelectors: 10,
      activeSelectors: 10,
      targetCasesPerHour: 1_750,
      selectorHoursWorked: 43,
      delayMinutes: 12,
      note: 'Watching replenishment turns.',
    },
    {
      id: 'freezer',
      name: 'Freezer',
      plannedCases: 11_500,
      selectedCases: 3_900,
      plannedForkliftDrops: 95,
      completedForkliftDrops: 36,
      scheduledSelectors: 9,
      activeSelectors: 8,
      targetCasesPerHour: 1_438,
      selectorHoursWorked: 35,
      delayMinutes: 35,
      note: 'Recovery focus due to pace and delay risk.',
    },
    {
      id: 'beverage',
      name: 'Beverage',
      plannedCases: 8_500,
      selectedCases: 5_200,
      plannedForkliftDrops: 55,
      completedForkliftDrops: 34,
      scheduledSelectors: 7,
      activeSelectors: 6,
      targetCasesPerHour: 1_063,
      selectorHoursWorked: 24,
      delayMinutes: 0,
      note: 'Tracking slightly ahead of time pace.',
    },
  ],
};
