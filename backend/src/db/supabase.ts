// ─────────────────────────────────────────────────────────────────────────────
//  Supabase Client — typed database access layer
//  Falls back to local file-based database if Supabase credentials are placeholders
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const SUPABASE_URL  = process.env['SUPABASE_URL'] || '';
const SUPABASE_ANON = process.env['SUPABASE_ANON_KEY'] || '';

export const isMockDb = !SUPABASE_URL || SUPABASE_URL.includes('your-project') || !SUPABASE_ANON || SUPABASE_ANON.includes('anon');

export const supabase = !isMockDb ? createClient(SUPABASE_URL, SUPABASE_ANON) : null as any;

// ── Typed Row Interfaces ──────────────────────────────────────────────────────

export interface AssetRow {
  id:              string;
  asset_id:        number;
  owner_address:   string;
  asset_type:      string;
  make?:           string;
  model_est?:      string;
  year_range?:     string;
  valuation_usd:   number;
  condition_score: number;
  ipfs_photo_hash?: string;
  status:          'Idle' | 'Listed' | 'Rented' | 'Locked' | 'Fractional' | 'Maintenance';
  ltv_ratio?:      number;
  mint_tx_hash?:   string;
  created_at:      string;
  updated_at:      string;
}

export interface RentalRow {
  id:                string;
  rental_id:         number;
  asset_id:          number;
  renter_address:    string;
  owner_address:     string;
  rate_per_minute:   string; // NUMERIC stored as string
  rate_usd_per_hour?: number;
  duration_minutes?:  number;
  total_streamed:    string;
  status:            'Active' | 'Closed' | 'Cancelled';
  started_at:        string;
  closed_at?:        string;
  start_tx_hash?:    string;
  close_tx_hash?:    string;
}

export interface LoanRow {
  id:               string;
  asset_id:         number;
  borrower_address: string;
  principal_motes:  string;
  remaining_motes:  string;
  ltv_bps:          number;
  status:           'Active' | 'Repaid' | 'Liquidated';
  originated_at:    string;
  repaid_at?:       string;
  origin_tx_hash?:  string;
}

export interface AgentLogRow {
  id:               string;
  agent_name:       string;
  action_performed: string;
  payload?:         Record<string, unknown>;
  gas_spent?:       number;
  tx_hash?:         string;
  status:           string;
  timestamp:        string;
}

export interface MaintenanceRecordRow {
  id:            string;
  asset_id:      number;
  provider:      string;
  service_type:  string;
  cost_usd:      number;
  deposit_tx_hash: string;
  booking_ref:   string;
  status:        'Pending' | 'Confirmed' | 'Completed' | 'Cancelled';
  scheduled_at:  string;
  created_at:    string;
}

// ── Local DB Helper ──────────────────────────────────────────────────────────

interface LocalDbData {
  assets: AssetRow[];
  loans: LoanRow[];
  rentals: RentalRow[];
  agent_logs: AgentLogRow[];
  maintenance_records: MaintenanceRecordRow[];
}

const DB_FILE = path.join(__dirname, 'local_db.json');

export function readDb(): LocalDbData {
  if (!fs.existsSync(DB_FILE)) {
    const initialData: LocalDbData = {
      assets: [
        {
          id: "1", asset_id: 1, owner_address: "020394ccdb983b7b2a88486448e5d170f737a80264d32cab99a3e2a3e01f33d6cea1",
          asset_type: "Agricultural Tractor", make: "Komatsu", model_est: "Komatsu PC88 Excavator",
          valuation_usd: 184000, condition_score: 82, ipfs_photo_hash: "QmTest123",
          status: "Rented", created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
          mint_tx_hash: "e69b9da937de5ea373274a1e982cfc047818e8a8774bb2899f1e758e76e47e40"
        },
        {
          id: "2", asset_id: 2, owner_address: "020394ccdb983b7b2a88486448e5d170f737a80264d32cab99a3e2a3e01f33d6cea1",
          asset_type: "Marine Work Vessel", make: "Workboat", model_est: "Marine Work Vessel 12m",
          valuation_usd: 620000, condition_score: 90, ipfs_photo_hash: "QmTest456",
          status: "Listed", created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
          mint_tx_hash: "mock_tx_2"
        },
        {
          id: "3", asset_id: 3, owner_address: "020394ccdb983b7b2a88486448e5d170f737a80264d32cab99a3e2a3e01f33d6cea1",
          asset_type: "Heavy Generator", make: "Caterpillar", model_est: "Caterpillar XQ230 Generator",
          valuation_usd: 290000, condition_score: 88, ipfs_photo_hash: "QmTest789",
          status: "Idle", created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
          mint_tx_hash: "mock_tx_3"
        }
      ],
      loans: [
        {
          id: "1", asset_id: 1, borrower_address: "020394ccdb983b7b2a88486448e5d170f737a80264d32cab99a3e2a3e01f33d6cea1",
          principal_motes: "100000000000", remaining_motes: "74000000000", ltv_bps: 7400,
          status: "Active", originated_at: new Date().toISOString()
        }
      ],
      rentals: [
        {
          id: "1", rental_id: 101, asset_id: 1, renter_address: "020394ccdb983b7b2a88486448e5d170f737a80264d32cab99a3e2a3e01f33d6cea1",
          owner_address: "020394ccdb983b7b2a88486448e5d170f737a80264d32cab99a3e2a3e01f33d6cea1",
          rate_per_minute: "68000000", rate_usd_per_hour: 15, duration_minutes: 60,
          total_streamed: "84217000000", status: "Active", started_at: new Date().toISOString()
        }
      ],
      agent_logs: [],
      maintenance_records: []
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2));
    return initialData;
  }
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
}

