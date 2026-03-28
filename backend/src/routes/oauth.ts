import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/database.js';
import { signAccessToken, signRefreshToken } from '../utils/jwt.js';
import { getEffectiveRole } from '../utils/effectiveRole.js';

const router = Router();

const IS_PROD = process.env.NODE_ENV === 'production';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5174';
const ALLOWED_DOMAINS = (process.env.ALLOWED_EMAIL_DOMAINS || 'gcet.edu.om')
  .split(',')
  .map(d => d.trim().toLowerCase());
const UNIVERSITY_DOMAINS = (process.env.UNIVERSITY_EMAIL_DOMAINS || 'gcet.edu.om')
  .split(',')
  .map(d => d.trim().toLowerCase());

function isEmailAllowed(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase();
  return ALLOWED_DOMAINS.includes(domain);
}

function isUniversityEmail(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase();
  return UNIVERSITY_DOMAINS.includes(domain);
}

async function findOrCreateUser(email: string, name: string, avatarUrl?: string) {
  let user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    const randomPassword = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 12);
    // University emails get admin role automatically (graduation project)
    const role = isUniversityEmail(email) ? 'admin' : 'employee';
    user = await prisma.user.create({
      data: {
        name,
        email,
        password: randomPassword,
        role,
        avatarUrl: avatarUrl || null,
      },
    });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  return user;
}

// Cookie + DB token helpers (mirrored from auth.ts)
function setTokenCookies(res: Response, accessToken: string, refreshToken: string) {
  res.cookie('access_token', accessToken, {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: 'strict',
    maxAge: 15 * 60 * 1000,
    path: '/',
  });
  res.cookie('refresh_token', refreshToken, {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/api/auth',
  });
}

async function storeRefreshToken(userId: string, refreshToken: string) {
  const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
  await prisma.refreshToken.create({
    data: { userId, tokenHash, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
  });
}

function handleOAuthSuccess(res: Response, user: { id: string; email: string; role: 'admin' | 'manager' | 'employee' | 'viewer' }) {
  const payload = { id: user.id, email: user.email, role: getEffectiveRole(user.email, user.role) };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  // Store refresh token in DB and set httpOnly cookies
  storeRefreshToken(user.id, refreshToken).catch(() => {});
  setTokenCookies(res, accessToken, refreshToken);

  // Redirect to frontend callback — no tokens in URL
  res.redirect(`${FRONTEND_URL}/auth/callback`);
}

function buildErrorRedirect(message: string) {
  return `${FRONTEND_URL}/login?error=${encodeURIComponent(message)}`;
}

// ─── Google OAuth ──────────────────────────────────────────────────────

// GET /api/auth/google — Redirect to Google consent screen
router.get('/google', (_req: Request, res: Response) => {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: process.env.GOOGLE_CALLBACK_URL!,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'select_account',
  });

  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
});

// GET /api/auth/google/callback — Handle Google redirect
router.get('/google/callback', async (req: Request, res: Response) => {
  try {
    const { code } = req.query;
    if (!code || typeof code !== 'string') {
      return res.redirect(buildErrorRedirect('Authorization code missing'));
    }

    // Exchange code for tokens
    const tokenBody = new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID || '',
      client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
      redirect_uri: process.env.GOOGLE_CALLBACK_URL || '',
      grant_type: 'authorization_code',
    });

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tokenBody.toString(),
    });

    const tokenData = await tokenRes.json() as {
      access_token?: string;
      error?: string;
      error_description?: string;
    };
    if (!tokenData.access_token) {
      const reason = tokenData.error_description || tokenData.error || 'Failed to get Google access token';
      return res.redirect(buildErrorRedirect(reason));
    }

    // Get user info
    const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    if (!userInfoRes.ok) {
      return res.redirect(buildErrorRedirect('Failed to fetch Google user profile'));
    }

    const userInfo = await userInfoRes.json() as { email?: string; name?: string; picture?: string };
    if (!userInfo.email) {
      return res.redirect(buildErrorRedirect('Could not retrieve email from Google'));
    }

    // Check domain
    if (!isEmailAllowed(userInfo.email)) {
      return res.redirect(buildErrorRedirect('Only @gcet.edu.om emails are allowed'));
    }

    const user = await findOrCreateUser(userInfo.email, userInfo.name || userInfo.email.split('@')[0], userInfo.picture);
    return handleOAuthSuccess(res, user);
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'Google authentication failed';
    console.error('[OAuth][Google] Callback failed:', error);
    return res.redirect(buildErrorRedirect(reason));
  }
});

// ─── GitHub OAuth ──────────────────────────────────────────────────────

// GET /api/auth/github — Redirect to GitHub authorization
router.get('/github', (_req: Request, res: Response) => {
  const params = new URLSearchParams({
    client_id: process.env.GITHUB_CLIENT_ID!,
    redirect_uri: process.env.GITHUB_CALLBACK_URL!,
    scope: 'user:email read:user',
  });

  res.redirect(`https://github.com/login/oauth/authorize?${params.toString()}`);
});

// GET /api/auth/github/callback — Handle GitHub redirect
router.get('/github/callback', async (req: Request, res: Response) => {
  try {
    const { code } = req.query;
    if (!code || typeof code !== 'string') {
      return res.redirect(buildErrorRedirect('Authorization code missing'));
    }

    // Exchange code for access token
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: process.env.GITHUB_CALLBACK_URL,
      }),
    });

    const tokenData = await tokenRes.json() as { access_token?: string; error?: string };
    if (!tokenData.access_token) {
      return res.redirect(buildErrorRedirect('Failed to get GitHub access token'));
    }

    // Get user profile
    const userRes = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        Accept: 'application/json',
      },
    });

    const userProfile = await userRes.json() as { name?: string; login?: string; avatar_url?: string };

    // Get user emails (may be private)
    const emailsRes = await fetch('https://api.github.com/user/emails', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        Accept: 'application/json',
      },
    });

    const emails = await emailsRes.json() as Array<{ email: string; primary: boolean; verified: boolean }>;
    const primaryEmail = emails.find(e => e.primary && e.verified)?.email || emails.find(e => e.verified)?.email;

    if (!primaryEmail) {
      return res.redirect(buildErrorRedirect('Could not retrieve email from GitHub'));
    }

    // Check domain
    if (!isEmailAllowed(primaryEmail)) {
      return res.redirect(buildErrorRedirect('Only @gcet.edu.om emails are allowed'));
    }

    const user = await findOrCreateUser(
      primaryEmail,
      userProfile.name || userProfile.login || primaryEmail.split('@')[0],
      userProfile.avatar_url,
    );
    return handleOAuthSuccess(res, user);
  } catch {
    return res.redirect(buildErrorRedirect('GitHub authentication failed'));
  }
});

export default router;
