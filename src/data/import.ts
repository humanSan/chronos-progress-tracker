import type { Todo, Tracker, Workspace } from '../types';
import type { UserSettings, HubLayout } from './settings';
import { apiFetch } from './apiClient';
import type { TodoBatch } from './todos';

// ─────────────────────────────────────────────────────────────────────────────
// One-time localStorage → DB import (Phase 6, DATABASE_MIGRATION_NOTES §5.6).
// Runs automatically on first authenticated load when the DB is empty and local
// prototype data exists. Reads the old `dun-*` keys, normalizes legacy completion
// (status is the source of truth), remaps the global-PK workspace ids (the legacy
// fixed 'personal' id would collide across users), and uploads via the existing
// API. Local data is left intact as a fallback — only a flag is written.
// ─────────────────────────────────────────────────────────────────────────────

// Legacy localStorage keys (kept literal here so the hub constants can be removed).
const LS = {
  todos: 'dun-todos',
  trackers: 'dun-trackers',
  workspaces: 'dun-workspaces',
  activeWorkspace: 'dun-active-workspace',
  theme: 'dun-theme',
  weekStartsOn: 'dun-week-starts-on',
  countdownMode: 'dun-countdown-mode',
  xpEnabled: 'dun-xp-enabled',
  hubViews: 'dun-hub-views',
  hubColWidths: 'dun-hub-col-widths',
  hubCollapsed: 'dun-hub-collapsed',
  hubView: 'dun-hub-view',
  sidebarWidth: 'dun-hub-sidebar-width',
  sidebarHidden: 'dun-hub-sidebar-hidden',
  sidebarCollapsed: 'dun-hub-sidebar-collapsed',
} as const;

export const IMPORTED_FLAG = 'dun-db-imported';

// The legacy implicit single-workspace id (pre-workspaces era). Todos with no
// workspaceId belonged here.
const LEGACY_WS_ID = 'personal';

