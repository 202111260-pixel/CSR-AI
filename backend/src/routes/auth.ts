import { Router, Request, Response } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/database.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { signAccessToken, signRefreshToken, verifyToken } from '../utils/jwt.js';
import { getEffectiveRole } from '../utils/effectiveRole.js';
import { emailService } from '../services/emailService.js';
import { authRateLimit, resetCodeRateLimit } from '../middleware/rateLimit.js';

const router = Router();

const IS_PROD = process.env.NODE_ENV === 'production';

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

// ── Cookie Helpers ──────────────────────────────────────────────────────

function setTokenCookies(res: Response, accessToken: string, refreshToken: string) {
  res.cookie('access_token', accessToken, {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: 'strict',
    maxAge: 15 * 60 * 1000, // 15 minutes
    path: '/',
  });
  res.cookie('refresh_token', refreshToken, {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/api/auth',
  });
}

function clearTokenCookies(res: Response) {
  res.clearCookie('access_token', { path: '/' });
  res.clearCookie('refresh_token', { path: '/api/auth' });
}

async function storeRefreshToken(userId: string, refreshToken: string) {
  const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
  await prisma.refreshToken.create({
    data: { userId, tokenHash, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
  });
}

async function revokeUserRefreshTokens(userId: string) {
  await prisma.refreshToken.deleteMany({ where: { userId } });
}

// ── Security Helpers ────────────────────────────────────────────────────

// Timing-safe string comparison to prevent timing attacks on codes
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a, 'utf8'), Buffer.from(b, 'utf8'));
}

// Account lockout constants
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

// In-memory failed login tracker (per-email)
const failedAttempts = new Map<string, { count: number; lastAttempt: number }>();

function checkAccountLockout(email: string): boolean {
  const record = failedAttempts.get(email);
  if (!record) return false;
  if (record.count >= MAX_FAILED_ATTEMPTS) {
    if (Date.now() - record.lastAttempt < LOCKOUT_DURATION_MS) return true;
    failedAttempts.delete(email); // Lockout expired
  }
  return false;
}

function recordFailedLogin(email: string): void {
  const record = failedAttempts.get(email) || { count: 0, lastAttempt: 0 };
  record.count += 1;
  record.lastAttempt = Date.now();
  failedAttempts.set(email, record);
}

function clearFailedLogins(email: string): void {
  failedAttempts.delete(email);
}

// Password complexity: min 8 chars, at least 1 uppercase, 1 lowercase, 1 digit, 1 special char
const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one digit')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

const registerSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: passwordSchema,
  role: z.enum(['admin', 'manager', 'employee', 'viewer']).optional(),
  department: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const updateProfileSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  department: z.string().optional(),
  phone: z.string().optional(),
  location: z.string().optional(),
});

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

const verifyResetCodeSchema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
});

const resetPasswordSchema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
  password: passwordSchema,
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: passwordSchema,
});

const deleteMeSchema = z.object({
  password: z.string().min(1),
});

const SAFE_ERROR = 'An unexpected error occurred';

// POST /api/auth/register
router.post('/register', authRateLimit, validate(registerSchema), async (req: Request, res: Response) => {
  try {
    const { name, email, password, role, department } = req.body;

    if (!isEmailAllowed(email)) {
      return res.status(403).json({ success: false, error: { code: 'DOMAIN_NOT_ALLOWED', message: 'Only allowed email domains can register' } });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ success: false, error: { code: 'EMAIL_EXISTS', message: 'Email already registered' } });
    }

    // University emails get admin role; others get requested role or default employee
    const assignedRole = isUniversityEmail(email) ? (role || 'admin') : (role || 'employee');

    const hashed = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { name, email, password: hashed, role: assignedRole, department },
      select: { id: true, name: true, email: true, role: true, department: true, createdAt: true },
    });

    const effectiveRole = getEffectiveRole(user.email, user.role);
    const payload = { id: user.id, email: user.email, role: effectiveRole };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    // Store refresh token in DB for revocation support
    await storeRefreshToken(user.id, refreshToken);

    // Set httpOnly cookies
    setTokenCookies(res, accessToken, refreshToken);

    res.status(201).json({ success: true, data: { user: { ...user, role: effectiveRole } } });
  } catch {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: SAFE_ERROR } });
  }
});

