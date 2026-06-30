// ─────────────────────────────────────────────────────────────────────────────
//  CSPR.cloud SSE Hook
//  Subscribes to real-time Casper contract events and syncs database records.
//  Reference: https://event-store-api-clarinet-08.devxdao.com/events/main
// ─────────────────────────────────────────────────────────────────────────────

import EventSource from 'eventsource';
import { assetRepo, loanRepo, rentalRepo, logRepo } from '../db/supabase';

const CSPR_CLOUD_SSE = process.env['CSPR_CLOUD_SSE_URL']
  ?? 'https://event-store-api-clarinet-08.devxdao.com/events/main';

const CONTRACT_HASHES = {
  assetRegistry: process.env['ASSET_REGISTRY_ADDR'] ?? '',
  lendingPool:   process.env['LENDING_POOL_ADDR']   ?? '',
  rentalEscrow:  process.env['RENTAL_ESCROW_ADDR']  ?? '',
};

// ── Event Type Definitions ───────────────────────────────────────────────────

interface CasperNodeEvent {
  DeployProcessed?: {
    deploy_hash: string;
    account: string;
    timestamp: string;
    execution_result: {
      Success?: {
        effect: {
          transforms: Array<{
            key: string;
            transform: any;
          }>;
        };
      };
    };
  };
}

interface ParsedContractEvent {
  event_type:    string;
  deploy_hash:   string;
  contract_hash: string;
  data:          Record<string, unknown>;
  timestamp:     string;
}

// ── Subscriber ───────────────────────────────────────────────────────────────

export class CsprCloudSSEListener {
  private es: EventSource | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  start(): void {
    this.log('Connecting to CSPR.cloud SSE stream...');
    this.connect();
  }

  stop(): void {
    this.es?.close();
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.log('SSE listener stopped');
  }

  // ── Connection Logic ─────────────────────────────────────────────────────────

  private connect(): void {
    this.es = new EventSource(CSPR_CLOUD_SSE);

    this.es.onopen = () => {
      this.log('✅ Connected to CSPR.cloud event stream');
    };

    this.es.onmessage = (msg) => {
      try {
        const rawEvent: CasperNodeEvent = JSON.parse(msg.data as string);
        if (rawEvent.DeployProcessed?.execution_result?.Success) {
          const deployHash = rawEvent.DeployProcessed.deploy_hash;
          const timestamp  = rawEvent.DeployProcessed.timestamp;
          
          // In Casper, contract events are usually written to dictionaries or emitted as CLValues.
          // For Odra, they are written to the event dictionary. We scan transforms for our contract hashes.
          const transforms = rawEvent.DeployProcessed.execution_result.Success.effect.transforms;
          
          // Simulate extracting the parsed event from the Odra dictionary writes
          // In a full prod app, we decode the CLValue bytes here.
          const parsedEvents = this.extractOdraEvents(transforms, deployHash, timestamp);
          
          for (const event of parsedEvents) {
            void this.handleEvent(event);
          }
        }
      } catch {
        // Ignore malformed events
      }
    };

    this.es.onerror = () => {
      this.log('SSE connection error — reconnecting in 5s...');
      this.es?.close();
      this.reconnectTimer = setTimeout(() => this.connect(), 5_000);
    };
  }

  // ── Event Routing ────────────────────────────────────────────────────────────