function readJSON<T>(key: string, fallback: T): T {
  const raw = localStorage.getItem(key);
  if (raw == null) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export interface LocalData {
  workspaces: Workspace[];
  todos: Todo[];
  trackers: Tracker[];
  activeWorkspaceId: string;
  theme?: any;
  weekStartsOn?: number;
  countdownMode?: 'off' | 'time' | 'percent';
  xpEnabled?: boolean;
  hubViews?: Record<string, any>;
  hubColWidths?: Record<string, number>;
  hubCollapsed?: string[];
  hubLayout?: HubLayout;
}

// Read everything importable from localStorage. Returns null when there's no core
// domain data worth importing (todos/trackers/workspaces all empty).
export function readLocalData(): LocalData | null {
  const todos = readJSON<Todo[]>(LS.todos, []) ?? [];
  const trackers = readJSON<Tracker[]>(LS.trackers, []) ?? [];
  let workspaces = readJSON<Workspace[]>(LS.workspaces, []) ?? [];

  if (todos.length === 0 && trackers.length === 0 && workspaces.length === 0) return null;

  // Ensure a workspace exists for every id referenced by a todo (undefined/''
  // means the legacy 'personal' workspace). Synthesize any that are missing.
  const referenced = new Set<string>();
  for (const t of todos) referenced.add(t?.workspaceId || LEGACY_WS_ID);
  const known = new Set(workspaces.map((w) => w.id));
  for (const id of referenced) {
    if (!known.has(id)) {
      workspaces.push({ id, name: id === LEGACY_WS_ID ? 'Personal' : 'Workspace' });
    }
  }
  // Guarantee at least one workspace if there are todos but no workspace list.
  if (workspaces.length === 0 && todos.length > 0) {
    workspaces = [{ id: LEGACY_WS_ID, name: 'Personal' }];
  }

  const xpRaw = localStorage.getItem(LS.xpEnabled);
  const widthRaw = localStorage.getItem(LS.sidebarWidth);
  const hubLayout: HubLayout = {
    selectedView: localStorage.getItem(LS.hubView) || undefined,
    sidebarWidth: widthRaw ? Number(widthRaw) : undefined,
    sidebarHidden: localStorage.getItem(LS.sidebarHidden) === '1',
    sidebarCollapsed: readJSON<string[]>(LS.sidebarCollapsed, []),
  };

  const weekRaw = localStorage.getItem(LS.weekStartsOn);
  const countdown = localStorage.getItem(LS.countdownMode) as LocalData['countdownMode'] | null;

  return {
    workspaces,
    todos,
    trackers,
    activeWorkspaceId: localStorage.getItem(LS.activeWorkspace) || '',
    theme: readJSON<any>(LS.theme, undefined),
    weekStartsOn: weekRaw != null ? parseInt(weekRaw, 10) : undefined,
    countdownMode: countdown ?? undefined,
    xpEnabled: xpRaw != null ? xpRaw !== 'false' : undefined,
    hubViews: readJSON<Record<string, any>>(LS.hubViews, undefined as any),
    hubColWidths: readJSON<Record<string, number>>(LS.hubColWidths, undefined as any),
    hubCollapsed: readJSON<string[]>(LS.hubCollapsed, undefined as any),
    hubLayout,
  };
}

export interface ImportPayload {
  workspaces: Workspace[];
  todos: Todo[]; // topologically sorted (parents before children) for FK inserts
  trackers: Tracker[];
  settings: Partial<UserSettings>;
}

const genId = () => Math.random().toString(36).substr(2, 9);

// Order todos so every parent precedes its children (the FK on parent_id is
// checked per-statement, so a child can't be inserted before its parent).
function topoSort(todos: Todo[]): Todo[] {
  const byId = new Map(todos.map((t) => [t.id, t]));
  const out: Todo[] = [];
  const seen = new Set<string>();
  const visit = (t: Todo) => {
    if (seen.has(t.id)) return;
    seen.add(t.id);
    const parent = t.parentId ? byId.get(t.parentId) : undefined;
    if (parent) visit(parent);
    out.push(t);
  };
  for (const t of todos) visit(t);
  return out;
}

// Build the upload payload: remap workspace ids (keeps todo/tracker ids — only the
// shared 'personal' workspace id is a real collision risk), normalize completion,
// drop the legacy `completed` field, and remap the hub view-config blobs that key
// off workspace ids.
export function buildImportPayload(local: LocalData): ImportPayload {
  const wsIdMap = new Map<string, string>();
  for (const w of local.workspaces) wsIdMap.set(w.id, genId());
  const mapWs = (id?: string) => wsIdMap.get(id || LEGACY_WS_ID) ?? wsIdMap.get(LEGACY_WS_ID)!;

  const workspaces: Workspace[] = local.workspaces.map((w) => ({ id: wsIdMap.get(w.id)!, name: w.name }));

  const todoIds = new Set(local.todos.map((t) => t.id));
  const todos: Todo[] = local.todos.map((t) => {
    const { ...rest } = t as Todo & { completed?: boolean };
    const legacyCompleted = (t as any).completed === true;
    const done = t.status === 'completed' || legacyCompleted;
    const status = done ? 'completed' : t.status ?? 'todo';
    // Drop a parentId that points outside the imported set (would break the FK).
    const parentId = t.parentId && todoIds.has(t.parentId) ? t.parentId : t.parentId ? null : t.parentId;
    const next: Todo = {
      ...rest,
      status,
      parentId,
      workspaceId: mapWs(t.workspaceId),
      createdAt: t.createdAt ?? Date.now(),
    };
    delete (next as any).completed; // generated column server-side
    return next;
  });

  const trackers: Tracker[] = local.trackers.map((tr) => ({ ...tr, createdAt: tr.createdAt ?? Date.now() }));

  // Remap the workspace-id prefix in the per-view hub config keys (`wsId:viewId`).
  let hubViews = local.hubViews;
  if (hubViews) {
    const remapped: Record<string, any> = {};
    for (const [key, val] of Object.entries(hubViews)) {
      const sep = key.indexOf(':');
      if (sep > 0) {
        const ws = key.slice(0, sep);
        const rest = key.slice(sep + 1);
        remapped[`${wsIdMap.get(ws) ?? ws}:${rest}`] = val;
      } else {
        remapped[key] = val;
      }
    }
    hubViews = remapped;
  }

  const activeWorkspaceId =
    (local.activeWorkspaceId && wsIdMap.get(local.activeWorkspaceId)) || workspaces[0]?.id;

  const settings: Partial<UserSettings> = {};
  if (local.theme) settings.theme = local.theme;
  if (local.weekStartsOn != null && !Number.isNaN(local.weekStartsOn)) settings.weekStartsOn = local.weekStartsOn;
  if (local.countdownMode) settings.countdownMode = local.countdownMode;
  if (local.xpEnabled != null) settings.xpEnabled = local.xpEnabled;
  if (activeWorkspaceId) settings.activeWorkspaceId = activeWorkspaceId;
  if (hubViews) settings.hubViews = hubViews;
  if (local.hubColWidths) settings.hubColWidths = local.hubColWidths;
  if (local.hubCollapsed) settings.hubCollapsed = local.hubCollapsed;
  if (local.hubLayout) settings.hubLayout = local.hubLayout;

  return { workspaces, todos: topoSort(todos), trackers, settings };
}

// Upload the payload, respecting FK order: workspaces → todos (one batch) →
// trackers → settings. Throws on the first failed request.
export async function uploadImport(payload: ImportPayload): Promise<void> {
  for (const ws of payload.workspaces) {
    await apiFetch('/workspaces', { method: 'POST', body: JSON.stringify(ws) });
  }
  if (payload.todos.length) {
    const batch: TodoBatch = { upserts: payload.todos };
    await apiFetch('/todos/batch', { method: 'POST', body: JSON.stringify(batch) });
  }
  for (const tr of payload.trackers) {
    await apiFetch('/trackers', { method: 'POST', body: JSON.stringify(tr) });
  }
  if (Object.keys(payload.settings).length) {
    await apiFetch('/settings', { method: 'PUT', body: JSON.stringify(payload.settings) });
  }
}