// POST /api/auth/login
router.post('/login', authRateLimit, validate(loginSchema), async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!isEmailAllowed(email)) {
      return res.status(403).json({ success: false, error: { code: 'DOMAIN_NOT_ALLOWED', message: 'Only allowed email domains can login' } });
    }

    // Account lockout check
    if (checkAccountLockout(email)) {
      return res.status(429).json({ success: false, error: { code: 'ACCOUNT_LOCKED', message: 'Account temporarily locked due to too many failed attempts. Try again in 15 minutes.' } });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      recordFailedLogin(email);
      return res.status(401).json({ success: false, error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } });
    }

    // Check user status — block suspended/inactive users
    if (user.status !== 'active') {
      return res.status(403).json({ success: false, error: { code: 'ACCOUNT_DISABLED', message: 'Your account has been deactivated. Contact an administrator.' } });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      recordFailedLogin(email);
      return res.status(401).json({ success: false, error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } });
    }

    // Login success — clear lockout counter
    clearFailedLogins(email);

    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

    const effectiveRole = getEffectiveRole(user.email, user.role);
    const payload = { id: user.id, email: user.email, role: effectiveRole };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    // Store refresh token in DB for revocation support
    await storeRefreshToken(user.id, refreshToken);

    // Set httpOnly cookies
    setTokenCookies(res, accessToken, refreshToken);

    const { password: _, twoFASecret: __, resetCode: ___, resetCodeExpiresAt: ____, ...safeUser } = user;
    res.json({ success: true, data: { user: { ...safeUser, role: effectiveRole } } });
  } catch {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: SAFE_ERROR } });
  }
});

// POST /api/auth/refresh
router.post('/refresh', authRateLimit, async (req: Request, res: Response) => {
  try {
    // Read refresh token from cookie (fallback to body for backward compat)
    const refreshToken = req.cookies?.refresh_token || req.body?.refreshToken;
    if (!refreshToken) {
      return res.status(400).json({ success: false, error: { code: 'MISSING_TOKEN', message: 'Refresh token required' } });
    }

    const refreshSecret = process.env.JWT_REFRESH_SECRET;
    if (!refreshSecret) {
      return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Server configuration error' } });
    }
    const decoded = verifyToken(refreshToken, refreshSecret);

    // Verify refresh token exists in DB (enables revocation)
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const storedToken = await prisma.refreshToken.findUnique({ where: { tokenHash } });
    if (!storedToken || storedToken.expiresAt < new Date()) {
      // Token revoked or expired — clean up
      if (storedToken) await prisma.refreshToken.delete({ where: { id: storedToken.id } });
      clearTokenCookies(res);
      return res.status(401).json({ success: false, error: { code: 'INVALID_TOKEN', message: 'Token has been revoked or expired' } });
    }

    // Verify user still exists and is active
    const user = await prisma.user.findUnique({ where: { id: decoded.id }, select: { id: true, email: true, role: true, status: true } });
    if (!user || user.status !== 'active') {
      clearTokenCookies(res);
      return res.status(401).json({ success: false, error: { code: 'INVALID_TOKEN', message: 'Token is no longer valid' } });
    }

    // Rotate: delete old refresh token, issue new pair
    await prisma.refreshToken.delete({ where: { id: storedToken.id } });

    const effectiveRole = getEffectiveRole(user.email, user.role);
    const newAccessToken = signAccessToken({ id: user.id, email: user.email, role: effectiveRole });
    const newRefreshToken = signRefreshToken({ id: user.id, email: user.email, role: effectiveRole });
    await storeRefreshToken(user.id, newRefreshToken);

    setTokenCookies(res, newAccessToken, newRefreshToken);

    res.json({ success: true, data: { message: 'Token refreshed' } });
  } catch {
    clearTokenCookies(res);
    res.status(401).json({ success: false, error: { code: 'INVALID_TOKEN', message: 'Invalid or expired refresh token' } });
  }
});

// POST /api/auth/logout — Revoke tokens and clear cookies
router.post('/logout', authenticate, async (req: Request, res: Response) => {
  try {
    // Revoke all refresh tokens for this user
    await revokeUserRefreshTokens(req.user!.id);
    clearTokenCookies(res);
    res.json({ success: true, data: { message: 'Logged out successfully' } });
  } catch {
    clearTokenCookies(res);
    res.json({ success: true, data: { message: 'Logged out' } });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { id: true, name: true, email: true, role: true, department: true, phone: true, location: true, avatarUrl: true, status: true, is2FAEnabled: true, lastLoginAt: true, createdAt: true, updatedAt: true },
    });
    if (!user) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } });
    }
    res.json({ success: true, data: { ...user, role: getEffectiveRole(user.email, user.role) } });
  } catch {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: SAFE_ERROR } });
  }
});

