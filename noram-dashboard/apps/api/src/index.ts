import express from 'express';
import cors from 'cors';
import 'dotenv/config';

import kpiRouter from './routes/kpi';
import pipelineRouter from './routes/pipeline';
import backbookRouter from './routes/backbook';
import leaderboardRouter from './routes/leaderboard';
import targetsRouter from './routes/targets';

const app = express();
const PORT = process.env.PORT ?? 4000;

app.use(cors());
app.use(express.json());

app.use('/kpi', kpiRouter);
app.use('/pipeline', pipelineRouter);
app.use('/backbook', backbookRouter);
app.use('/leaderboard', leaderboardRouter);
app.use('/targets', targetsRouter);

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));
