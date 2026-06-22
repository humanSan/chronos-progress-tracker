import 'dotenv/config';
import app from './app';

// Local dev entry point: load .env and start a long-running HTTP server. On
// Vercel the app is served as a serverless function (api/index.ts) instead, so
// this file is never run there.
const port = Number(process.env.PORT) || 8787;
app.listen(port, () => {
  console.log(`[api] listening on http://localhost:${port}`);
});
