import { format, parseISO } from 'date-fns';
import { OrganizerEntry, collectionOf, collectionPath } from '../../utils/todoFilters';
import { Todo } from '../../types';
import { formatTime12h } from '../../utils/timeUtils';
import { ColKey, FilterRule, FlatNode, GroupRow } from './types';

// Returns a display-formatted string for a field — what the user sees in the
// table cell. This is used for the filter value dropdown and for filter matching.
export function getFieldDisplayValue(
  entry: OrganizerEntry,
  field: ColKey,
  todoById: Map<string, Todo>
): string {
  const { todo, date } = entry;
  switch (field) {
    case 'title': return todo.text || '';
    case 'status': {
      const STATUS_LABELS: Record<string, string> = { todo: 'Todo', in_progress: 'In Progress', completed: 'Completed' };
      return todo.status ? (STATUS_LABELS[todo.status] ?? todo.status) : '';
    }
    case 'priority': {
      const PRIORITY_LABELS: Record<string, string> = { low: 'Low', medium: 'Medium', high: 'High' };
      return todo.priority ? (PRIORITY_LABELS[todo.priority] ?? todo.priority) : '';
    }
    case 'date': {
      try { return date ? format(parseISO(date), 'MMM d, yyyy') : ''; }
      catch { return date || ''; }
    }
    case 'start': return todo.startTime ? formatTime12h(todo.startTime) : '';
    case 'end': return todo.endTime ? formatTime12h(todo.endTime) : '';
    case 'percent': return todo.percentageGoal !== undefined ? `${todo.percentageGoal}%` : '';
    case 'collection': {
      const coll = collectionOf(todo, todoById);
      return collectionPath(coll, todoById).map((c) => c.text || 'Untitled').join(' / ');
    }
    case 'xp': return todo.xp !== undefined ? String(todo.xp) : '';
    case 'notes': return todo.notes || '';
    default: return '';
  }
}

// Returns a sortable raw value: ISO dates for correct lexicographic date sort,
// bare numbers for numeric fields, display strings for everything else.
export function getFieldRawValue(
  entry: OrganizerEntry,
  field: ColKey,
  todoById: Map<string, Todo>
): string {
  const { todo, date } = entry;
  switch (field) {
    case 'date': return date || '';
    case 'start': return todo.startTime || '';
    case 'end': return todo.endTime || '';
    case 'percent': return todo.percentageGoal !== undefined ? String(todo.percentageGoal) : '';
    case 'xp': return todo.xp !== undefined ? String(todo.xp) : '';
    default: return getFieldDisplayValue(entry, field, todoById);
  }
}

// Compare two raw values: numeric when both parse, empty values sort last,
// locale-string otherwise.
export function compareRawValues(a: string, b: string): number {
  if (!a && b) return 1;
  if (a && !b) return -1;
  if (!a && !b) return 0;
  const na = parseFloat(a), nb = parseFloat(b);
  if (!isNaN(na) && !isNaN(nb)) return na - nb;
  return a.localeCompare(b);
}

// ── Group-by helpers ──────────────────────────────────────────────────────────

// Colors for group headers when grouping by status or priority.
// Kept in sync with STATUS_OPTIONS / PRIORITY_OPTIONS in todoFields.tsx.
const FIELD_GROUP_COLORS: Partial<Record<ColKey, Record<string, string>>> = {
  status: {
    'Todo':        '#6b7280',
    'In Progress': '#3b82f6',
    'Completed':   '#22c55e',
  },
  priority: {
    'Low':    '#64748b',
    'Medium': '#f59e0b',
    'High':   '#ef4444',
  },
};

// Preferred sort order for well-known group values (others fall back to alpha).
const FIELD_GROUP_ORDER: Partial<Record<ColKey, string[]>> = {
  status:   ['Todo', 'In Progress', 'Completed'],
  priority: ['High', 'Medium', 'Low'],
};

const NONE_LABEL = '(None)';
const NONE_COLOR = '#9ca3af';

export function getGroupColor(field: ColKey, label: string): string {
  return FIELD_GROUP_COLORS[field]?.[label] ?? NONE_COLOR;
}

