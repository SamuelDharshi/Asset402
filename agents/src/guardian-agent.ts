// ─────────────────────────────────────────────────────────────────────────────
//  Guardian Agent
//  Monitors asset condition every 72 hours.
//  Triggers the Vision Agent for re-analysis and calls Odra contract.update_condition().
// ─────────────────────────────────────────────────────────────────────────────

import cron from 'node-cron';
import { EventEmitter } from 'eventemitter3';
import { VisionAgent }  from './vision-agent';
import { AgentMessage, AssetMetadata } from './types';
import { v4 as uuidv4 } from 'uuid';

export interface GuardianAgentConfig {
  visionAgent:    VisionAgent;
  backendUrl:     string;
  checkIntervalH: number;    // default 72
}

export interface ConditionCheckResult {
  assetId:       number;
  prevScore:     number;
  newScore:      number;
  prevValuation: number;
  newValuation:  number;
  action:        'NO_CHANGE' | 'UPDATED' | 'RISK_FLAG';
  contractTxHash?: string;
}

export class GuardianAgent extends EventEmitter {
  private readonly config: GuardianAgentConfig;
  private cronTask: cron.ScheduledTask | null = null;

  constructor(config: GuardianAgentConfig) {
    super();
    this.config = config;
  }

  /** Start the recurring 72-hour guardian check. */
  start(): void {
    if (this.cronTask) return;
    // Convert hours to cron expression
    const h   = this.config.checkIntervalH;
    const exp = h <= 1 ? '0 * * * *' : `0 */${h} * * *`;
    this.log(`Guardian starting — checking every ${h} hour(s)`);
    this.cronTask = cron.schedule(exp, () => void this.runAllChecks());
  }

  stop(): void {
    this.cronTask?.stop();
    this.cronTask = null;
    this.log('Guardian stopped');
  }

