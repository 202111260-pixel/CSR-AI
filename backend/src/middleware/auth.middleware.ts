import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt.js';
import { prisma } from '../config/database.js';
import { getEffectiveRole } from '../utils/effectiveRole.js';

export async function authenticate(req: Request, res: Response, next: NextFunction) {
  // Read token from httpOnly cookie first, fallback to Authorization header
  const cookieToken = req.cookies?.access_token;
  const headerToken = req.headers.authorization?.startsWith('Bearer ')
    ? req.headers.authorization.slice(7)
    : null;
  const token = cookieToken || headerToken;

  if (!token) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
    });
  }

  // Reject abnormally long tokens (possible attack vector)
  if (token.length > 2048) {
    return res.status(401).json({
      success: false,
      error: { code: 'INVALID_TOKEN', message: 'Token is invalid' },
    });
  }

  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Server configuration error' },
      });
    }

    const payload = verifyToken(token, secret);

    // Verify user still exists and is active (prevents access after deactivation)
    const user = await prisma.user.findUnique({
      where: { id: payload.id },
      select: { id: true, email: true, role: true, status: true },
    });

    if (!user || user.status !== 'active') {
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_TOKEN', message: 'Token is no longer valid' },
      });
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: getEffectiveRole(user.email, user.role),
    } as Express.User;
    return next();
  } catch {
    return res.status(401).json({
      success: false,
      error: { code: 'INVALID_TOKEN', message: 'Token is invalid or expired' },
    });
  }
}
