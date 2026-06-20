import * as jose from 'jose';
import type { NextFunction, Request, Response } from 'express';

// Neon Auth (Better Auth) issues JWTs signed with the project's keys. We verify
// incoming Bearer tokens against the project's JWKS endpoint. Only tokens signed
// by this project's keys pass — that is the core security guarantee.
const authBaseUrl = process.env.NEON_AUTH_URL;
if (!authBaseUrl) {
  throw new Error('NEON_AUTH_URL is not set (server-side, used for JWKS verification)');
}

const JWKS = jose.createRemoteJWKSet(
  new URL(`${authBaseUrl.replace(/\/$/, '')}/.well-known/jwks.json`)
);

/** Verify a token and return its `sub` (the Neon Auth user id), or null. */
export async function verifyToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jose.jwtVerify(token, JWKS);
    // TODO(harden): once the real `iss`/`aud` claims are confirmed from a live
    // token, enforce them here (pass { issuer, audience } to jwtVerify).
    return typeof payload.sub === 'string' ? payload.sub : null;
  } catch {
    return null;
  }
}

/** Express middleware: require a valid Neon Auth session; sets req.userId. */
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const header = req.header('authorization');
  const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
  if (!token) {
    res.status(401).json({ error: 'Missing bearer token' });
    return;
  }
  const userId = await verifyToken(token);
  if (!userId) {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }
  req.userId = userId;
  next();
}
