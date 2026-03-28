import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';

/**
 * Double-submit cookie CSRF protection.
 * - Sets a non-httpOnly `csrf_token` cookie on EVERY response (JS-readable),
 *   including GET requests, so the token is pre-seeded before any POST.
 * - State-changing requests (POST/PATCH/PUT/DELETE) must include `X-CSRF-Token`
 *   header matching the cookie value.
 * - Auth endpoints are exempt from CSRF validation because they rely on
 *   credentials (password) or httpOnly refresh cookies for security.
 */

// Auth paths exempt from CSRF validation — these use their own security
// (password, httpOnly refresh cookie, OAuth code exchange, etc.)
const CSRF_EXEMPT_PATHS = new Set([
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/refresh',
  '/api/auth/forgot-password',
  '/api/auth/verify-reset-code',
  '/api/auth/reset-password',
  '/api/auth/google',
  '/api/auth/github',
  '/api/auth/google/callback',
  '/api/auth/github/callback',
]);

export function csrfProtection(req: Request, res: Response, next: NextFunction) {
  // Always ensure a CSRF token cookie exists — pre-seed on ALL requests
  // (including GET) so the browser has it before the first POST
  if (!req.cookies?.csrf_token) {
    const csrfToken = crypto.randomBytes(32).toString('hex');
    res.cookie('csrf_token', csrfToken, {
      httpOnly: false, // JS needs to read this
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      path: '/',
    });
  }

  // Validate on state-changing requests only
  if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(req.method)) {
    // Skip CSRF check for exempt auth paths
    if (CSRF_EXEMPT_PATHS.has(req.path)) {
      return next();
    }

    const headerToken = req.headers['x-csrf-token'] as string;
    const cookieToken = req.cookies?.csrf_token;

    if (!headerToken || !cookieToken || headerToken !== cookieToken) {
      return res.status(403).json({
        success: false,
        error: { code: 'CSRF_FAILED', message: 'Invalid or missing CSRF token' },
      });
    }
  }

  next();
}
