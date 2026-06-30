// ─────────────────────────────────────────────────────────────────────────────
//  Asset402 API Gateway — Hono + Node
//  Entry point for the backend orchestration layer.
// ─────────────────────────────────────────────────────────────────────────────

import 'dotenv/config';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';

import { assetsRouter }     from './routes/assets';
import { streamRouter }     from './routes/stream';
import { marketplaceRouter } from './routes/marketplace';
import { pricingRouter }    from './routes/pricing';
import { carbonRouter }     from './routes/carbon';
import { rentalsRouter }    from './routes/rentals';
import { maintenanceRouter } from './routes/maintenance';
import { CsprCloudSSEListener } from './hooks/cspr-cloud-sse';
import { logRepo } from './db/supabase';

const app  = new Hono();
const PORT = parseInt(process.env['PORT'] ?? '3001', 10);

// ── Global Middleware ─────────────────────────────────────────────────────────

app.use('*', logger());
app.use('*', prettyJSON());
app.use('*', cors({
  origin:  ['http://localhost:3000', 'http://localhost:3001', process.env['FRONTEND_URL'] ?? '*'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
}));

// ── Routes ────────────────────────────────────────────────────────────────────

app.route('/api/v1/assets',      assetsRouter);
app.route('/api/v1/stream',      streamRouter);
app.route('/api/v1/marketplace', marketplaceRouter);
app.route('/api/v1/pricing',     pricingRouter);
app.route('/api/v1/carbon',      carbonRouter);
app.route('/api/v1/rentals',     rentalsRouter);
app.route('/api/v1/maintenance', maintenanceRouter);

// ── Health ────────────────────────────────────────────────────────────────────

app.get('/', (c) => c.json({
  service:   'Asset402 API Gateway',
  version:   '0.1.0',
  status:    'healthy',
  timestamp: new Date().toISOString(),
}));

app.get('/health', (c) => c.json({ status: 'ok' }));

// ── Not Found ─────────────────────────────────────────────────────────────────

app.notFound((c) => c.json({ error: 'Route not found' }, 404));

// ── Error Handler ─────────────────────────────────────────────────────────────

app.onError((err, c) => {
  console.error(`[API Error] ${err.message}`);
  void logRepo.insert({
    agent_name:       'APIGateway',
    action_performed: `ERROR:${c.req.path}`,
    payload:          { message: err.message },
    status:           'error',
  }).catch(() => {});
  return c.json({ error: 'Internal server error', message: err.message }, 500);
});

import { serve } from '@hono/node-server';

if (process.env.NODE_ENV !== 'test') {
  const sseListener = new CsprCloudSSEListener();
  sseListener.start();
}

// ── Boot ─────────────────────────────────────────────────────────────────────

if (process.env.NODE_ENV !== 'test' && typeof Bun === 'undefined') {
  serve({
    fetch: app.fetch,
    port: PORT,
  });
  console.log(`🚀 Asset402 API Gateway running on http://localhost:${PORT} (Node.js/npm)`);
} else if (typeof Bun !== 'undefined') {
  console.log(`🚀 Asset402 API Gateway running on http://localhost:${PORT} (Bun)`);
}

export default {
  port:  PORT,
  fetch: app.fetch,
};

export { app };
