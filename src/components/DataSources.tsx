import { useState } from 'react';
import { CSV_IMPORT_NOTE } from '../domain/integrations/csvImport';
import { getIntegrationProviders } from '../domain/integrations/providerRegistry';
import type {
  IntegrationProviderConfig,
  IntegrationStatus,
} from '../domain/integrations/types';

function statusClass(status: IntegrationStatus) {
  if (status === 'Active') return 'active';
  if (status === 'Ready') return 'ready';
  return 'not-connected';
}

function actionLabel(provider: IntegrationProviderConfig) {
  if (provider.id === 'csv') return 'Import CSV';
  if (provider.id === 'manual') return 'Active';
  return 'Configure';
}

function canOpenPlaceholder(provider: IntegrationProviderConfig) {
  return provider.requiresApproval;
}

export function DataSources() {
  const [selectedProvider, setSelectedProvider] =
    useState<IntegrationProviderConfig | null>(null);
  const providers = getIntegrationProviders();
  const activeProvider = providers.find((provider) => provider.status === 'Active');
  const readyCount = providers.filter((provider) => provider.status === 'Ready').length;
  const futureCount = providers.filter(
    (provider) => provider.status === 'Not Connected',
  ).length;

  return (
    <section
      className="data-sources-section data-sources-compact-section"
      aria-label="Data Sources"
    >
      <div className="data-source-compact-header">
        <div>
          <p className="eyebrow">Local-First Readiness</p>
          <h2>Data Sources</h2>
          <p>
            {activeProvider?.name || 'Manual Entry'} active. Live integrations
            are off for this pilot.
          </p>
        </div>
        <div className="data-source-status-strip" aria-label="Connection summary">
          <span className="source-metric source-metric-active">
            Manual active
          </span>
          <span className="source-metric source-metric-ready">
            {readyCount} file import ready
          </span>
          <span className="source-metric source-metric-not-connected">
            {futureCount} future connectors
          </span>
        </div>
      </div>

      <p className="integration-safety-notice">
        Manual entry, demo data, and user-approved files only. Vendor systems
        stay disconnected until the operator approves access.
      </p>

      <details className="data-source-details">
        <summary>
          <span>Connector readiness</span>
          <small>Manual active, CSV prepared, external systems not connected</small>
        </summary>

        <div className="data-source-list">
          {providers.map((provider) => (
            <article className="data-source-row" key={provider.id}>
              <div className="data-source-row-main">
                <div>
                  <p className="eyebrow">{provider.category}</p>
                  <h3>{provider.name}</h3>
                </div>
                <span className={`source-state ${statusClass(provider.status)}`}>
                  {provider.status}
                </span>
              </div>

              <p>{provider.notes}</p>

              <div className="data-source-row-meta">
                <span>Last sync: Never</span>
                <span>{provider.connectionType}</span>
                {provider.id === 'csv' ? <span>CSV import prepared</span> : null}
              </div>

              <button
                type="button"
                className="secondary-button data-source-action"
                disabled={!canOpenPlaceholder(provider)}
                onClick={() => setSelectedProvider(provider)}
              >
                {actionLabel(provider)}
              </button>
            </article>
          ))}
        </div>

        <p className="csv-import-note">{CSV_IMPORT_NOTE}</p>
      </details>

      {selectedProvider ? (
        <div
          className="modal-backdrop no-print"
          role="presentation"
          onClick={() => setSelectedProvider(null)}
        >
          <section
            className="integration-modal"
            role="dialog"
            aria-modal="true"
            aria-label={`${selectedProvider.name} connector status`}
            onClick={(event) => event.stopPropagation()}
          >
            <p className="eyebrow">Connector Status</p>
            <h2>{selectedProvider.name}</h2>
            <p>
              This connector is not active. It requires written approval, vendor
              access, and credentials before use.
            </p>
            <button
              type="button"
              className="primary-button"
              onClick={() => setSelectedProvider(null)}
            >
              Close
            </button>
          </section>
        </div>
      ) : null}
    </section>
  );
}
