import { format, parseISO } from 'date-fns';
import { OrganizerEntry, collectionOf, collectionPath } from '../../utils/todoFilters';
import { Todo } from '../../types';
import { formatTime12h } from '../../utils/timeUtils';
import { ColKey, FilterRule } from './types';

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
    case 'status': return todo.status || '';
    case 'priority': return todo.priority || '';
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
