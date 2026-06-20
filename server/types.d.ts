// Augment Express's Request with the authenticated Neon Auth user id, set by
// the requireAuth middleware (server/auth.ts).
declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

export {};
