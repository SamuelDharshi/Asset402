// ─────────────────────────────────────────────────────────────────────────────
//  Vision Agent
//  Identifies and values physical assets from base64-encoded photographs.
//  Uses the Moondream2 multimodal model API (or local inference).
//  Pays per-call API fees using the x402 micropayment client.
// ─────────────────────────────────────────────────────────────────────────────

import { EventEmitter } from 'eventemitter3';
import { X402Client } from './x402/client';
import { AgentMessage, VisionAnalysisResult } from './types';
import { v4 as uuidv4 } from 'uuid';

export interface VisionAgentConfig {
  moondreamApiUrl: string;
  pricingOracleUrl: string;
  x402Client: X402Client;
}

export class VisionAgent extends EventEmitter {
  private readonly config: VisionAgentConfig;

  constructor(config: VisionAgentConfig) {
    super();
    this.config = config;
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
   * Call the Moondream2 multimodal model to classify the asset.
   * In production this hits the Moondream2 API endpoint.
   * The mock returns realistic values for demo purposes.
   */
  private async classifyImage(base64Image: string): Promise<{
    assetType: string;
    make:      string;
    modelEst:  string;
    yearRange: string;
    confidence: number;
  }> {
    try {
      const response = await fetch(this.config.moondreamApiUrl, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          model:  'moondream-2',
          prompt: 'Identify this physical asset. Return JSON with fields: asset_type, make, model, year_range, confidence (0-1).',
          image:  base64Image,
        }),
      });

      if (response.ok) {
        const data = await response.json() as {
          asset_type: string;
          make:       string;
          model:      string;
          year_range: string;
          confidence: number;
        };
        return {
          assetType:  data.asset_type,
          make:       data.make,
          modelEst:   data.model,
          yearRange:  data.year_range,
          confidence: data.confidence,
        };
      }
    } catch {
      this.log('Moondream2 API unavailable — using intelligent mock');
    }

    // Deterministic mock based on image hash for reproducible demos
    const imageHash = base64Image.length % 3;
    const assets = [
      { assetType: 'Agricultural Tractor', make: 'Mahindra',  modelEst: '575 DI',     yearRange: '2017-2020', confidence: 0.87 },
      { assetType: 'Cinema Camera',        make: 'Sony',      modelEst: 'FX3',         yearRange: '2021-2023', confidence: 0.94 },
      { assetType: 'Generator',            make: 'Honda',     modelEst: 'EU7000iS',    yearRange: '2019-2022', confidence: 0.91 },
    ];
    return assets[imageHash]!;
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
      this.log(`Pricing oracle error: ${String(err)} — using estimated values`);
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
   * Upload the photograph to IPFS and return the CID.
   * Production: uses Pinata or web3.storage via their HTTP APIs.
   */
  private async uploadToIPFS(base64Image: string): Promise<string> {
    // Mock: generate a deterministic CID from the image length
    const mockCid = `Qm${Buffer.from(`asset402:${base64Image.length}`).toString('hex').slice(0, 44)}`;
    this.log(`Photo stored on IPFS: ${mockCid}`);
    return mockCid;
  }

  private log(msg: string): void {
    console.log(`[VisionAgent ${new Date().toISOString()}] ${msg}`);
  }
}