const sortTasks = (tasks: OrganizerEntry[], sortFn?: (a: OrganizerEntry, b: OrganizerEntry) => number) => {
  const out = [...tasks];
  if (sortFn) out.sort(sortFn);
  else out.sort((a, b) => (a.todo.hubOrder ?? a.todo.createdAt) - (b.todo.hubOrder ?? b.todo.createdAt));
  return out;
};

const toTaskRows = (tasks: OrganizerEntry[]): GroupRow[] =>
  tasks.map((t) => ({
    type: 'task' as const,
    node: { id: t.todo.id, parentId: null, depth: 0, entry: t, hasChildren: false } satisfies FlatNode,
  }));

// Build the flat list of rows for the grouped rendering mode.
// Tasks with no value for the group field are not placed in a "(None)" section —
// instead they float to the top or bottom per `showLeafTasks`. Collections are
// always skipped since they're structural, not data rows.
export function buildGroupedItems(
  entries: OrganizerEntry[],
  groupField: ColKey,
  todoById: Map<string, Todo>,
  collapsed: Set<string>,
  sortFn?: (a: OrganizerEntry, b: OrganizerEntry) => number,
  showLeafTasks: 'top' | 'bottom' | 'none' = 'bottom'
): GroupRow[] {
  const tasks = entries.filter((e) => !e.todo.isCollection);

  // Separate tasks that have a value from those that don't.
  const ungrouped: OrganizerEntry[] = [];
  const groups = new Map<string, OrganizerEntry[]>();
  for (const task of tasks) {
    const key = getFieldDisplayValue(task, groupField, todoById);
    if (!key) {
      ungrouped.push(task);
    } else {
      const arr = groups.get(key) ?? [];
      arr.push(task);
      groups.set(key, arr);
    }
  }

  // Sort group keys: defined order first, then alpha.
  const order = FIELD_GROUP_ORDER[groupField] ?? [];
  const sortedKeys = [...groups.keys()].sort((a, b) => {
    const ia = order.indexOf(a), ib = order.indexOf(b);
    if (ia !== -1 && ib !== -1) return ia - ib;
    if (ia !== -1) return -1;
    if (ib !== -1) return 1;
    return a.localeCompare(b);
  });

  const groupRows: GroupRow[] = [];
  for (const key of sortedKeys) {
    const groupTasks = groups.get(key)!;
    const id = `__grp:${groupField}:${key}`;
    const isCollapsed = collapsed.has(id);
    groupRows.push({ type: 'header', id, label: key, color: getGroupColor(groupField, key), count: groupTasks.length, isCollapsed });
    if (!isCollapsed) {
      groupRows.push(...toTaskRows(sortTasks(groupTasks, sortFn)));
    }
  }

  // Place ungrouped tasks before or after all sections (never in their own section).
  const ungroupedRows = toTaskRows(sortTasks(ungrouped, sortFn));
  return showLeafTasks === 'top'
    ? [...ungroupedRows, ...groupRows]
    : [...groupRows, ...ungroupedRows];
}

// Returns true if the entry's field value satisfies the filter rule.
// An empty filter value passes every entry (the rule is considered unset).
export function matchesFilter(
  entry: OrganizerEntry,
  rule: FilterRule,
  todoById: Map<string, Todo>
): boolean {
  if (!rule.value) return true;
  const val = getFieldDisplayValue(entry, rule.field, todoById).toLowerCase();
  const filterVal = rule.value.toLowerCase();
  switch (rule.condition) {
    case 'is': return val === filterVal;
    case 'is_not': return val !== filterVal;
    case 'contains': return val.includes(filterVal);
    case 'greater_than': {
      const nv = parseFloat(val), nf = parseFloat(filterVal);
      return !isNaN(nv) && !isNaN(nf) ? nv > nf : val > filterVal;
    }
    case 'less_than': {
      const nv = parseFloat(val), nf = parseFloat(filterVal);
      return !isNaN(nv) && !isNaN(nf) ? nv < nf : val < filterVal;
    }
    default: return true;
  }
}