export function writeDb(data: LocalDbData) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// ── Repository Helpers ────────────────────────────────────────────────────────

export const assetRepo = {
  async upsert(data: Partial<AssetRow>) {
    if (isMockDb) {
      const db = readDb();
      let existing = db.assets.find(a => a.asset_id === data.asset_id);
      if (existing) {
        Object.assign(existing, data, { updated_at: new Date().toISOString() });
      } else {
        existing = {
          id: String(Date.now()),
          asset_id: data.asset_id ?? Date.now(),
          owner_address: data.owner_address ?? '',
          asset_type: data.asset_type ?? '',
          make: data.make,
          model_est: data.model_est,
          year_range: data.year_range,
          valuation_usd: data.valuation_usd ?? 0,
          condition_score: data.condition_score ?? 100,
          ipfs_photo_hash: data.ipfs_photo_hash,
          status: data.status ?? 'Idle',
          ltv_ratio: data.ltv_ratio,
          mint_tx_hash: data.mint_tx_hash,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        db.assets.push(existing);
      }
      writeDb(db);
      return existing;
    }

    const { data: row, error } = await supabase
      .from('assets')
      .upsert(data, { onConflict: 'asset_id' })
      .select()
      .single();
    if (error) throw error;
    return row as AssetRow;
  },

  async updateStatus(assetId: number, status: AssetRow['status']) {
    if (isMockDb) {
      const db = readDb();
      const existing = db.assets.find(a => a.asset_id === assetId);
      if (existing) {
        existing.status = status;
        existing.updated_at = new Date().toISOString();
        writeDb(db);
      }
      return;
    }

    const { error } = await supabase
      .from('assets')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('asset_id', assetId);
    if (error) throw error;
  },

  async findById(assetId: number) {
    if (isMockDb) {
      const db = readDb();
      const asset = db.assets.find(a => a.asset_id === assetId);
      if (!asset) throw new Error('Asset not found');
      return asset;
    }

    const { data, error } = await supabase
      .from('assets')
      .select('*')
      .eq('asset_id', assetId)
      .single();
    if (error) throw error;
    return data as AssetRow;
  },

  async findAvailable() {
    if (isMockDb) {
      const db = readDb();
      return db.assets.filter(a => ['Idle', 'Listed', 'Rented', 'Fractional', 'Maintenance'].includes(a.status));
    }

    const { data, error } = await supabase
      .from('assets')
      .select('*')
      .in('status', ['Idle', 'Listed'])
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data as AssetRow[];
  },

  /**
   * Next sequential application-level asset ID. This is the backend's own
   * indexing sequence, not a decode of the on-chain AssetId assigned inside
   * the mint_asset deploy's emitted CES event (decoding that from raw
   * deploy effects is a documented scope boundary — see onboard route
   * comment). Under this demo's single-backend-instance assumption it
   * tracks the contract's own incrementing counter 1:1.
   */
  async nextAssetId(): Promise<number> {
    if (isMockDb) {
      const db = readDb();
      return db.assets.reduce((max, a) => Math.max(max, a.asset_id), 0) + 1;
    }

    const { data, error } = await supabase
      .from('assets')
      .select('asset_id')
      .order('asset_id', { ascending: false })
      .limit(1);
    if (error) throw error;
    return ((data?.[0]?.asset_id as number | undefined) ?? 0) + 1;
  },

  async findByOwner(ownerAddress: string) {
    if (isMockDb) {
      const db = readDb();
      return db.assets.filter(a => a.owner_address === ownerAddress);
    }

    const { data, error } = await supabase
      .from('assets')
      .select('*')
      .eq('owner_address', ownerAddress);
    if (error) throw error;
    return data as AssetRow[];
  },

  async findByStatuses(statuses: AssetRow['status'][]) {
    if (isMockDb) {
      const db = readDb();
      return db.assets.filter(a => statuses.includes(a.status));
    }

    const { data, error } = await supabase
      .from('assets')
      .select('*')
      .in('status', statuses);
    if (error) throw error;
    return data as AssetRow[];
  },
};

export const loanRepo = {
  async upsert(data: Partial<LoanRow>) {
    if (isMockDb) {
      const db = readDb();
      let existing = db.loans.find(l => l.asset_id === data.asset_id);
      if (existing) {
        Object.assign(existing, data);
      } else {
        existing = {
          id: String(Date.now()),
          asset_id: data.asset_id ?? 0,
          borrower_address: data.borrower_address ?? '',
          principal_motes: data.principal_motes ?? '0',
          remaining_motes: data.remaining_motes ?? '0',
          ltv_bps: data.ltv_bps ?? 0,
          status: data.status ?? 'Active',
          originated_at: new Date().toISOString()
        };
        db.loans.push(existing);
      }
      writeDb(db);
      return existing;
    }

    const { data: row, error } = await supabase
      .from('loans')
      .upsert(data, { onConflict: 'asset_id' })
      .select()
      .single();
    if (error) throw error;
    return row as LoanRow;
  },

  async findByAssetId(assetId: number): Promise<LoanRow | null> {
    if (isMockDb) {
      const db = readDb();
      return db.loans.find(l => l.asset_id === assetId) ?? null;
    }

    const { data, error } = await supabase
      .from('loans')
      .select('*')
      .eq('asset_id', assetId)
      .maybeSingle();
    if (error) throw error;
    return data as LoanRow | null;
  },

  async updateRemaining(assetId: number, remainingMotes: string, status?: LoanRow['status']) {
    if (isMockDb) {
      const db = readDb();
      const existing = db.loans.find(l => l.asset_id === assetId);
      if (existing) {
        existing.remaining_motes = remainingMotes;
        if (status) {
          existing.status = status;
          if (status === 'Repaid') existing.repaid_at = new Date().toISOString();
        }
        writeDb(db);
      }
      return;
    }

    const updates: Partial<LoanRow> = { remaining_motes: remainingMotes };
    if (status) {
      updates.status   = status;
      if (status === 'Repaid') updates.repaid_at = new Date().toISOString();
    }
    const { error } = await supabase
      .from('loans')
      .update(updates)
      .eq('asset_id', assetId);
    if (error) throw error;
  },
};

export const rentalRepo = {
  async upsert(data: Partial<RentalRow>) {
    if (isMockDb) {
      const db = readDb();
      let existing = db.rentals.find(r => r.rental_id === data.rental_id);
      if (existing) {
        Object.assign(existing, data);
      } else {
        existing = {
          id: String(Date.now()),
          rental_id: data.rental_id ?? Date.now(),
          asset_id: data.asset_id ?? 0,
          renter_address: data.renter_address ?? '',
          owner_address: data.owner_address ?? '',
          rate_per_minute: data.rate_per_minute ?? '0',
          total_streamed: data.total_streamed ?? '0',
          status: data.status ?? 'Active',
          started_at: new Date().toISOString()
        };
        db.rentals.push(existing);
      }
      writeDb(db);
      return existing;
    }

    const { data: row, error } = await supabase
      .from('rentals')
      .upsert(data, { onConflict: 'rental_id' })
      .select()
      .single();
    if (error) throw error;
    return row as RentalRow;
  },

  async findByAssetId(assetId: number): Promise<RentalRow | null> {
    if (isMockDb) {
      const db = readDb();
      return db.rentals.find(r => r.asset_id === assetId) ?? null;
    }

    const { data, error } = await supabase
      .from('rentals')
      .select('*')
      .eq('asset_id', assetId)
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data as RentalRow | null;
  },

  async findByRentalId(rentalId: number): Promise<RentalRow | null> {
    if (isMockDb) {
      const db = readDb();
      return db.rentals.find(r => r.rental_id === rentalId) ?? null;
    }

    const { data, error } = await supabase
      .from('rentals')
      .select('*')
      .eq('rental_id', rentalId)
      .maybeSingle();
    if (error) throw error;
    return data as RentalRow | null;
  },

  async updateStreamed(rentalId: number, totalStreamed: string) {
    if (isMockDb) {
      const db = readDb();
      const existing = db.rentals.find(r => r.rental_id === rentalId);
      if (existing) {
        existing.total_streamed = totalStreamed;
        writeDb(db);
      }
      return;
    }

    const { error } = await supabase
      .from('rentals')
      .update({ total_streamed: totalStreamed })
      .eq('rental_id', rentalId);
    if (error) throw error;
  },

  async close(rentalId: number, totalStreamed: string) {
    if (isMockDb) {
      const db = readDb();
      const existing = db.rentals.find(r => r.rental_id === rentalId);
      if (existing) {
        existing.status = 'Closed';
        existing.closed_at = new Date().toISOString();
        existing.total_streamed = totalStreamed;
        writeDb(db);
      }
      return;
    }

    const { error } = await supabase
      .from('rentals')
      .update({ status: 'Closed', closed_at: new Date().toISOString(), total_streamed: totalStreamed })
      .eq('rental_id', rentalId);
    if (error) throw error;
  },
};

export const logRepo = {
  async insert(data: Omit<AgentLogRow, 'id' | 'timestamp'>) {
    if (isMockDb) {
      const db = readDb();
      db.agent_logs.push({
        id: String(Date.now()),
        timestamp: new Date().toISOString(),
        ...data
      });
      writeDb(db);
      return;
    }

    const { error } = await supabase.from('agent_logs').insert(data);
    if (error) throw error;
  },

  /** Recent stream_payment log entries, newest first — used for "earned today" aggregation. */
  async findRecentByAction(actionPrefix: string, limit = 500): Promise<AgentLogRow[]> {
    if (isMockDb) {
      const db = readDb();
      return db.agent_logs
        .filter(l => l.action_performed.startsWith(actionPrefix))
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, limit);
    }

    const { data, error } = await supabase
      .from('agent_logs')
      .select('*')
      .like('action_performed', `${actionPrefix}%`)
      .order('timestamp', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data as AgentLogRow[];
  },

  /** All log entries whose payload references a given assetId, newest first — the raw feed for the agent activity drawer. */
  async findByAssetId(assetId: number, limit = 50): Promise<AgentLogRow[]> {
    if (isMockDb) {
      const db = readDb();
      return db.agent_logs
        .filter(l => (l.payload as { assetId?: number } | undefined)?.assetId === assetId)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, limit);
    }

    const { data, error } = await supabase
      .from('agent_logs')
      .select('*')
      .contains('payload', { assetId })
      .order('timestamp', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data as AgentLogRow[];
  },

  /** Carbon/CUC-related log entries for a given agent, newest first. */
  async findCarbonRelated(agentName: string, limit = 50): Promise<AgentLogRow[]> {
    if (isMockDb) {
      const db = readDb();
      return db.agent_logs
        .filter(l => l.agent_name === agentName && /cuc|carbon/i.test(l.action_performed))
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, limit);
    }

    const { data, error } = await supabase
      .from('agent_logs')
      .select('*')
      .eq('agent_name', agentName)
      .or('action_performed.like.%CUC%,action_performed.like.%carbon%')
      .order('timestamp', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data as AgentLogRow[];
  },
};

export const maintenanceRepo = {
  async insert(data: Omit<MaintenanceRecordRow, 'id' | 'created_at'>) {
    if (isMockDb) {
      const db = readDb();
      const record: MaintenanceRecordRow = {
        id:            String(Date.now()),
        created_at:    new Date().toISOString(),
        ...data,
      };
      db.maintenance_records.push(record);
      writeDb(db);
      return record;
    }

    const { data: row, error } = await supabase
      .from('maintenance_records')
      .insert(data)
      .select()
      .single();
    if (error) throw error;
    return row as MaintenanceRecordRow;
  },

  async findByAssetId(assetId: number) {
    if (isMockDb) {
      const db = readDb();
      return db.maintenance_records.filter(r => r.asset_id === assetId);
    }

    const { data, error } = await supabase
      .from('maintenance_records')
      .select('*')
      .eq('asset_id', assetId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data as MaintenanceRecordRow[];
  },
};