// PATCH /api/auth/me
router.patch('/me', authenticate, validate(updateProfileSchema), async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: req.body,
      select: { id: true, name: true, email: true, role: true, department: true, phone: true, location: true, avatarUrl: true, status: true, is2FAEnabled: true, createdAt: true, updatedAt: true },
    });
    res.json({ success: true, data: user });
  } catch {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: SAFE_ERROR } });
  }
});

// GET /api/auth/me/export
router.get('/me/export', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const [user, donations, ideas, activityLogs, managedProjects, reviews] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          department: true,
          phone: true,
          location: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          lastLoginAt: true,
          is2FAEnabled: true,
        },
      }),
      prisma.donation.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } }),
      prisma.idea.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } }),
      prisma.activityLog.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 500 }),
      prisma.project.findMany({ where: { managerId: userId }, select: { id: true, name: true, status: true } }),
      prisma.review.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } }),
    ]);

    if (!user) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } });
    }

    res.json({
      success: true,
      data: {
        exportedAt: new Date().toISOString(),
        user,
        donations,
        ideas,
        activityLogs,
        managedProjects,
        reviews,
      },
    });
  } catch {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: SAFE_ERROR } });
  }
});

// DELETE /api/auth/me
router.delete('/me', authenticate, validate(deleteMeSchema), async (req: Request, res: Response) => {
  try {
    const { password } = req.body;
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_PASSWORD', message: 'Password is incorrect' } });
    }

    const anonymizedEmail = `deleted_${user.id}@deleted.local`;
    const replacementPassword = await bcrypt.hash(crypto.randomUUID(), 12);

    await prisma.$transaction([
      prisma.refreshToken.deleteMany({ where: { userId: user.id } }),
      prisma.user.update({
        where: { id: user.id },
        data: {
          name: 'Deleted User',
          email: anonymizedEmail,
          password: replacementPassword,
          phone: null,
          location: null,
          avatarUrl: null,
          department: null,
          jobTitle: null,
          employeeId: null,
          bio: null,
          status: 'deleted',
          is2FAEnabled: false,
          twoFASecret: null,
          resetCode: null,
          resetCodeExpiresAt: null,
        },
      }),
    ]);

    clearTokenCookies(res);
    res.json({ success: true, data: { message: 'Account deleted successfully' } });
  } catch {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: SAFE_ERROR } });
  }
});

// ─── Password Reset Flow ──────────────────────────────────────────────

// POST /api/auth/forgot-password — Send a 6-digit reset code
router.post('/forgot-password', authRateLimit, validate(forgotPasswordSchema), async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    // Always return success to prevent email enumeration
    if (!user) {
      return res.json({ success: true, data: { message: 'If that email exists, a reset code has been sent.' } });
    }

    const code = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Hash the reset code before storing (defense in depth)
    const hashedCode = crypto.createHash('sha256').update(code).digest('hex');

    await prisma.user.update({
      where: { id: user.id },
      data: { resetCode: hashedCode, resetCodeExpiresAt: expiresAt },
    });

    await emailService.sendResetCode(email, code);

    res.json({ success: true, data: { message: 'If that email exists, a reset code has been sent.' } });
  } catch {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: SAFE_ERROR } });
  }
});

// POST /api/auth/verify-reset-code — Verify the 6-digit code
router.post('/verify-reset-code', resetCodeRateLimit, validate(verifyResetCodeSchema), async (req: Request, res: Response) => {
  try {
    const { email, code } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !user.resetCode || !user.resetCodeExpiresAt) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_CODE', message: 'Invalid or expired reset code' } });
    }

    if (user.resetCodeExpiresAt < new Date()) {
      // Code expired — clear it
      await prisma.user.update({ where: { id: user.id }, data: { resetCode: null, resetCodeExpiresAt: null } });
      return res.status(400).json({ success: false, error: { code: 'INVALID_CODE', message: 'Invalid or expired reset code' } });
    }

    // Compare hashed code using timing-safe comparison
    const hashedInput = crypto.createHash('sha256').update(code).digest('hex');
    if (!timingSafeEqual(user.resetCode, hashedInput)) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_CODE', message: 'Invalid or expired reset code' } });
    }

    res.json({ success: true, data: { message: 'Code verified' } });
  } catch {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: SAFE_ERROR } });
  }
});

