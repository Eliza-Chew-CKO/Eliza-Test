import 'dotenv/config';
import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

// Route imports
import kpiRouter from './routes/kpi';
import financialsRouter from './routes/financials';
import pipelineRouter from './routes/pipeline';
import backbookRouter from './routes/backbook';
import leaderboardRouter from './routes/leaderboard';
import targetsRouter from './routes/targets';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 4000;

// ─── Security & logging middleware ────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Health check ─────────────────────────────────────────────────────────────
// Used by load balancers and container orchestration to verify the service is up.
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'noram-api',
    version: process.env.npm_package_version ?? '0.1.0',
  });
});

// ─── API routes ───────────────────────────────────────────────────────────────

// KPI summary for Executive Summary hero cards
app.use('/api/kpi', kpiRouter);

// Monthly financial trend data (frontbook, backbook, TPV)
app.use('/api/financials', financialsRouter);

// Open pipeline opportunities and pipeline funnel data for the Frontbook Pipeline section
app.use('/api/pipeline', pipelineRouter);

// Existing account data and backbook revenue breakdowns for the Backbook section
app.use('/api/backbook', backbookRouter);

// Rep performance rankings for the Leaderboards section
app.use('/api/leaderboard', leaderboardRouter);

// Revenue and go-live targets, and actuals-vs-targets variance reports
app.use('/api/targets', targetsRouter);

// ─── 404 handler ─────────────────────────────────────────────────────────────
app.use((_req: Request, res: Response) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

// ─── Global error handler ────────────────────────────────────────────────────
// Must have 4 parameters to be recognised as an error-handling middleware by Express.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[API Error]', err.message, err.stack);
  res.status(500).json({
    success: false,
    error:
      process.env.NODE_ENV === 'production'
        ? 'Internal server error'
        : err.message,
  });
});

// ─── Start server ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`[noram-api] Listening on http://localhost:${PORT}`);
  console.log(`[noram-api] Health check: http://localhost:${PORT}/health`);
});

export default app;
