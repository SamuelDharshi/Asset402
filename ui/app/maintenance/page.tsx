'use client';
import React, { useState, useEffect } from 'react';
import { useClick } from '../../lib/casper-click';
import { Header } from '../../components/header';
import { Footer } from '../../components/footer';
import { CursorGlow } from '../../components/cursor-glow';
import { Zap, Wrench, ShieldCheck, Activity } from 'lucide-react';

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

interface MaintenancePrediction {
  asset_id:          number;
  asset_type:        string;
  name:              string;
  status:            'OK' | 'DUE_SOON' | 'OVERDUE';
  hours_operated:    number;
  service_interval_h: number;
  hours_until_service: number;
  nearest_provider:  {
    name:        string;
    rating:      number;
    distance_km: number;
    cost_usd:    number;
  } | null;
}

const FALLBACK_DATA: MaintenancePrediction[] = [
  {
    asset_id: 3, asset_type: 'Generator', name: 'Caterpillar XQ230 Generator',
    status: 'OVERDUE', hours_operated: 162, service_interval_h: 150, hours_until_service: -12,
    nearest_provider: { name: 'PowerGen Services Dubai', rating: 4.9, distance_km: 18, cost_usd: 420 },
  },
  {
    asset_id: 1, asset_type: 'Excavator', name: 'Komatsu PC88 Excavator',
    status: 'DUE_SOON', hours_operated: 478, service_interval_h: 500, hours_until_service: 22,
    nearest_provider: { name: 'Komatsu Care Network', rating: 4.8, distance_km: 12, cost_usd: 850 },
  },
  {
    asset_id: 4, asset_type: 'Cinema Camera', name: 'RED Monstro Cinema Camera Kit',
    status: 'OK', hours_operated: 85, service_interval_h: 200, hours_until_service: 115,
    nearest_provider: null,
  },
];

const STATUS_CONFIG = {
  OK:        { label: '✅ OK',        color: '#4ADE80', bg: 'rgba(74,222,128,0.1)',  border: 'rgba(74,222,128,0.3)' },
  DUE_SOON:  { label: '⚠️ DUE SOON', color: '#FFE500', bg: 'rgba(255,229,0,0.1)',  border: 'rgba(255,229,0,0.3)' },
  OVERDUE:   { label: '🔴 OVERDUE',  color: '#F87171', bg: 'rgba(248,113,113,0.1)', border: 'rgba(248,113,113,0.3)' },
};

