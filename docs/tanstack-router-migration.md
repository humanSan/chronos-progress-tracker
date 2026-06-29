# TanStack Router Migration Plan

Goal: move the app from a single 782-line `App.tsx` god component that swaps the
whole tree via `activeView` state + conditional early-returns, to a production
SaaS architecture built on **TanStack Router**: a persistent shell, URL-driven
navigation, a non-blocking auth boundary, per-route code-splitting and error
boundaries, and per-view state in typed search params. This eliminates the whole
class of bugs (focus-flash + form wipe, view-switch remounts losing state, no
deep-linking/back-forward, whole-app crashes).

Each step is independently shippable and ordered so the app keeps working
throughout. Server REST API and the react-query data hooks are **kept as-is** —
they're the strongest part of the codebase; we wrap them, not rewrite them.

---

## Target architecture

### Route tree (file-based, `src/routes/`)
```
__root.tsx                 Root: router context (queryClient, auth), <Outlet>, devtools, root errorComponent
routes/login.tsx           Public: AuthModal as /login (its own durable route)
routes/_authed.tsx         Pathless guard+shell: beforeLoad redirects to /login if no session; renders AppShell + <Outlet>
routes/_authed/index.tsx   Redirect to last view (default /today)
routes/_authed/today.tsx       TodoView          search: { date? }
routes/_authed/planner.tsx     TodosHubView      search: { view?, mode? } (+ optional task? for full view)
routes/_authed/calendar.tsx    CalendarView      search: { date?, days? }
routes/_authed/stats.tsx       StatsView         search: { interval?, table? }
routes/_authed/trackers.tsx    Trackers grid
```

### Key pieces
- **Persistent shell** (`AppShell`): the current `Sidebar` + chrome, rendered once
  by `_authed.tsx`; only the `<Outlet>` content changes on navigation → no remount
  of sibling views, scroll/menu/edit state preserved.
- **Auth boundary**: `_authed.tsx`'s `beforeLoad` resolves the session from cache
  and `redirect`s to `/login` only on a *confirmed* null. First load shows a
  pending component; window-focus revalidation does **not** re-run the guard, so
  no flash and no form wipe.
- **Router context**: `createRouter({ context: { queryClient, auth } })` so route
  `loader`s can `ensureQueryData` and `beforeLoad` can read auth.
- **Search params as state**: `validateSearch` gives typed, deep-linkable per-view
  state (date, view, mode, …) replacing remount-fragile `useState`.

---

## Dependencies

Add: `@tanstack/react-router`, `@tanstack/react-router-devtools`,
`@tanstack/router-plugin` (Vite, file-based route generation). Optionally
`@tanstack/react-query-persist-client` + `@tanstack/query-sync-storage-persister`
for step 6.

---

## Step 0 — Scaffolding (no behavior change)

- Add the deps above.
- `vite.config.ts`: add `TanStackRouterVite()` plugin (before `react()`), keeping
  existing `tailwindcss`, `svgr`, the `@` alias, and the `/api` proxy untouched.
- Create `src/routes/__root.tsx` with a root route that renders only `<Outlet/>`
  (plus devtools in dev). Generate `routeTree.gen.ts`.
- Create `src/router.tsx`: `createRouter({ routeTree, context: { queryClient } })`
  and the `declare module '@tanstack/react-router'` register block.
- **Do not** wire `RouterProvider` into `main.tsx` yet — this step just compiles.
- Verify: `npm run lint` + `vite build` pass; app still renders via existing `App`.

## Step 1 — Shell + routes for the 5 views (kills view-switch remounts)

The highest-payoff step. Stand up the real router alongside the existing handlers.

- `src/components/AppShell.tsx`: extract the persistent chrome from `App.tsx`
  render (`App.tsx:498-510`) — the outer container + `<Sidebar>` + the `pl-14`
  content wrapper — and render `<Outlet/>` where the view switch used to be. The
  trackers-only header (`App.tsx:512-565`) and fullscreen affordances move with it
  (or into `trackers.tsx`).
