import { OrganizerEntry } from '../../utils/todoFilters';

// ── Column model ─────────────────────────────────────────────────────────────
export type ColKey =
  | 'title'
  | 'status'
  | 'priority'
  | 'date'
  | 'start'
  | 'end'
  | 'percent'
  | 'collection'
  | 'xp'
  | 'notes';

export interface ColDef {
  key: ColKey;
  label: string;
  defaultWidth: number;
}

export const COLUMNS: ColDef[] = [
  { key: 'title', label: 'Name', defaultWidth: 320 },
  { key: 'status', label: 'Status', defaultWidth: 140 },
  { key: 'priority', label: 'Priority', defaultWidth: 120 },
  { key: 'date', label: 'Date', defaultWidth: 150 },
  { key: 'start', label: 'Start', defaultWidth: 110 },
  { key: 'end', label: 'End', defaultWidth: 110 },
  { key: 'percent', label: '%', defaultWidth: 90 },
  { key: 'collection', label: 'Collection', defaultWidth: 240 },
  { key: 'xp', label: 'XP', defaultWidth: 80 },
  { key: 'notes', label: 'Notes', defaultWidth: 280 },
];

// The Name column is pinned first and can never be hidden — every other field
// can be reordered and toggled via the Fields menu.
export const NAME_COL_KEY: ColKey = 'title';

export type EditState = { id: string; col: ColKey; rect: DOMRect | null } | null;

// ── View filter / sort rules ──────────────────────────────────────────────────
export type FilterCondition = 'is' | 'is_not' | 'contains' | 'greater_than' | 'less_than';

export interface FilterRule {
  id: string;
  field: ColKey;
  condition: FilterCondition;
  value: string;
}

export const FILTER_CONDITIONS: { value: FilterCondition; label: string }[] = [
  { value: 'is', label: 'is' },
  { value: 'is_not', label: 'is not' },
  { value: 'contains', label: 'contains' },
  { value: 'greater_than', label: 'greater than' },
  { value: 'less_than', label: 'less than' },
];

export interface SortRule {
  id: string;
  field: ColKey;
  direction: 'asc' | 'desc';
}

// A todo placed in the tree: its structural parent + depth + display order.
export interface FlatNode {
  id: string;
  parentId: string | null;
  depth: number;
  entry: OrganizerEntry;
  hasChildren: boolean;
}
