// ─────────────────────────────────────────────────────────────────────────────
//  Vision Agent
//  Identifies and values physical assets from base64-encoded photographs.
//  Uses the Moondream2 multimodal model API (or local inference).
//  Pays per-call API fees using the x402 micropayment client.
// ─────────────────────────────────────────────────────────────────────────────

import { EventEmitter } from 'eventemitter3';
import Anthropic from '@anthropic-ai/sdk';
import { X402Client } from './x402/client';
import { AgentMessage, VisionAnalysisResult } from './types';
import { v4 as uuidv4 } from 'uuid';

export interface VisionAgentConfig {
  moondreamApiUrl: string;
  pricingOracleUrl: string;
  x402Client: X402Client;
  anthropicApiKey?: string;
  ipfsApiKey?: string;
}

export class VisionAgent extends EventEmitter {
  private readonly config: VisionAgentConfig;
  private readonly anthropic: Anthropic | null;

  constructor(config: VisionAgentConfig) {
    super();
    this.config = config;
    // Real Claude vision classification. If no key is configured, this
    // agent cannot classify assets at all — analysePhoto() throws rather
    // than fabricating a classification, per the no-mock requirement.
    this.anthropic = config.anthropicApiKey ? new Anthropic({ apiKey: config.anthropicApiKey }) : null;
  }

  /**
   * Analyse a base64-encoded asset photograph.
   *
   * Process:
   * 1. Send image to Moondream2 → asset_type, make, model, year
   * 2. Call market pricing oracle via x402 micropayment → USD value range
   * 3. Compute condition_score from model confidence signals
   * 4. Store photo to IPFS (simulated) → return hash
   */
  async analysePhoto(base64Image: string): Promise<VisionAnalysisResult> {
    this.log(`Starting visual analysis of ${(base64Image.length / 1024).toFixed(1)}KB image`);

    // ── Step 1: Classify asset via Moondream2 ──────────────────────────────
    const classification = await this.classifyImage(base64Image);
    this.log(`Classified: ${classification.assetType} (${classification.make} ${classification.modelEst})`);

    // ── Step 2: Fetch market pricing via x402 ─────────────────────────────
    const pricing = await this.fetchPricingData(
      classification.assetType,
      classification.make,
      classification.yearRange,
    );
    this.log(`Market value: $${pricing.valueLow}–$${pricing.valueHigh} USD`);

    // ── Step 3: Compute condition score ───────────────────────────────────
    const conditionScore = this.computeConditionScore(classification.confidence, base64Image);

    // ── Step 4: Simulate IPFS upload ──────────────────────────────────────
    const ipfsHash = await this.uploadToIPFS(base64Image);

    const result: VisionAnalysisResult = {
      assetType:     classification.assetType,
      make:          classification.make,
      modelEst:      classification.modelEst,
      yearRange:     classification.yearRange,
      valueUsdLow:   pricing.valueLow,
      valueUsdHigh:  pricing.valueHigh,
      conditionScore,
      confidence:    classification.confidence,
      ipfsHash,
    };

    this.emit('vision_complete', {
      eventType: 'VISION_COMPLETE' as const,
      source:    'VisionAgent',
      timestamp: Date.now(),
      payload:   result,
      traceId:   uuidv4(),
    } satisfies AgentMessage<VisionAnalysisResult>);

    this.log(`Analysis complete — condition: ${conditionScore}/100, confidence: ${(classification.confidence * 100).toFixed(1)}%`);
    return result;
  }

  // ── Private Helpers ─────────────────────────────────────────────────────────