- `routes/_authed.tsx`: render `AppShell`. (Auth guard added in step 2; for now it
  just renders the shell so we can move incrementally.)
- One route module per view, each rendering today's component with the same props:
  - `today.tsx` → `TodoView`
  - `planner.tsx` → `TodosHubView`
  - `calendar.tsx` → `CalendarView`
  - `stats.tsx` → `StatsView`
  - `trackers.tsx` → trackers grid + `ActiveTodoTracker`
- **Handler/data sourcing**: to avoid moving all ~20 handlers at once, lift the
  data + handler assembly currently in `App.tsx` into a `useAppData()` hook (or a
  Context provider mounted in `_authed.tsx`) that each route reads. This is the
  bridge that lets routes get their props without `App` drilling them. (Full
  decomposition into feature hooks is step 7.)
- `Sidebar`: replace `onViewChange(setActiveView)` with router `<Link>`/`navigate`;
  derive active state from the current route, not `activeView`.
- `index.tsx`: redirect `/` → `/today` (later: last-visited via settings).
- `main.tsx`: swap `<App/>` for `<RouterProvider router={router}/>` inside the
  existing `QueryClientProvider`. `App.tsx` is now retired (kept only until its
  remaining logic — stopwatch, seeding effects — is relocated to the shell).
- Migrate `activeView` persistence: drop `localStorage 'dun-active-view'`
  (`App.tsx:117-125`); the URL is now the source of truth.
- Verify: switch views via sidebar and URL; confirm back/forward works; confirm
  the hub's open menus / a half-typed cell edit and `TodoView`'s scroll survive a
  tab switch (they no longer remount).

## Step 2 — Auth as a route boundary (fixes the focus-flash + form wipe)

- `routes/login.tsx`: render `AuthModal` as a public route. Persist its form draft
  (email/mode) to `sessionStorage` so a refresh/remount never wipes typed input
  (`AuthModal.tsx` form state lines ~26-34). Keep the password-reset
  `window.location.search` handling.
- `routes/_authed.tsx` `beforeLoad`: read the session (cached) from
  `context.auth` / `authClient.getSession()`. If confirmed null →
  `throw redirect({ to: '/login', search: { redirect: location.href } })`.
  Only redirect on a *confirmed* unauthenticated result, never on a pending
  background revalidation.
- Remove the four early-return gates from the old flow (`App.tsx:466-496`): session
  pending, `!isAuthenticated`, error, data-loading. Replace with:
  - first-load pending → router `defaultPendingComponent` (a `LoadingScreen`),
  - auth → the `beforeLoad` redirect above,
  - data loading/error → route `loader` + `pendingComponent`/`errorComponent`
    (step 3).
- Keep the cross-account safety: the `userId`-change `queryClient.clear()` effect
  (`App.tsx:76-84`) moves into the shell (or becomes a router `onSessionChange`).
- Login success → `navigate` to the `redirect` search param (or `/today`).
- Verify: on `/login`, focus another window and return — **no loading flash, typed
  text preserved**; signing in lands on the intended page; visiting a deep link
  while logged out redirects to login then back after auth.

## Step 3 — Error boundaries + route loaders + pending UI

