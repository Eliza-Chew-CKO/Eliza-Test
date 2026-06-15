import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';

// Load environment variables from .env at the repo root
dotenv.config({ path: '../../.env' });

// Route imports
// /api/kpi   — KPI summary and financial trend endpoints
import kpiRouter from './routes/kpi';
// /api/pipeline — opportunity / frontbook pipeline endpoints
import pipelineRouter from './routes/pipeline';
// /api/backbook — backbook account endpoints
import backbookRouter from './routes/backbook';
// /api/leaderboard — rep performance leaderboard
import leaderboardRouter from './routes/leaderboard';
// /api/targets — target definitions and variance endpoints
import targetsRouter from './routes/targets';

const app = express();
const PORT = process.env.PORT ?? 4000;

// -----------------------------------------------------------------------
// Global middleware
// -----------------------------------------------------------------------
app.use(helmet());                        // Security headers
app.use(cors({ origin: '*' }));          // Allow all origins in dev — tighten in prod
app.use(morgan('dev'));                   // HTTP request logging
app.use(express.json());                 // JSON body parsing
app.use(express.urlencoded({ extended: true }));

// -----------------------------------------------------------------------
// Health check
// -----------------------------------------------------------------------
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
});

// -----------------------------------------------------------------------
// API routes
// -----------------------------------------------------------------------
app.use('/api/kpi', kpiRouter);
app.use('/api/pipeline', pipelineRouter);
app.use('/api/backbook', backbookRouter);
app.use('/api/leaderboard', leaderboardRouter);
app.use('/api/targets', targetsRouter);

// -----------------------------------------------------------------------
// 404 handler
// -----------------------------------------------------------------------
app.use((_req: Request, res: Response) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

// -----------------------------------------------------------------------
// Global error handler
// -----------------------------------------------------------------------
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[ERROR]', err.message, err.stack);
  res.status(500).json({ success: false, error: err.message ?? 'Internal server error' });
});

// -----------------------------------------------------------------------
// Start server
// -----------------------------------------------------------------------
app.listen(PORT, () => {
  console.log(`NORAM API running on http://localhost:${PORT}`);
});

export default app;
