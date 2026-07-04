// ─────────────────────────────────────────────────────────────────────────────
//  Agents API Server — minimal HTTP bridge so the backend (a separate Node
//  process/package) can invoke agent logic synchronously. Agents and backend
//  have no shared workspace tooling, so this is the integration boundary —
//  documented, not a hidden coupling.
// ─────────────────────────────────────────────────────────────────────────────

import 'dotenv/config';
import express from 'express';
import { VisionAgent } from './vision-agent';
import { RiskAgent } from './risk-agent';
import { CasperMCPClient } from './mcp/casper-mcp-client';
import { CsprTradeMCPClient } from './mcp/csprtrade-mcp-client';
import { createX402ClientFromEnv } from './x402/client';

const app = express();
app.use(express.json({ limit: '15mb' })); // real photos are several MB base64-encoded

const PORT = parseInt(process.env['AGENTS_API_PORT'] ?? '3002', 10);
const MOONDREAM_URL = process.env['MOONDREAM_API_URL'] ?? 'http://localhost:8080/v1/classify';
const ORACLE_URL = process.env['ORACLE_URL'] ?? 'http://localhost:4402/v1/price';
const CASPER_MCP_URL = process.env['CASPER_MCP_URL'] ?? 'https://mcp.cspr.cloud';
const CSPRTRADE_URL = process.env['CSPRTRADE_MCP_URL'] ?? 'https://mcp.cspr.trade';

const x402Client = createX402ClientFromEnv();
const visionAgent = new VisionAgent({
  moondreamApiUrl: MOONDREAM_URL,
  pricingOracleUrl: ORACLE_URL,
  x402Client,
  anthropicApiKey: process.env['ANTHROPIC_API_KEY'],
  ipfsApiKey: process.env['IPFS_API_KEY'],
});
const riskAgent = new RiskAgent({
  casperMCP: new CasperMCPClient({ serverUrl: CASPER_MCP_URL, apiKey: process.env['CASPER_MCP_API_KEY'] }),
  csprTradeMCP: new CsprTradeMCPClient({ serverUrl: CSPRTRADE_URL }),
});

app.post('/vision/analyze', async (req, res) => {
  try {
    const { base64Image } = req.body as { base64Image?: string };
    if (!base64Image) {
      res.status(400).json({ error: 'base64Image is required' });
      return;
    }
    const result = await visionAgent.analysePhoto(base64Image);
    res.json(result);
  } catch (err) {
    res.status(502).json({ error: 'Vision analysis failed', detail: String(err) });
  }
});

app.post('/risk/assess', async (req, res) => {
  try {
    const { ownerPublicKey, assetId, visionResult } = req.body;
    if (!ownerPublicKey || !visionResult) {
      res.status(400).json({ error: 'ownerPublicKey and visionResult are required' });
      return;
    }
    const result = await riskAgent.assessRisk(ownerPublicKey, assetId ?? 0, visionResult);
    res.json({
      ...result,
      maxLoanMotes: result.maxLoanMotes.toString(), // BigInt isn't JSON-serializable
    });
  } catch (err) {
    res.status(502).json({ error: 'Risk assessment failed', detail: String(err) });
  }
});

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 Agents API bridge listening on http://localhost:${PORT}`);
  });
}

export { app };
