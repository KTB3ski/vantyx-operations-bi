import type { SavedSnapshot, SnapshotDraft } from './types';
import type { AiSettings } from './aiActionPlan';

const DRAFT_KEY = 'vyntax.currentDraft';
const SNAPSHOTS_KEY = 'vyntax.savedSnapshots';
const AI_SETTINGS_KEY = 'vyntax.aiSettings';
const STORE_FILE = 'vyntax-store.json';

type NativeStore = {
  set: (key: string, value: unknown) => Promise<void>;
  get: <T>(key: string) => Promise<T | undefined>;
  delete: (key: string) => Promise<boolean>;
  save: () => Promise<void>;
};

let nativeStorePromise: Promise<NativeStore | null> | null = null;

export function isTauriRuntime() {
  return (
    typeof window !== 'undefined' &&
    Boolean((window as Window & { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__)
  );
}

function canUseLocalStorage() {
  return typeof window !== 'undefined' && Boolean(window.localStorage);
}

async function getNativeStore() {
  if (!isTauriRuntime()) return null;
  if (!nativeStorePromise) {
    nativeStorePromise = import('@tauri-apps/plugin-store')
      .then(({ Store }) =>
        Store.load(STORE_FILE, {
          autoSave: 100,
          defaults: {
            [DRAFT_KEY]: null,
            [SNAPSHOTS_KEY]: [],
            [AI_SETTINGS_KEY]: null,
          },
        }),
      )
      .catch((error) => {
        nativeStorePromise = null;
        throw error;
      });
  }
  return nativeStorePromise;
}

function loadLocalDraft(): SnapshotDraft | null {
  if (!canUseLocalStorage()) return null;
  const raw = window.localStorage.getItem(DRAFT_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as SnapshotDraft;
  } catch {
    return null;
  }
}

function loadLocalSnapshots(): SavedSnapshot[] {
  if (!canUseLocalStorage()) return [];
  const raw = window.localStorage.getItem(SNAPSHOTS_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as SavedSnapshot[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalSnapshots(snapshots: SavedSnapshot[]) {
  if (!canUseLocalStorage()) return;
  window.localStorage.setItem(SNAPSHOTS_KEY, JSON.stringify(snapshots));
}

export async function loadDraft(): Promise<SnapshotDraft | null> {
  const store = await getNativeStore();
  if (store) {
    return (await store.get<SnapshotDraft | null>(DRAFT_KEY)) ?? null;
  }
  return loadLocalDraft();
}

export async function saveDraft(draft: SnapshotDraft): Promise<void> {
  const payload = { ...draft, updatedAt: new Date().toISOString() };
  const store = await getNativeStore();
  if (store) {
    await store.set(DRAFT_KEY, payload);
    await store.save();
    return;
  }

  if (canUseLocalStorage()) {
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
  }
}

export async function clearDraft(): Promise<void> {
  const store = await getNativeStore();
  if (store) {
    await store.set(DRAFT_KEY, null);
    await store.save();
    return;
  }

  if (canUseLocalStorage()) {
    window.localStorage.removeItem(DRAFT_KEY);
  }
}

export async function loadSavedSnapshots(): Promise<SavedSnapshot[]> {
  const store = await getNativeStore();
  if (store) {
    const snapshots = await store.get<SavedSnapshot[]>(SNAPSHOTS_KEY);
    return Array.isArray(snapshots) ? snapshots : [];
  }
  return loadLocalSnapshots();
}

export async function writeSavedSnapshots(
  snapshots: SavedSnapshot[],
): Promise<void> {
  const store = await getNativeStore();
  if (store) {
    await store.set(SNAPSHOTS_KEY, snapshots);
    await store.save();
    return;
  }
  writeLocalSnapshots(snapshots);
}

export async function saveSnapshot(
  draft: SnapshotDraft,
): Promise<SavedSnapshot> {
  const snapshots = await loadSavedSnapshots();
  const now = new Date().toISOString();
  const id = draft.id || crypto.randomUUID();
  const existing = snapshots.find((snapshot) => snapshot.id === id);
  const snapshot: SavedSnapshot = {
    ...draft,
    id,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };
  const next = [
    snapshot,
    ...snapshots.filter((savedSnapshot) => savedSnapshot.id !== id),
  ];
  await writeSavedSnapshots(next);
  await saveDraft(snapshot);
  return snapshot;
}

export async function deleteSnapshot(id: string): Promise<void> {
  const snapshots = await loadSavedSnapshots();
  await writeSavedSnapshots(snapshots.filter((snapshot) => snapshot.id !== id));
}

export async function loadAiSettings(): Promise<AiSettings | null> {
  const store = await getNativeStore();
  if (store) {
    return (await store.get<AiSettings | null>(AI_SETTINGS_KEY)) ?? null;
  }

  if (!canUseLocalStorage()) return null;
  const raw = window.localStorage.getItem(AI_SETTINGS_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as AiSettings;
  } catch {
    return null;
  }
}

export async function saveAiSettings(settings: AiSettings): Promise<void> {
  const payload = {
    apiKey: settings.apiKey.trim(),
    model: settings.model,
  } satisfies AiSettings;
  const store = await getNativeStore();
  if (store) {
    await store.set(AI_SETTINGS_KEY, payload);
    await store.save();
    return;
  }

  if (canUseLocalStorage()) {
    window.localStorage.setItem(AI_SETTINGS_KEY, JSON.stringify(payload));
  }
}

export async function clearAiSettings(): Promise<void> {
  const store = await getNativeStore();
  if (store) {
    await store.set(AI_SETTINGS_KEY, null);
    await store.save();
    return;
  }

  if (canUseLocalStorage()) {
    window.localStorage.removeItem(AI_SETTINGS_KEY);
  }
}
