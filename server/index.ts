import 'dotenv/config';
import express from 'express';
import { requireAuth } from './auth';

const app = express();
app.use(express.json({ limit: '5mb' }));

// Dev CORS. Harmless behind the Vite proxy (requests are same-origin via
// /api → :PORT); useful if the frontend ever calls the API directly.
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

// Proof endpoint: returns the authenticated user's id. CRUD lands in Phase 3.
app.get('/api/me', requireAuth, (req, res) => {
  res.json({ userId: req.userId });
});

const port = Number(process.env.PORT) || 8787;
app.listen(port, () => {
  console.log(`[api] listening on http://localhost:${port}`);
});