  /**
   * Classify the asset using real Claude vision (claude-opus-4-8). This
   * replaces the old Moondream2-fetch-with-hardcoded-fallback: on any
   * failure (missing key, malformed response, API error) this throws — it
   * never substitutes a fake classification that would then get minted
   * on-chain as if it were real.
   */
  private async classifyImage(base64Image: string): Promise<{
    assetType: string;
    make:      string;
    modelEst:  string;
    yearRange: string;
    confidence: number;
  }> {
    if (!this.anthropic) {
      throw new Error('ANTHROPIC_API_KEY is not configured — cannot classify the asset.');
    }

    const mediaType = detectImageMediaType(base64Image);
    const response = await this.anthropic.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data: stripDataUrlPrefix(base64Image) } },
          {
            type: 'text',
            text:
              'Identify the physical asset (equipment/machinery/vehicle) in this photo. ' +
              'Respond with ONLY a strict JSON object, no prose, no markdown fences, matching exactly this shape: ' +
              '{"asset_type": string, "make": string, "model_est": string, "year_range": string, "confidence": number between 0 and 1}. ' +
              'asset_type should be a general category (e.g. "Excavator", "Generator", "Cinema Camera", "Agricultural Tractor", "Marine Vessel"). ' +
              'If you cannot identify make/model/year with confidence, use your best estimate and lower the confidence score accordingly.',
          },
        ],
      }],
    });

    const textBlock = response.content.find((b): b is Anthropic.TextBlock => b.type === 'text');
    if (!textBlock) {
      throw new Error('Claude vision response contained no text block');
    }

    let parsed: { asset_type: string; make: string; model_est: string; year_range: string; confidence: number };
    try {
      const jsonText = textBlock.text.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
      parsed = JSON.parse(jsonText);
    } catch (err) {
      throw new Error(`Claude vision returned unparseable JSON: ${textBlock.text.slice(0, 200)} (${String(err)})`);
    }

    if (!parsed.asset_type || typeof parsed.confidence !== 'number') {
      throw new Error(`Claude vision response missing required fields: ${JSON.stringify(parsed)}`);
    }

    return {
      assetType:  parsed.asset_type,
      make:       parsed.make ?? 'Unknown',
      modelEst:   parsed.model_est ?? 'Unknown',
      yearRange:  parsed.year_range ?? 'Unknown',
      confidence: parsed.confidence,
    };
  }

  /**
   * Fetch USD market value from the pricing oracle via x402 micropayment.
   * The agent autonomously pays 0.0005 CSPR per API call — no API key needed.
   */
  private async fetchPricingData(
    assetType: string,
    make:      string,
    yearRange: string,
  ): Promise<{ valueLow: number; valueHigh: number }> {
    try {
      const data = await this.config.x402Client.fetch<{
        value_low:  number;
        value_high: number;
      }>(this.config.pricingOracleUrl, {
        method: 'GET',
        params: { type: assetType, make, year_range: yearRange },
      });
      return { valueLow: data.value_low, valueHigh: data.value_high };
    } catch (err) {
      this.log(`PRICING FALLBACK ACTIVE — using static estimate table, not live oracle data (reason: ${String(err)})`);
      // Fallback estimation based on asset type
      const estimates: Record<string, [number, number]> = {
        'Agricultural Tractor': [8200, 9800],
        'Cinema Camera':        [3200, 4100],
        'Generator':            [1600, 2200],
      };
      const [low, high] = estimates[assetType] ?? [1000, 2000];
      return { valueLow: low, valueHigh: high };
    }
  }

  /**
   * Compute a condition score (0–100) from image quality signals.
   * Higher confidence + clean image → higher score.
   */
  private computeConditionScore(confidence: number, base64Image: string): number {
    // Heuristic: start at 80, adjust by confidence and image entropy
    const baseScore = 80;
    const confidenceBonus  = Math.round((confidence - 0.5) * 40);
    const entropyPenalty   = base64Image.length < 50_000 ? -5 : 0; // low-res penalty
    const rawScore = baseScore + confidenceBonus + entropyPenalty;
    return Math.min(100, Math.max(0, rawScore));
  }

  /**
   * Upload the photograph to IPFS via a real pinning service (Pinata, if
   * IPFS_API_KEY is configured) or a public IPFS HTTP gateway's /api/v0/add
   * as a no-signup fallback. Either path performs a genuine IPFS write and
   * returns a real CID — never a fabricated hash string. Logs which mode is
   * active so a degraded (public-gateway, best-effort) upload is visible.
   */
  private async uploadToIPFS(base64Image: string): Promise<string> {
    const imageBuffer = Buffer.from(stripDataUrlPrefix(base64Image), 'base64');

    if (this.config.ipfsApiKey) {
      const form = new FormData();
      form.append('file', new Blob([imageBuffer]), 'asset-photo.jpg');
      const res = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
        method: 'POST',
        headers: { Authorization: `Bearer ${this.config.ipfsApiKey}` },
        body: form,
      });
      if (!res.ok) {
        throw new Error(`Pinata upload failed: ${res.status} ${await res.text()}`);
      }
      const data = await res.json() as { IpfsHash: string };
      this.log(`Photo pinned to IPFS via Pinata: ${data.IpfsHash}`);
      return data.IpfsHash;
    }

    this.log('IPFS FALLBACK ACTIVE — no IPFS_API_KEY configured, using public gateway (reduced reliability guarantees)');
    const form = new FormData();
    form.append('file', new Blob([imageBuffer]), 'asset-photo.jpg');
    const res = await fetch('https://ipfs.io/api/v0/add', { method: 'POST', body: form });
    if (!res.ok) {
      throw new Error(`Public IPFS gateway upload failed: ${res.status} ${await res.text()}`);
    }
    const data = await res.json() as { Hash: string };
    this.log(`Photo stored on IPFS via public gateway: ${data.Hash}`);
    return data.Hash;
  }

  private log(msg: string): void {
    console.log(`[VisionAgent ${new Date().toISOString()}] ${msg}`);
  }
}

function stripDataUrlPrefix(base64Image: string): string {
  const match = base64Image.match(/^data:image\/\w+;base64,(.+)$/);
  return match ? match[1]! : base64Image;
}

function detectImageMediaType(base64Image: string): 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' {
  const dataUrlMatch = base64Image.match(/^data:(image\/\w+);base64,/);
  if (dataUrlMatch) {
    const type = dataUrlMatch[1];
    if (type === 'image/png' || type === 'image/gif' || type === 'image/webp') return type;
    return 'image/jpeg';
  }
  // Sniff magic bytes from the raw base64 payload when no data: URL prefix is present.
  const header = Buffer.from(base64Image.slice(0, 16), 'base64');
  if (header[0] === 0x89 && header[1] === 0x50) return 'image/png';
  if (header[0] === 0x47 && header[1] === 0x49) return 'image/gif';
  if (header[0] === 0x52 && header[1] === 0x49) return 'image/webp';
  return 'image/jpeg';
}
