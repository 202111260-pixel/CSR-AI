import jwt from 'jsonwebtoken';

function getSecret(envVar: string): string {
  const secret = process.env[envVar];
  if (!secret || secret.length < 32) {
    throw new Error(`[SECURITY] ${envVar} must be set and at least 32 characters long`);
  }
  return secret;
}

export function signAccessToken(payload: object): string {
  return jwt.sign(payload, getSecret('JWT_SECRET'), { expiresIn: '15m' });
}

export function signRefreshToken(payload: object): string {
  return jwt.sign(payload, getSecret('JWT_REFRESH_SECRET'), { expiresIn: '7d' });
}

export function verifyToken(token: string, secret: string): jwt.JwtPayload {
  return jwt.verify(token, secret) as jwt.JwtPayload;
}
