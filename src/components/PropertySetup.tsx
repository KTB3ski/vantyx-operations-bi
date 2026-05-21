import {
  OPERATING_AREA_DEFINITIONS,
  orderOperatingAreaIds,
  type OperatingAreaId,
  type PropertySetup as PropertySetupModel,
} from '../domain/propertySetup';

interface PropertySetupProps {
  setup: PropertySetupModel;
  onChange: (setup: PropertySetupModel) => void;
}

export function PropertySetup({ setup, onChange }: PropertySetupProps) {
  const enabled = new Set(setup.enabledOperatingAreaIds);
  const enabledAreas = OPERATING_AREA_DEFINITIONS.filter((area) =>
    enabled.has(area.id),
  );

  function toggleArea(id: OperatingAreaId, checked: boolean) {
    const next = new Set(enabled);
    if (checked) {
      next.add(id);
    } else {
      next.delete(id);
    }

    onChange({
      enabledOperatingAreaIds: orderOperatingAreaIds(next),
    });
  }

  return (
    <section className="property-setup-panel no-print" aria-label="Property Setup">
      <details>
        <summary>
          <div>
            <p className="eyebrow">Property Setup</p>
            <h2>Operating Areas</h2>
            <p>
              {enabledAreas.length} active areas drive the Weekly Variance
              Review.
            </p>
          </div>
          <div className="property-setup-chip-row" aria-hidden="true">
            {enabledAreas.slice(0, 5).map((area) => (
              <span key={area.id}>{area.label}</span>
            ))}
            {enabledAreas.length > 5 ? (
              <span>+{enabledAreas.length - 5} more</span>
            ) : null}
          </div>
        </summary>

        <div className="property-setup-grid">
          {OPERATING_AREA_DEFINITIONS.map((area) => (
            <label className="property-area-toggle" key={area.id}>
              <input
                type="checkbox"
                checked={enabled.has(area.id)}
                onChange={(event) => toggleArea(area.id, event.target.checked)}
              />
              <span>
                <strong>{area.label}</strong>
                <small>{area.group}</small>
              </span>
            </label>
          ))}
        </div>
      </details>
    </section>
  );
}
