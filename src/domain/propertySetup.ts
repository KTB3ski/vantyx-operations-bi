export const OPERATING_AREA_DEFINITIONS = [
  {
    id: 'housekeeping',
    label: 'Housekeeping',
    group: 'Rooms',
    defaultEnabled: true,
  },
  {
    id: 'front-desk',
    label: 'Front Desk',
    group: 'Rooms',
    defaultEnabled: true,
  },
  {
    id: 'maintenance',
    label: 'Maintenance',
    group: 'Property',
    defaultEnabled: true,
  },
  {
    id: 'food-services',
    label: 'Food Services',
    group: 'F&B',
    defaultEnabled: true,
  },
  {
    id: 'banquets-events',
    label: 'Banquets / Events',
    group: 'F&B',
    defaultEnabled: true,
  },
  {
    id: 'gift-shop',
    label: 'Gift Shop / Retail',
    group: 'Retail',
    defaultEnabled: true,
  },
  {
    id: 'valet',
    label: 'Valet',
    group: 'Guest Services',
    defaultEnabled: true,
  },
  {
    id: 'shuttle-drivers',
    label: 'Shuttle Drivers',
    group: 'Guest Services',
    defaultEnabled: false,
  },
  {
    id: 'parking',
    label: 'Parking',
    group: 'Guest Services',
    defaultEnabled: false,
  },
  {
    id: 'spa-wellness',
    label: 'Spa / Wellness',
    group: 'Amenities',
    defaultEnabled: false,
  },
  {
    id: 'security',
    label: 'Security',
    group: 'Property',
    defaultEnabled: false,
  },
] as const;

export type OperatingAreaId = (typeof OPERATING_AREA_DEFINITIONS)[number]['id'];

export interface PropertySetup {
  enabledOperatingAreaIds: OperatingAreaId[];
}

const validAreaIds = new Set(
  OPERATING_AREA_DEFINITIONS.map((area) => area.id),
);

export function createDefaultPropertySetup(): PropertySetup {
  return {
    enabledOperatingAreaIds: OPERATING_AREA_DEFINITIONS.filter(
      (area) => area.defaultEnabled,
    ).map((area) => area.id),
  };
}

export function normalizePropertySetup(
  setup: Partial<PropertySetup> | null | undefined,
): PropertySetup {
  const fallback = createDefaultPropertySetup();
  if (!setup?.enabledOperatingAreaIds) return fallback;

  const enabled = setup.enabledOperatingAreaIds.filter((id): id is OperatingAreaId =>
    validAreaIds.has(id as OperatingAreaId),
  );

  return {
    enabledOperatingAreaIds:
      enabled.length > 0 ? enabled : fallback.enabledOperatingAreaIds,
  };
}

export function orderOperatingAreaIds(
  enabledIds: Iterable<OperatingAreaId>,
): OperatingAreaId[] {
  const enabled = new Set(enabledIds);
  return OPERATING_AREA_DEFINITIONS.filter((area) =>
    enabled.has(area.id),
  ).map((area) => area.id);
}
