# Timeline View — Feature Ideation

Third view for the Task Planner, alongside Table (done) and List (in progress). This
document is a brainstorm of features, abilities, and customization options to make
Timeline view feature-rich and competitive with Notion, Asana, and ClickUp timelines.
Nothing here is committed to — it's a menu to pick from when we scope the actual build.

## Grounding in what we already have

- Every row (task *or* collection) is one `todos` record with `parentId` self-nesting
  and an `isCollection` flag — a timeline needs to render both task bars and
  collection/section groupings from the same tree.
- Tasks already carry `startDate`/`dueDate` + `startTime`/`dueTime`, so date-only bars
  and intraday (hour-level) bars are both possible without schema changes.
- `repeatInterval` is a simple "every N days" field — recurring bars on a timeline is
  a natural showcase for this, but true RRULE-style recurrence would need schema work.
- Filter/Sort/Group menus, column-style field config, and drag-to-reorder/reparent
  already exist for Table view (`FilterMenu`, `SortMenu`, `SectionsMenu`,
  `useRowDnD`/`useCollectionDnD`) — Timeline should reuse these mechanisms/state rather
  than reinvent them, so filtering/grouping stays consistent across all three views.
- No gantt/calendar library is installed. `date-fns`, `recharts`, `motion`, and
  `@dnd-kit/*` are available; the timeline grid, bars, and drag interactions would be
  hand-built on top of these.

## 1. Core timeline rendering

- Horizontal axis of dates with rows per task/collection (classic Gantt layout).
- Zoom levels: day / week / month / quarter / year — with the row grid density and
  bar label detail adapting per zoom.
- "Today" marker line, with a jump-to-today button.
- Weekend shading / non-working-day shading.
- Bars sized by `startDate`→`dueDate`; tasks with only a due date render as a
  milestone diamond/point instead of a bar.
- Hour-level precision option for same-day tasks using `startTime`/`dueTime` (zoom into
  a single day and see intraday blocks, similar to a calendar day view).
- Infinite/virtualized horizontal scroll instead of paginating by date range.
- Sticky left-hand list of task names (mirrors Table's sticky first column) so the
  name stays visible while scrolling the time axis horizontally.

## 2. Grouping & structure

- Group rows by Collection (respecting the existing nested tree), by Status, Priority,
  or by a custom attribute — reusing `SectionsConfig` from Table/List.
- Collapsible collection swimlanes, collapsible sub-collections (arbitrary depth,
  matching `parentId` nesting).
- Collection bar = min(start) → max(due) of its children, auto-rolled-up, shown as a
  lighter "envelope" bar behind/above its children's bars.
- Option to show only leaf tasks vs. show collections as bars themselves.
- Swimlane per Priority or per Assignee-equivalent (if collaboration/assignees ever
  ship) as an alternate grouping axis.

## 3. Editing & interaction directly on the timeline

- Drag a bar horizontally to shift both start and due date together.
- Drag the left/right edge of a bar independently to resize (change start or due
  date without moving the other).
- Click-drag on empty grid space to create a new task with start/due pre-filled from
  where you dragged.
- Drag a task vertically between collections to reparent it (same interaction model
  as `useCollectionDnD` in Table).
- Inline rename on double-click of a bar label.
- Right-click context menu on a bar (same actions as `RowContextMenu`: duplicate,
  delete, change collection, set priority/status, etc.).
- Multi-select bars (shift/cmd-click or marquee-select) to bulk-drag/bulk-edit dates.
- Undo/redo for drag operations (snap-back on invalid drop, toast with "Undo").
- Snapping: bars snap to day/hour gridlines while dragging (configurable snap
  increment based on zoom level).

## 4. Dependencies & relationships

- Task-to-task dependency lines (finish-to-start at minimum: "Task B starts after
  Task A finishes"), drawn as connector arrows between bars.
- Auto-shift dependent tasks when a predecessor's dates move (with an optional
  "ask before cascading" confirmation).
- Critical-path highlighting (visually distinguish the chain of dependent tasks that
  determines the overall end date).
- Would require a new `dependsOn`/`blockedBy` relation — not in the current schema,
  flagged as a bigger lift.

## 5. Recurrence on the timeline

- Render each recurrence of a `repeatInterval` task as its own ghosted/lighter bar
  extending forward on the timeline (visual preview of upcoming occurrences).
- Quick-create a recurring series directly from the timeline via drag ("repeat this
  bar every N days for the next M occurrences").

## 6. Visual customization

- Color bars by Collection color (already have a `color` field), by Priority, or by
  Status — user-selectable "color by" toggle, same pattern as Table's field coloring.
- Progress-fill inside each bar (reusing `startPercentage`/`duePercentage` /
  `calculateProgress` from `timeUtils.ts`) so a bar shows partial completion, not just
  scheduled span.
- Bar density/height toggle (compact vs. comfortable row height).
- Show/hide XP, notes icon (hover-to-preview notes), estimated-time chip, priority
  flag directly on the bar.
- Configurable date-axis format (relative "in 3 days" vs. absolute "Jul 4").
- Optional "milestone" bar style (diamond) vs. duration bar style, auto-selected when
  start === due but user-overridable.

## 7. Filtering, sorting & views

- Reuse existing `FilterRule`/`SortRule` engines: filter timeline by status, priority,
  collection, date range, overdue-only, etc.
- Sort rows within a swimlane by start date, priority, or manual order
  (`hubOrder`/`dailyOrder`-style custom ordering, drag to reorder rows vertically).
- Saved timeline "layouts" per collection/workspace (remembered zoom level, grouping,
  filters — same persistence pattern as `useHubViewConfig`).
- Toggle to include/exclude tasks with no dates (list them in an "unscheduled" tray
  alongside the timeline, draggable onto the grid to schedule them).
- Search/highlight: typing a query dims non-matching bars and highlights matches.

## 8. Overview & navigation aids

- Minimap/overview strip at the top showing the full project span, with a draggable
  viewport window (like a video editor scrubber) for fast navigation on long timelines.
- "Fit to screen" button that zooms/scrolls to fit all visible tasks' date ranges.
- Keyboard shortcuts: arrow keys to pan, +/- to zoom, `T` to jump to today.
- Breadcrumb of current collection scope when drilled into a nested collection's
  own timeline.

## 9. Collaboration & feedback (future-facing, matches existing "collaboration" backlog item)

- Avatars/initials on bars if multi-user assignment ships.
- Comment indicator on bars linking to task notes/discussion.
- Live cursor/presence on the timeline grid if realtime collaboration is added
  (there's already a backlog note about Sequin/streaming for this).

## 10. Export & sharing

- Export current timeline view as an image or PDF for status reports.
- Print-friendly layout (flatten zoom/scroll into a single page range).
- Shareable read-only link to a filtered timeline view.

## Suggested phasing (not a commitment, just a sane build order)

1. **MVP**: static horizontal date grid, task bars from start/due dates, day/week/month
   zoom, grouped by collection (reusing existing tree + SectionsConfig), today marker.
2. **Interaction**: drag to move/resize bars, click-drag to create, reparent via
   vertical drag, right-click menu, undo.
3. **Depth**: dependencies + critical path, recurrence preview, unscheduled tray,
   saved layouts, minimap.
4. **Polish**: color-by toggles, progress fill, export/print, collaboration presence.