// POST /api/auth/reset-password — Set new password with valid code
router.post('/reset-password', resetCodeRateLimit, validate(resetPasswordSchema), async (req: Request, res: Response) => {
  try {
    const { email, code, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !user.resetCode || !user.resetCodeExpiresAt) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_CODE', message: 'Invalid or expired reset code' } });
    }

    if (user.resetCodeExpiresAt < new Date()) {
      await prisma.user.update({ where: { id: user.id }, data: { resetCode: null, resetCodeExpiresAt: null } });
      return res.status(400).json({ success: false, error: { code: 'INVALID_CODE', message: 'Invalid or expired reset code' } });
    }

    // Compare hashed code using timing-safe comparison
    const hashedInput = crypto.createHash('sha256').update(code).digest('hex');
    if (!timingSafeEqual(user.resetCode, hashedInput)) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_CODE', message: 'Invalid or expired reset code' } });
    }

    const hashed = await bcrypt.hash(password, 12);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashed, resetCode: null, resetCodeExpiresAt: null },
    });

    // Clear any failed login attempts after successful password reset
    clearFailedLogins(email);

    res.json({ success: true, data: { message: 'Password reset successfully' } });
  } catch {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: SAFE_ERROR } });
  }
});

// ─── Password Change ──────────────────────────────────────────────────

// POST /api/auth/change-password — Change password (authenticated)
router.post('/change-password', authenticate, validate(changePasswordSchema), async (req: Request, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } });
    }

    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_PASSWORD', message: 'Current password is incorrect' } });
    }

    const hashed = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: user.id }, data: { password: hashed } });

    res.json({ success: true, data: { message: 'Password changed successfully' } });
  } catch {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: SAFE_ERROR } });
  }
});

// ─── Two-Factor Authentication (HMAC-based TOTP) ─────────────────────

function generateTOTP(secret: string, timeStep: number): string {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(timeStep.toString());
  const hash = hmac.digest('hex');
  // Extract 6 numeric digits from hash using dynamic truncation
  const offset = parseInt(hash.slice(-1), 16) % (hash.length - 8);
  const truncated = parseInt(hash.slice(offset, offset + 8), 16);
  return (truncated % 1000000).toString().padStart(6, '0');
}

function verifyTOTP(secret: string, code: string): boolean {
  const timeStep = Math.floor(Date.now() / 30000);
  // Allow +/- 1 time step for clock drift
  for (const step of [timeStep - 1, timeStep, timeStep + 1]) {
    const expected = generateTOTP(secret, step);
    if (timingSafeEqual(expected, code)) return true;
  }
  return false;
}

// POST /api/auth/2fa/setup — Generate a new 2FA secret
router.post('/2fa/setup', authenticate, async (req: Request, res: Response) => {
  try {
    const secret = crypto.randomBytes(20).toString('hex');
    await prisma.user.update({
      where: { id: req.user!.id },
      data: { twoFASecret: secret },
    });
    res.json({ success: true, data: { secret } });
  } catch {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: SAFE_ERROR } });
  }
});

// POST /api/auth/2fa/verify — Verify code and enable 2FA
router.post('/2fa/verify', authenticate, async (req: Request, res: Response) => {
  try {
    const { code } = req.body;
    if (!code || typeof code !== 'string' || !/^\d{6}$/.test(code)) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'A 6-digit numeric code is required' } });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user?.twoFASecret) {
      return res.status(400).json({ success: false, error: { code: 'NO_SECRET', message: 'Call /2fa/setup first' } });
    }

    if (!verifyTOTP(user.twoFASecret, code)) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_CODE', message: 'Invalid verification code' } });
    }

    await prisma.user.update({ where: { id: user.id }, data: { is2FAEnabled: true } });
    res.json({ success: true, data: { message: '2FA enabled successfully' } });
  } catch {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: SAFE_ERROR } });
  }
});

// POST /api/auth/2fa/disable — Disable 2FA (requires password verification)
router.post('/2fa/disable', authenticate, async (req: Request, res: Response) => {
  try {
    const { password } = req.body;
    if (!password || typeof password !== 'string') {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Password is required to disable 2FA' } });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_PASSWORD', message: 'Invalid password' } });
    }

    await prisma.user.update({
      where: { id: req.user!.id },
      data: { is2FAEnabled: false, twoFASecret: null },
    });
    res.json({ success: true, data: { message: '2FA disabled' } });
  } catch {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: SAFE_ERROR } });
  }
});

export default router;