export default function MaintenancePage() {
  const { isConnected, activeAccount, connect, signMessage } = useClick();
  const [assets, setAssets] = useState<MaintenancePrediction[]>(FALLBACK_DATA);
  const [loading, setLoading]  = useState(true);
  const [approving, setApproving] = useState<number | null>(null);
  const [approved, setApproved] = useState<Set<number>>(new Set());
  const [signatures, setSignatures] = useState<Record<number, string>>({});

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${BACKEND}/api/v1/maintenance/status`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.assets) && data.assets.length > 0) {
            setAssets(data.assets);
          }
        }
      } catch {
        // Backend unavailable — use fallback demo data
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleApprove = async (assetId: number, provider: MaintenancePrediction['nearest_provider']) => {
    if (!provider) return;
    if (!isConnected) { await connect(); return; }
    setApproving(assetId);
    const address = activeAccount ?? 'demo-account';
    const message = `Approve maintenance booking: asset #${assetId} — ${provider.name} — $${provider.cost_usd} USD`;
    try {
      const { signature } = await signMessage(message);
      await fetch(`${BACKEND}/api/v1/maintenance/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ asset_id: assetId, approved_by: address, signature }),
      }).catch(() => {});
      setApproved(prev => new Set([...prev, assetId]));
      setSignatures(prev => ({ ...prev, [assetId]: signature.slice(0, 20) + '...' }));
    } catch (e) {
      console.warn('Approval failed:', e);
    } finally {
      setApproving(null);
    }
  };

  const needsAttention = assets.filter(a => a.status !== 'OK');
  const healthy = assets.filter(a => a.status === 'OK');

  return (
    <main className="relative min-h-screen overflow-hidden scanlines bg-background text-foreground">
      <CursorGlow />
      <div className="relative z-10">
        <Header />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-32 pb-16">
          {/* Hero */}
          <div className="space-y-4 mb-12 animate-fade-in-up">
            <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-primary">
              <Wrench className="h-4 w-4" /> AI Operations
            </div>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
              Maintenance Oracle
            </h1>
            <p className="max-w-3xl text-base sm:text-lg text-muted-foreground leading-relaxed">
              Active telemetry agent monitoring operational thresholds. 
              Review predicted schedule intervals and sign off bookings gaslessly using Casper EIP-712 signatures.
            </p>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-12 animate-fade-in-up stagger-2">
            {[
              { label: 'Total Assets Monitored', value: loading ? '…' : assets.length.toString(), color: 'text-primary' },
              { label: 'Needs Maintenance', value: loading ? '…' : needsAttention.length.toString(), color: needsAttention.length > 0 ? 'text-destructive' : 'text-primary' },
              { label: 'Operational status', value: 'Active', color: 'text-primary' },
            ].map((stat, i) => (
              <div key={i} className="rounded-xl border border-border bg-card/40 p-6 glass hover-lift">
                <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground mb-2">{stat.label}</div>
                <div className={`font-mono text-3xl font-extrabold ${stat.color}`}>{stat.value}</div>
              </div>
            ))}
          </div>

          {/* Needs Attention */}
          {needsAttention.length > 0 && (
            <div className="mb-12 animate-fade-in-up stagger-3">
              <h2 className="text-xl font-bold tracking-tight text-primary mb-6 flex items-center gap-3">
                <Activity className="h-5 w-5 text-primary animate-pulse" /> Pending Approvals
              </h2>
              <div className="flex flex-col gap-5">
                {needsAttention.map(asset => (
                  <MaintenanceCard 
                    key={asset.asset_id} 
                    asset={asset} 
                    approved={approved.has(asset.asset_id)} 
                    signature={signatures[asset.asset_id]} 
                    approving={approving === asset.asset_id} 
                    onApprove={() => handleApprove(asset.asset_id, asset.nearest_provider)} 
                  />
                ))}
              </div>
            </div>
          )}

          {/* Healthy */}
          {healthy.length > 0 && (
            <div className="animate-fade-in-up stagger-4">
              <h2 className="text-xl font-bold tracking-tight text-muted-foreground mb-6">
                ✅ Operational & Healthy
              </h2>
              <div className="flex flex-col gap-5">
                {healthy.map(asset => (
                  <MaintenanceCard 
                    key={asset.asset_id} 
                    asset={asset} 
                    approved={false} 
                    signature={undefined} 
                    approving={false} 
                    onApprove={() => {}} 
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        <Footer />
      </div>
    </main>
  );
}

function MaintenanceCard({
  asset, approved, signature, approving, onApprove,
}: {
  asset: MaintenancePrediction;
  approved: boolean;
  signature?: string;
  approving: boolean;
  onApprove: () => void;
}) {
  const cfg = STATUS_CONFIG[asset.status];
  const pct = Math.min(100, Math.round((asset.hours_operated / asset.service_interval_h) * 100));

  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-card/30 p-6 sm:p-7 glass flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex-1 space-y-4 min-w-0">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="font-mono text-sm font-semibold text-primary">
            Asset #{asset.asset_id}
          </span>
          <span className="font-mono text-xs text-muted-foreground">·</span>
          <span className="font-mono text-xs text-muted-foreground uppercase tracking-widest">{asset.asset_type}</span>
          <span 
            className="ml-auto sm:ml-0 font-mono text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full border"
            style={{ color: cfg.color, borderColor: cfg.border, backgroundColor: cfg.bg }}
          >
            {cfg.label}
          </span>
        </div>

        <div>
          <h3 className="text-lg font-bold tracking-tight mb-2">
            {asset.name}
          </h3>
          {/* Progress bar */}
          <div className="space-y-2">
            <div className="flex justify-between font-mono text-xs text-muted-foreground">
              <span>Operated: <strong className="text-foreground">{asset.hours_operated}h</strong></span>
              <span>Interval Limit: <strong className="text-foreground">{asset.service_interval_h}h</strong></span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-secondary/80 relative">
              <div 
                className="h-full rounded-full transition-all duration-750 ease-out"
                style={{ 
                  width: `${pct}%`, 
                  backgroundColor: pct >= 100 ? '#F87171' : pct >= 85 ? '#FFE500' : '#4ADE80' 
                }}
              />
            </div>
            <div className="font-mono text-[10px] text-muted-foreground">
              {asset.status === 'OVERDUE' ? `Overdue by ${Math.abs(asset.hours_until_service)}h` : `${asset.hours_until_service}h remaining until threshold`}
            </div>
          </div>
        </div>
      </div>

      {asset.nearest_provider && asset.status !== 'OK' && (
        <div className="rounded-xl border border-border/80 bg-secondary/40 p-5 min-w-[280px] space-y-4 font-mono text-xs">
          <div className="uppercase tracking-wider text-muted-foreground">Recommended Provider</div>
          <div className="space-y-1">
            <div className="font-semibold text-foreground text-sm">{asset.nearest_provider.name}</div>
            <div className="text-muted-foreground">Rating: ★ {asset.nearest_provider.rating} · {asset.nearest_provider.distance_km}km distance</div>
            <div className="text-primary font-bold">Est. Cost: ${asset.nearest_provider.cost_usd} USD</div>
          </div>

          {approved ? (
            <div className="space-y-2 pt-2 border-t border-border/20">
              <div className="text-primary font-bold flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" /> Booking Signed
              </div>
              {signature && <div className="text-[10px] text-muted-foreground truncate">Sig: {signature}</div>}
            </div>
          ) : (
            <button
              onClick={onApprove}
              disabled={approving}
              className="w-full relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-lg border border-primary bg-primary/10 py-3.5 font-mono text-xs text-primary transition-all duration-500 hover:bg-primary hover:text-primary-foreground active:scale-[0.98] disabled:opacity-50"
            >
              {approving ? 'Signing Booking...' : '✍️ Approve Booking'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
