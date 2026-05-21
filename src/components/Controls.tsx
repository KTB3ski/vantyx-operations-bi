interface ControlsProps {
  feedback: {
    kind: 'success' | 'warning' | 'error' | 'info';
    message: string;
  };
  isDesktop: boolean;
  isDemoMode: boolean;
  onLoadDemoMode: () => void;
  onExitDemoMode: () => void;
  onSave: () => void;
  onExportCsv: () => void;
  onPrint: () => void;
  onCopySummary: () => void;
  onAbout: () => void;
  onReset: () => void;
}

export function Controls({
  feedback,
  isDesktop,
  isDemoMode,
  onLoadDemoMode,
  onExitDemoMode,
  onSave,
  onExportCsv,
  onPrint,
  onCopySummary,
  onAbout,
  onReset,
}: ControlsProps) {
  return (
    <section className="controls-bar no-print" aria-label="Top controls">
      <div className="control-group">
        <button
          type="button"
          className={isDemoMode ? 'secondary-button' : 'primary-button'}
          onClick={onLoadDemoMode}
        >
          {isDemoMode ? 'Reload Demo' : 'Launch Demo Mode'}
        </button>
        {isDemoMode ? (
          <button type="button" className="danger-button" onClick={onExitDemoMode}>
            Exit Demo / Clear Draft
          </button>
        ) : null}
        <button type="button" className="primary-button" onClick={onSave}>
          Save Snapshot
        </button>
        <button type="button" className="secondary-button" onClick={onExportCsv}>
          Export CSV
        </button>
        <button type="button" className="secondary-button" onClick={onPrint}>
          Print / Export PDF
        </button>
        <button type="button" className="secondary-button" onClick={onCopySummary}>
          Copy Summary
        </button>
        <button type="button" className="secondary-button" onClick={onAbout}>
          About
        </button>
        <button type="button" className="danger-button" onClick={onReset}>
          Reset Draft
        </button>
      </div>
      <p className={`autosave-note feedback-${feedback.kind}`}>
        {feedback.message}
        <span>{isDesktop ? 'Desktop storage ready' : 'Browser storage ready'}</span>
      </p>
    </section>
  );
}