  private extractOdraEvents(transforms: any[], deployHash: string, timestamp: string): ParsedContractEvent[] {
    const events: ParsedContractEvent[] = [];

    // Look for WriteCLValue transforms to event dictionary keys.
    // Odra emits events as dictionary entries keyed by "contract_event_<event_name>_<index>".
    // We scan transforms for any known contract hash prefix in the key.
    const knownHashPrefixes = Object.values(CONTRACT_HASHES).filter(Boolean);

    for (const tf of transforms) {
      if (tf.transform?.WriteCLValue) {
        const clVal = tf.transform.WriteCLValue;
        const key: string = tf.key ?? '';

        // Check if this key references one of our tracked contracts
        const matchesOurContract = knownHashPrefixes.some(prefix =>
          prefix.length > 0 && key.startsWith('hash-') && key.includes(prefix.slice(5))
        );

        if (!matchesOurContract) continue;

        // Parse the CLValue bytes into a readable value
        // The CLValue may be stored as a JSON object with `bytes`, `json`, or `raw` fields
        let eventData: Record<string, unknown> = {};

        if (typeof clVal === 'object') {
          // Odra events are typically serialized as JSON strings inside the CLValue
          if (clVal.json) {
            try { eventData = JSON.parse(clVal.json as string); } catch { /* ignore */ }
          } else if (clVal.bytes) {
            // For bytes-encoded values, decode from base16
            const rawBytes = Buffer.from(clVal.bytes as string, 'hex').toString('utf8');
            try { eventData = JSON.parse(rawBytes); } catch { /* fallback to raw string */ }
          }
        } else if (typeof clVal === 'string') {
          try { eventData = JSON.parse(clVal); } catch { /* ignore */ }
        }

        if (!eventData || Object.keys(eventData).length === 0) {
          // Fallback: try using the raw CLValue from the transform
          if (key.includes('AssetMinted') || key.includes('ConditionUpdated') ||
              key.includes('StatusChanged') || key.includes('RepaymentRecorded') ||
              key.includes('LoanRepaid') || key.includes('RentalStarted') ||
              key.includes('RentalClosed') || key.includes('CucIssued')) {
            eventData = { transform_key: key, raw: clVal };
          }
        }

        // Determine event type from dictionary key or data
        let eventType = (eventData as any)['event_type'] ?? (eventData as any).__variant ?? 'Unknown';
        if (eventType === 'Unknown' && key.includes('AssetMinted')) eventType = 'AssetMinted';
        if (eventType === 'Unknown' && key.includes('ConditionUpdated')) eventType = 'ConditionUpdated';
        if (eventType === 'Unknown' && key.includes('StatusChanged')) eventType = 'StatusChanged';
        if (eventType === 'Unknown' && key.includes('RepaymentRecorded')) eventType = 'RepaymentRecorded';
        if (eventType === 'Unknown' && key.includes('LoanRepaid')) eventType = 'LoanRepaid';
        if (eventType === 'Unknown' && key.includes('CucIssued')) eventType = 'CucIssued';

        if (eventType !== 'Unknown' || Object.keys(eventData).length > 0) {
          // Extract contract hash from key (format: dictionary_<contract_hash>_<key_name>)
          const contractHash = key.split('_').slice(1, 2).join('_');
          events.push({
            event_type:    eventType,
            deploy_hash:   deployHash,
            contract_hash: contractHash,
            data:          eventData,
            timestamp,
          });
        }
      }
    }

    // Also look for known event variant names in the raw transform strings (fallback for hex-encoded events)
    for (const tf of transforms) {
      const key: string = tf.key ?? '';
      const valStr = JSON.stringify(tf.transform);

      const namedEvents: Array<{ name: string; pattern: RegExp }> = [
        { name: 'AssetMinted',         pattern: /AssetMinted/i },
        { name: 'ConditionUpdated',    pattern: /ConditionUpdated/i },
        { name: 'StatusChanged',       pattern: /StatusChanged/i },
        { name: 'RepaymentRecorded',  pattern: /RepaymentRecorded/i },
        { name: 'LoanRepaid',          pattern: /LoanRepaid/i },
        { name: 'CucIssued',           pattern: /CucIssued/i },
      ];

      for (const { name, pattern } of namedEvents) {
        if (pattern.test(valStr) || pattern.test(key)) {
          // Avoid duplicates if already added above
          if (!events.some(e => e.event_type === name)) {
            events.push({
              event_type:    name,
              deploy_hash:   deployHash,
              contract_hash: knownHashPrefixes[0] ?? 'unknown',
              data:          { transform: tf.transform },
              timestamp,
            });
          }
        }
      }
    }

    return events;
  }

