// Vercel Function entry: the whole Express app runs as a single serverless
// function. An Express app is a valid (req, res) handler, which is exactly what
// the Vercel Node runtime invokes. vercel.json rewrites /api/(.*) here, and the
// original path is preserved, so the app's /api/... routes match unchanged.
import app from '../server/app';

export default app;