  /** Run a condition check for a single asset. */
  async checkAsset(
    asset:       AssetMetadata,
    newPhotoB64: string,
    /** Optional rental close data — triggers CUC issuance */
    rentalClose?: { rentalHours: number; renterAddress: string },
  ): Promise<ConditionCheckResult> {
    this.log(`Checking asset #${asset.assetId} (${asset.assetType})`);

    // Re-run Vision Agent on the new photo
    const newVision = await this.config.visionAgent.analysePhoto(newPhotoB64);
    const newValMid = (newVision.valueUsdLow + newVision.valueUsdHigh) / 2;

    const scoreDelta = newVision.conditionScore - asset.conditionScore;
    let action: ConditionCheckResult['action'] = 'NO_CHANGE';
    let contractTxHash: string | undefined;

    if (Math.abs(scoreDelta) > 5) {
      // Significant change — update on-chain
      action = 'UPDATED';
      try {
        const res = await fetch(`${this.config.backendUrl}/api/v1/assets/update-condition`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            assetId:         asset.assetId,
            newConditionScore: newVision.conditionScore,
            newValuationUsd:   Math.round(newValMid),
            newPhotoHash:      newVision.ipfsHash,
          }),
        });
        if (res.ok) {
          const data = await res.json() as { deployHash: string };
          contractTxHash = data.deployHash;
          this.log(`Condition updated on-chain: tx ${contractTxHash}`);
        }
      } catch (err) {
        this.log(`Contract update failed: ${String(err)}`);
      }

      // Flag to Risk Agent if degradation > 15%
      if (scoreDelta < -15) {
        action = 'RISK_FLAG';
        this.log(`⚠️  Asset #${asset.assetId} condition degraded by ${Math.abs(scoreDelta)} points — Risk Agent notified`);
      }
    }

    // ── Issue Carbon Use Credits on rental close ─────────────────────────────
    if (rentalClose && rentalClose.rentalHours > 0) {
      const rentalHoursTenths = Math.round(rentalClose.rentalHours * 10);
      const assetTypeCode = this.assetTypeCode(asset.assetType);
      try {
        const cucRes = await fetch(`${this.config.backendUrl}/api/v1/carbon/issue`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({
            assetType:           asset.assetType,
            rentalHours:         rentalClose.rentalHours,
            rentalHoursTenths,
            assetTypeCode,
            owner:   asset.owner,
            renter:  rentalClose.renterAddress,
          }),
        });
        if (cucRes.ok) {
          const d = await cucRes.json() as { cucOwner: number; cucRenter: number; txHash: string };
          this.log(`🍃 CUC issued: ${d.cucOwner} milliCUC → owner, ${d.cucRenter} milliCUC → renter (tx ${d.txHash})`);
          this.emit('cuc_issued', {
            eventType: 'CUC_ISSUED' as const,
            source:    'GuardianAgent',
            timestamp: Date.now(),
            payload:   { assetId: asset.assetId, cucOwner: d.cucOwner, cucRenter: d.cucRenter, txHash: d.txHash },
            traceId:   uuidv4(),
          } satisfies AgentMessage<{ assetId: number; cucOwner: number; cucRenter: number; txHash: string }>);
        }
      } catch (err) {
        this.log(`CUC issuance failed: ${String(err)}`);
      }

      // ── Score the renter's session reputation on-chain ────────────────────
      // Heuristic (not specified further by the PRD): a session that leaves
      // the asset's condition unchanged or improved scores 100; each point
      // of degradation beyond the normal ±5 noise band costs 4 reputation
      // points, floored at 0.
      const degradation = Math.max(0, -scoreDelta - 5);
      const sessionScore = Math.max(0, 100 - degradation * 4);
      try {
        const repRes = await fetch(`${this.config.backendUrl}/api/v1/rentals/rate`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ address: rentalClose.renterAddress, sessionScore }),
        });
        if (repRes.ok) {
          const d = await repRes.json() as { txHash: string };
          this.log(`Renter reputation scored ${sessionScore}/100 (tx ${d.txHash})`);
        }
      } catch (err) {
        this.log(`Reputation update failed: ${String(err)}`);
      }
    }

    const result: ConditionCheckResult = {
      assetId:       asset.assetId,
      prevScore:     asset.conditionScore,
      newScore:      newVision.conditionScore,
      prevValuation: asset.valuationUsd,
      newValuation:  Math.round(newValMid),
      action,
      contractTxHash,
    };

    this.emit('condition_checked', {
      eventType: 'CONDITION_CHECKED' as const,
      source:    'GuardianAgent',
      timestamp: Date.now(),
      payload:   result,
      traceId:   uuidv4(),
    } satisfies AgentMessage<ConditionCheckResult>);

    return result;
  }

  /** Fetch all active assets and trigger condition checks (production path). */
  private async runAllChecks(): Promise<void> {
    try {
      const res = await fetch(`${this.config.backendUrl}/api/v1/assets?status=Listed,Rented,Locked`);
      if (!res.ok) return;
      const assets = await res.json() as AssetMetadata[];
      this.log(`Running guardian check for ${assets.length} active asset(s)`);
      for (const asset of assets) {
        const photoB64 = await this.fetchStoredPhoto(asset);
        if (!photoB64) {
          this.log(`Skipping scheduled vision recheck for asset #${asset.assetId} — no photo available since last capture`);
          continue;
        }
        await this.checkAsset(asset, photoB64);
      }
    } catch (err) {
      this.log(`Guardian batch check error: ${String(err)}`);
    }
  }

  /**
   * Fetches the asset's most recently stored photo (by IPFS hash) and
   * returns it as a base64 string for re-analysis. Returns null — never a
   * placeholder — if no real photo can be retrieved, so callers can honestly
   * skip that asset's scheduled check instead of pretend-analyzing nothing.
   */
  private async fetchStoredPhoto(asset: AssetMetadata): Promise<string | null> {
    if (!asset.ipfsPhotoHash) return null;
    try {
      const gatewayUrl = `https://ipfs.io/ipfs/${asset.ipfsPhotoHash}`;
      const res = await fetch(gatewayUrl);
      if (!res.ok) return null;
      const buf = Buffer.from(await res.arrayBuffer());
      return buf.toString('base64');
    } catch (err) {
      this.log(`Could not fetch stored photo for asset #${asset.assetId}: ${String(err)}`);
      return null;
    }
  }

  private assetTypeCode(assetType: string): number {
    const codes: Record<string, number> = {
      'Agricultural Tractor': 1, 'Excavator': 2, 'Crane': 3,
      'Generator': 4, 'CNC Machine': 5, 'Cinema Camera': 6,
      'Marine Vessel': 7, 'Food Truck': 8,
    };
    return codes[assetType] ?? 0;
  }

  private log(msg: string): void {
    console.log(`[GuardianAgent ${new Date().toISOString()}] ${msg}`);
  }
}
