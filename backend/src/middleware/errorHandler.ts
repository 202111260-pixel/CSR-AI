import { Request, Response, NextFunction } from 'express';

export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  // Prisma — record not found
  if (err.code === 'P2025') {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Record not found' } });
  }

  // Prisma — unique constraint violation
  if (err.code === 'P2002') {
    return res.status(409).json({ success: false, error: { code: 'CONFLICT', message: 'Record already exists' } });
  }

  // Prisma — foreign key constraint failed
  if (err.code === 'P2003') {
    return res.status(400).json({ success: false, error: { code: 'INVALID_REFERENCE', message: 'Referenced record does not exist' } });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({ success: false, error: { code: 'INVALID_TOKEN', message: 'Token is invalid or expired' } });
  }

  // Zod validation errors (if thrown as error objects)
  if (err.name === 'ZodError') {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Validation failed', fields: err.flatten?.().fieldErrors } });
  }

  // Default internal error — do not leak stack/message in production
  const status = err.status || err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : (err.message || 'An unexpected error occurred');
  res.status(status).json({ success: false, error: { code: 'INTERNAL_ERROR', message } });
}
