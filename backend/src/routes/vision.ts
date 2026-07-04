// ─────────────────────────────────────────────────────────────────────────────
//  POST /api/v1/vision/analyze — proxy to the agents process (real Claude vision)
//  POST /api/v1/vision/risk    — proxy to the agents process (real risk assessment)
//
//  Agents and backend are separate Node processes with no shared workspace
//  tooling; this is the documented integration boundary (agents/src/api-server.ts).
// ─────────────────────────────────────────────────────────────────────────────

import { Hono } from 'hono';

export const visionRouter = new Hono();

const AGENTS_URL = process.env['AGENTS_URL'] ?? 'http://localhost:3002';

visionRouter.post('/analyze', async (c) => {
  const body = await c.req.json();
  try {
    const res = await fetch(`${AGENTS_URL}/vision/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return c.json(data, res.status as 200 | 400 | 502);
  } catch (err) {
    return c.json({ error: 'Agents service unreachable', detail: String(err) }, 502);
  }
});

visionRouter.post('/risk', async (c) => {
  const body = await c.req.json();
  try {
    const res = await fetch(`${AGENTS_URL}/risk/assess`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return c.json(data, res.status as 200 | 400 | 502);
  } catch (err) {
    return c.json({ error: 'Agents service unreachable', detail: String(err) }, 502);
  }
});
