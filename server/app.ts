import express from 'express';
import { requireAuth } from './auth';
import { errorMiddleware } from './http';
import { todosRouter } from './routes/todos';
import { workspacesRouter } from './routes/workspaces';
import { trackersRouter } from './routes/trackers';
import { settingsRouter } from './routes/settings';

// The configured Express app, with no `listen` — so it can be used both by the
// local dev server (server/index.ts) and as a Vercel Function (api/index.ts).
const app = express();
app.use(express.json({ limit: '5mb' }));

// CORS. On Vercel the frontend and API share one origin (requests are relative
// /api → same function host), so this is a no-op there; it stays useful for the
// local Vite proxy and any direct cross-origin call.
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', process.env.APP_URL || '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PATCH,PUT,DELETE,OPTIONS');
  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }
  next();
});

// Liveness check (no auth).
app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

// Proof endpoint: returns the authenticated user's id.
app.get('/api/me', requireAuth, (req, res) => {
  res.json({ userId: req.userId });
});

// Data API — all scoped by the authenticated user_id.
app.use('/api/todos', requireAuth, todosRouter);
app.use('/api/workspaces', requireAuth, workspacesRouter);
app.use('/api/trackers', requireAuth, trackersRouter);
app.use('/api/settings', requireAuth, settingsRouter);

// Final error handler (must be last).
app.use(errorMiddleware);

export default app;
