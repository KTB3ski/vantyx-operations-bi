import { useEffect } from 'react';
import { formatDateTime } from '../domain/formatters';
import type { SavedSnapshot } from '../domain/types';

interface SavedSnapshotsProps {
  activeId?: string;
  isOpen: boolean;
  snapshots: SavedSnapshot[];
  onClose: () => void;
  onOpen: () => void;
  onLoad: (snapshot: SavedSnapshot) => void;
  onDelete: (id: string) => void;
}

export function SavedSnapshots({
  activeId,
  isOpen,
  snapshots,
  onClose,
  onOpen,
  onLoad,
  onDelete,
}: SavedSnapshotsProps) {
  useEffect(() => {
    if (!isOpen) return undefined;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <>
      <button
        type="button"
        className="archive-bubble no-print"
        onClick={onOpen}
        aria-controls="saved-snapshots-drawer"
        aria-expanded={isOpen}
      >
        <span className="archive-bubble-mark" aria-hidden="true" />
        <span>Archive</span>
        {snapshots.length > 0 ? (
          <span className="archive-bubble-count">{snapshots.length}</span>
        ) : null}
      </button>

      {isOpen ? (
        <div
          className="archive-overlay no-print"
          role="presentation"
          onClick={onClose}
        >
          <aside
            id="saved-snapshots-drawer"
            className="saved-panel archive-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Saved snapshots"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="archive-drawer-header">
              <div>
                <p className="eyebrow">Local Archive</p>
                <h2>Saved Snapshots</h2>
              </div>
              <button
                type="button"
                className="archive-close"
                onClick={onClose}
                aria-label="Close saved snapshots"
              >
                Close
              </button>
            </div>

            {snapshots.length === 0 ? (
              <p className="empty-state">
                No saved snapshots yet. Saved snapshots stay on this device.
              </p>
            ) : (
              <ul className="snapshot-list">
                {snapshots.map((snapshot) => (
                  <li
                    key={snapshot.id}
                    className={
                      snapshot.id === activeId ? 'active-snapshot' : undefined
                    }
                  >
                    <button
                      type="button"
                      className="snapshot-load"
                      onClick={() => onLoad(snapshot)}
                    >
                      <strong>{snapshot.weekEnding || 'No week ending'}</strong>
                      <span>{snapshot.propertyLocation || 'No location set'}</span>
                      <small>{formatDateTime(snapshot.updatedAt)}</small>
                    </button>
                    <button
                      type="button"
                      className="delete-snapshot"
                      onClick={() => onDelete(snapshot.id)}
                      aria-label={`Delete snapshot ${snapshot.weekEnding || snapshot.id}`}
                    >
                      Delete
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </aside>
        </div>
      ) : null}
    </>
  );
}