- Root `errorComponent` in `__root.tsx`: app-level fallback (replaces "one throw
  kills everything"; there are currently **no** error boundaries).
- Per-route `errorComponent` for each view so a crashing view shows a localized
  fallback with retry.
- Route `loader`s use `context.queryClient.ensureQueryData(...)` for that view's
  data (e.g. planner/today/calendar need todos+workspaces+settings; stats needs
  todos). Pair with `pendingComponent` (skeleton) and **`pendingMs`/stale-while-
  revalidate** so background refetches never flash a loader over data you already
  have — the initial-vs-background distinction we identified.
- Verify: throw in a view → only that route shows the fallback; cold load shows a
  skeleton; a focus refetch shows no loader.

## Step 4 — Per-view state into typed search params (deep-linking)

Promote navigational view state from `useState` to `validateSearch` schemas:
- `today`: `{ date?: string }` (replaces `TodoView` `selectedDate` `useState:74`).
- `calendar`: `{ date?: string; days?: 1|3|7|30 }` (replaces `focusDate`/`dayCount`).
- `stats`: `{ interval?: ...; table?: 'log'|'raw' }` (replaces the localStorage
  `chronos-stats-*` keys).
- `planner`: `{ view?: string; mode?: 'table'|'list'; task?: string }`. Note `view`
  and `mode` are already DB-synced per-workspace via `useSyncedLayout`. Recommended
  semantics: **URL param wins when present; otherwise fall back to the DB-synced
  default; on change write-through to both** (URL for shareability, settings for
  cross-device default). `task` opens the full-view as a deep-linkable overlay.
- Use `Link`/`navigate` with `search` updaters; read via `Route.useSearch()`.
- Verify: copy a URL (specific date / collection / list mode / open task), open in
  a new tab → lands in the exact same state; back/forward steps through it.

## Step 5 — Route-based modals + lazy loading

- Convert shareable overlays to routes/search: todo full view (`?task=` or a child
  route), account settings (`/settings`). Keep transient popovers (context menus,
  toolbar menus, stopwatch) as local overlays — once views stop remounting these
  are already safe.
- Code-split: make heavy routes lazy (`.lazy.tsx` / `createLazyFileRoute`) —
  calendar, stats, planner — shrinking the single bundle (currently no splitting).
- Verify: network panel shows per-route chunks; modals are back-button-closable.

## Step 6 — Harden react-query

- Add `persistQueryClient` (sync storage persister) so reloads paint instantly
  from the last cache instead of a cold spinner. (No persistence today.)
- Scope query keys by `userId` (and `workspaceId` where relevant) instead of the
  blunt `queryClient.clear()` on user change (`keys.ts` is currently flat:
  `['todos']`, etc.). Keep the clear() as defense-in-depth.
- Revisit `staleTime`/`gcTime`; keep `refetchOnWindowFocus` (it's the multi-device
  sync mechanism) but ensure background refetch is silent (step 3).
- Verify: reload is instant-from-cache; switching users shows no stale data; focus
  refetch is invisible.

## Step 7 — Decompose `App` handlers into feature hooks

- Split the ~20 handler families (`App.tsx:252-463`) into `useTrackerActions`,
  `useTodoActions`, `useHubActions`, `useWorkspaceActions`, plus a small
  `useStopwatch` for the timer state/effects (`App.tsx:176-226`) and the seeding
  effect (`App.tsx:136-157`). Routes/shell consume these directly.
- Delete `App.tsx` once empty.
- Verify: full regression pass across all views; `App.tsx` is gone.

---

## Risks & mitigations
- **Big-bang risk**: avoided — steps 1–2 ship the shell+routes and auth fix while
  data/handlers are still centrally sourced via the `useAppData` bridge; full
  decomposition is deferred to step 7.
- **Auth guard over-redirecting**: only redirect on a *confirmed* null session;
  treat pending/revalidation as "stay" (this is the core of the bug fix).
- **planner `view`/`mode` dual source of truth**: explicit precedence (URL > DB
  default, write-through both) to avoid drift with existing `useSyncedLayout`.
- **StrictMode double-effects** during the bootstrap swap: validate the session
  resolves once and the seeding effect is idempotent.
- **File-based route generation**: commit `routeTree.gen.ts` or gitignore +
  generate on build; pick one and document it.

## Done = the bug class is gone
After steps 1–2: no focus-flash, no wiped login form, no view-switch state loss,
working back/forward + deep links. Steps 3–7 are the production hardening
(resilience, deep-linkable state, code-splitting, cache persistence, and a
maintainable component structure).