  private async handleEvent(event: ParsedContractEvent): Promise<void> {
    const contractHash = event.contract_hash;

    if (contractHash === CONTRACT_HASHES.assetRegistry) {
      await this.handleAssetRegistryEvent(event);
    } else if (contractHash === CONTRACT_HASHES.lendingPool) {
      await this.handleLendingPoolEvent(event);
    } else if (contractHash === CONTRACT_HASHES.rentalEscrow) {
      await this.handleRentalEscrowEvent(event);
    }
  }

  // ── AssetRegistry Events ─────────────────────────────────────────────────────

  private async handleAssetRegistryEvent(event: ParsedContractEvent): Promise<void> {
    const { event_type, data } = event;

    switch (event_type) {
      case 'AssetMinted':
        await assetRepo.upsert({
          asset_id:        data['asset_id'] as number,
          owner_address:   data['owner'] as string,
          asset_type:      data['asset_type'] as string,
          valuation_usd:   data['valuation_usd'] as number,
          status:          'Idle',
          mint_tx_hash:    event.deploy_hash,
        });
        this.log(`AssetMinted: #${data['asset_id']}`);
        break;

      case 'StatusChanged':
        await assetRepo.updateStatus(
          data['asset_id'] as number,
          data['new_status'] as 'Idle' | 'Listed' | 'Rented' | 'Locked',
        );
        this.log(`StatusChanged: #${data['asset_id']} → ${data['new_status']}`);
        break;

      case 'ConditionUpdated':
        await assetRepo.upsert({
          asset_id:        data['asset_id'] as number,
          condition_score: data['new_condition_score'] as number,
          valuation_usd:   data['new_valuation_usd'] as number,
        });
        this.log(`ConditionUpdated: #${data['asset_id']}`);
        break;
    }

    await logRepo.insert({
      agent_name:       'SSEListener',
      action_performed: `AssetRegistry:${event.event_type}`,
      payload:          data,
      tx_hash:          event.deploy_hash,
      status:           'success',
    });
  }

  // ── LendingPool Events ───────────────────────────────────────────────────────

  private async handleLendingPoolEvent(event: ParsedContractEvent): Promise<void> {
    const { event_type, data } = event;

    switch (event_type) {
      case 'LoanOriginated':
        await loanRepo.upsert({
          asset_id:         data['asset_id'] as number,
          borrower_address: data['borrower'] as string,
          principal_motes:  String(data['principal_motes']),
          remaining_motes:  String(data['principal_motes']),
          ltv_bps:          data['ltv_bps'] as number,
          status:           'Active',
          origin_tx_hash:   event.deploy_hash,
        });
        this.log(`LoanOriginated: asset #${data['asset_id']}`);
        break;

      case 'RepaymentRecorded':
        await loanRepo.updateRemaining(
          data['asset_id'] as number,
          String(data['remaining_motes']),
        );
        this.log(`RepaymentRecorded: asset #${data['asset_id']}, remaining ${data['remaining_motes']}`);
        break;

      case 'LoanRepaid':
        await loanRepo.updateRemaining(data['asset_id'] as number, '0', 'Repaid');
        this.log(`LoanRepaid: asset #${data['asset_id']} 🎉`);
        break;
    }
  }

  // ── RentalEscrow Events ──────────────────────────────────────────────────────

  private async handleRentalEscrowEvent(event: ParsedContractEvent): Promise<void> {
    const { event_type, data } = event;

    switch (event_type) {
      case 'RentalStarted':
        await rentalRepo.upsert({
          rental_id:       data['rental_id'] as number,
          asset_id:        data['asset_id'] as number,
          renter_address:  data['renter'] as string,
          owner_address:   data['owner'] as string,
          rate_per_minute: String(data['rate_per_minute']),
          status:          'Active',
          start_tx_hash:   event.deploy_hash,
        });
        this.log(`RentalStarted: #${data['rental_id']}`);
        break;

      case 'RentalClosed':
        await rentalRepo.upsert({
          rental_id:    data['rental_id'] as number,
          status:       'Closed',
          total_streamed: String(data['total_streamed']),
        });
        this.log(`RentalClosed: #${data['rental_id']}`);
        break;
    }
  }

  private log(msg: string): void {
    console.log(`[SSEListener ${new Date().toISOString()}] ${msg}`);
  }
}
