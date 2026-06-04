import { arrayMove } from '@dnd-kit/sortable';
import { OrganizerEntry } from '../../utils/todoFilters';
import { FlatNode } from './types';

// ── Tree helpers ─────────────────────────────────────────────────────────────

// Flatten the organizer todos into display order (depth-first by hubOrder),
// hiding collapsed nodes' children and, during a drag, the active node's subtree.
export function flattenTree(
  entries: OrganizerEntry[],
  opts: {
    collapsed?: Set<string>;
    excludeId?: string;
    // When provided, siblings are sorted by this comparator instead of hubOrder.
    sortFn?: (a: OrganizerEntry, b: OrganizerEntry) => number;
    // Segregate leaf tasks (non-collection items) to the top or bottom of each
    // sibling group. 'none' preserves the mixed order (default).
    leafPosition?: 'top' | 'bottom' | 'none';
  } = {}
): FlatNode[] {
  const ids = new Set(entries.map((e) => e.todo.id));
  const byParent = new Map<string | null, OrganizerEntry[]>();
  for (const e of entries) {
    const pid = e.todo.parentId && ids.has(e.todo.parentId) ? e.todo.parentId : null;
    const arr = byParent.get(pid) ?? [];
    arr.push(e);
    byParent.set(pid, arr);
  }
  for (const list of byParent.values()) {
    list.sort((a, b) => {
      // Leaf segregation takes precedence when enabled
      if (opts.leafPosition === 'top') {
        const diff = (a.todo.isCollection ? 1 : 0) - (b.todo.isCollection ? 1 : 0);
        if (diff !== 0) return diff;
      } else if (opts.leafPosition === 'bottom') {
        const diff = (a.todo.isCollection ? 0 : 1) - (b.todo.isCollection ? 0 : 1);
        if (diff !== 0) return diff;
      }
      // Then by user sort or hubOrder
      if (opts.sortFn) return opts.sortFn(a, b);
      return (a.todo.hubOrder ?? a.todo.createdAt) - (b.todo.hubOrder ?? b.todo.createdAt);
    });
  }
  const out: FlatNode[] = [];
  const walk = (pid: string | null, depth: number) => {
    for (const e of byParent.get(pid) ?? []) {
      const id = e.todo.id;
      const hasChildren = (byParent.get(id)?.length ?? 0) > 0;
      out.push({ id, parentId: pid, depth, entry: e, hasChildren });
      const skip = opts.collapsed?.has(id) || opts.excludeId === id;
      if (!skip) walk(id, depth + 1);
    }
  };
  walk(null, 0);
  return out;
}

// Given the rendered list plus where the active item is being dropped and how far
// it's been dragged horizontally, compute its projected depth + new parent.
export function getProjection(
  items: FlatNode[],
  activeId: string,
  overId: string,
  dragOffset: number,
  indentWidth: number
): { depth: number; parentId: string | null } | null {
  const overItemIndex = items.findIndex((i) => i.id === overId);
  const activeItemIndex = items.findIndex((i) => i.id === activeId);
  if (overItemIndex === -1 || activeItemIndex === -1) return null;

  const activeItem = items[activeItemIndex];
  const newItems = arrayMove(items, activeItemIndex, overItemIndex);
  const previousItem = newItems[overItemIndex - 1];
  const nextItem = newItems[overItemIndex + 1];

  const dragDepth = Math.round(dragOffset / indentWidth);
  const projectedDepth = activeItem.depth + dragDepth;
  const maxDepth = previousItem ? previousItem.depth + 1 : 0;
  const minDepth = nextItem ? nextItem.depth : 0;
  let depth = Math.max(minDepth, Math.min(projectedDepth, maxDepth));

  const getParentId = (): string | null => {
    if (depth === 0 || !previousItem) return null;
    if (depth === previousItem.depth) return previousItem.parentId;
    if (depth > previousItem.depth) return previousItem.id;
    const candidate = newItems
      .slice(0, overItemIndex)
      .reverse()
      .find((i) => i.depth === depth);
    return candidate ? candidate.parentId : null;
  };

  let parentId = getParentId();

  // A collection may only sit at the top level or nested under another
  // collection — never under a task. Snap its computed parent up to the nearest
  // collection ancestor and re-derive its depth from there.
  if (activeItem.entry.todo.isCollection) {
    const nodeById = new Map(items.map((i) => [i.id, i]));
    const nearestColl = (id: string | null): string | null => {
      let cur = id;
      const seen = new Set<string>();
      while (cur && nodeById.has(cur) && !seen.has(cur)) {
        seen.add(cur);
        const n = nodeById.get(cur)!;
        if (n.entry.todo.isCollection) return cur;
        cur = n.parentId;
      }
      return null;
    };
    parentId = nearestColl(parentId);
    depth = parentId ? nodeById.get(parentId)!.depth + 1 : 0;
  }

  return { depth, parentId };
}

// Rebuild a contiguous parent-grouped order from a (possibly detached) flat list,
// so subtasks always follow their parent after a drop.
export function orderFromFlat(
  nodes: { id: string; parentId: string | null }[]
): { id: string; parentId: string | null }[] {
  const byParent = new Map<string | null, string[]>();
  for (const n of nodes) {
    const arr = byParent.get(n.parentId) ?? [];
    arr.push(n.id);
    byParent.set(n.parentId, arr);
  }
  const out: { id: string; parentId: string | null }[] = [];
  const visited = new Set<string>();
  const walk = (pid: string | null) => {
    for (const id of byParent.get(pid) ?? []) {
      if (visited.has(id)) continue;
      visited.add(id);
      out.push({ id, parentId: pid });
      walk(id);
    }
  };
  walk(null);
  // Safety: any unreachable nodes (e.g. cycles) fall back to the root.
  for (const n of nodes) if (!visited.has(n.id)) { visited.add(n.id); out.push({ id: n.id, parentId: null }); }
  return out;
}
