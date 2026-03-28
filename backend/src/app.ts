import express from 'express';
import path from 'path';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { apiRateLimit } from './middleware/rateLimit.js';
import { csrfProtection } from './middleware/csrf.middleware.js';
import { errorHandler } from './middleware/errorHandler.js';

import authRouter from './routes/auth.js';
import projectsRouter from './routes/projects.js';
import usersRouter from './routes/users.js';
import categoriesRouter from './routes/categories.js';
import alertsRouter from './routes/alerts.js';
import partnersRouter from './routes/partners.js';
import reportsRouter from './routes/reports.js';
import dashboardRouter from './routes/dashboard.js';
import ideasRouter from './routes/ideas.js';
import settingsRouter from './routes/settings.js';
import socialMediaRouter from './routes/socialMedia.js';
import futureRouter from './routes/future.js';
import notificationsRouter from './routes/notifications.js';
import activityLogsRouter from './routes/activityLogs.js';
import uploadRouter from './routes/upload.js';
import oauthRouter from './routes/oauth.js';
import aiAnalyticsRouter from './routes/aiAnalytics.js';
import contactRouter from './routes/contact.js';

export function createApp() {
  const app = express();

  // Disable X-Powered-By header leaking Express
  app.disable('x-powered-by');

  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'blob:'],
        connectSrc: ["'self'"],
      },
    },
    crossOriginResourcePolicy: { policy: 'same-site' },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  }));

  // CORS — explicit allowlist, not wildcard localhost
  const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173,http://localhost:5000')
    .split(',')
    .map(o => o.trim());

  app.use(cors({
    origin: (origin, callback) => {
      if (!origin || ALLOWED_ORIGINS.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
    maxAge: 600, // Cache preflight for 10 minutes
  }));
  app.use(apiRateLimit);
  app.use(express.json({ limit: '10mb' }));
  app.use(cookieParser());
  app.use(csrfProtection);

  // Serve uploaded files statically
  const uploadsDir = path.resolve(process.env.UPLOAD_DIR || 'uploads');
  app.use('/uploads', express.static(uploadsDir));

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({ success: true, data: { status: 'ok', timestamp: new Date().toISOString() } });
  });

  // API Routes
  app.use('/api/auth', authRouter);
  app.use('/api/projects', projectsRouter);
  app.use('/api/users', usersRouter);
  app.use('/api/categories', categoriesRouter);
  app.use('/api/alerts', alertsRouter);
  app.use('/api/partners', partnersRouter);
  app.use('/api/reports', reportsRouter);
  app.use('/api/dashboard', dashboardRouter);
  app.use('/api/ideas', ideasRouter);
  app.use('/api/settings', settingsRouter);
  app.use('/api/social-media', socialMediaRouter);
  app.use('/api/future', futureRouter);
  app.use('/api/notifications', notificationsRouter);
  app.use('/api/activity-logs', activityLogsRouter);
  app.use('/api/upload', uploadRouter);
  app.use('/api/auth', oauthRouter);
  app.use('/api/ai-analytics', aiAnalyticsRouter);
  app.use('/api/contact', contactRouter);

  app.use(errorHandler);
  return app;
}
