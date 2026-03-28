import rateLimit from 'express-rate-limit';

// General API rate limit
export const apiRateLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 10000 });

// Strict rate limit for authentication endpoints (brute-force protection)
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, error: { code: 'TOO_MANY_REQUESTS', message: 'Too many authentication attempts. Please try again later.' } },
  standardHeaders: true,
  legacyHeaders: false,
});

// Very strict rate limit for password reset code verification (6-digit brute-force protection)
export const resetCodeRateLimit = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  message: { success: false, error: { code: 'TOO_MANY_REQUESTS', message: 'Too many verification attempts. Please request a new code.' } },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limit for file uploads
export const uploadRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: { success: false, error: { code: 'TOO_MANY_REQUESTS', message: 'Too many upload requests. Please try again later.' } },
});
