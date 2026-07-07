'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useClick, CONTRACTS } from '@/lib/casper-click';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { CursorGlow } from '@/components/cursor-glow';
import { Coins, Wallet, Leaf, TrendingUp, Wrench, Zap } from 'lucide-react';

const BACKEND = '';

interface OwnerAsset {
  assetId: number;
  assetType: string;
  make?: string;
  modelEst?: string;
  status: string;
  conditionScore: number;
  valuationUsd: number;
  loan: { status: string; remainingMotes: string; principalMotes: string } | null;
  rental: { status: string; ratePerMinute: string; totalStreamed: string } | null;
}

interface OwnerSummary {
  address: string;
  lifetimeEarnedCspr: number;
  todayDeltaCspr: number;
  activeLoans: number;
  carbonCreditsEarned: number;
  assets: OwnerAsset[];
}

const STATUS_BADGE: Record<string, { label: string; color: string }> = {
  Rented:      { label: '● RENTED — streaming now', color: '#4ADE80' },
  Listed:      { label: '○ LISTED', color: '#FFE500' },
  Idle:        { label: '○ IDLE', color: '#9E9EAF' },
  Locked:      { label: '🔒 LOCKED (collateral)', color: '#F87171' },
  Fractional:  { label: '◑ FRACTIONAL', color: '#60A5FA' },
  Maintenance: { label: '🔧 MAINTENANCE', color: '#FB923C' },
};

export default function DashboardPage() {
  const { isConnected, activeAccount } = useClick();
  const [summary, setSummary] = useState<OwnerSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Falls back to the known demo/deployer address when no wallet is
  // connected, so the dashboard shows real backend-derived data for that
  // real address rather than a client-side fabricated placeholder.
  const address = activeAccount ?? CONTRACTS.deployer;

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${BACKEND}/api/v1/owner/${address}/summary`);
        if (!res.ok) throw new Error(`Backend returned ${res.status}`);
        const data = await res.json();
        if (!cancelled) setSummary(data);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load dashboard');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [address]);

  return (
    <main className="relative min-h-screen overflow-hidden scanlines bg-background text-foreground">
      <CursorGlow />
      <div className="relative z-10">
        <Header />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-32 pb-16">
          <div className="space-y-4 mb-10 animate-fade-in-up">
            <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-primary">
              <Zap className="h-4 w-4" /> Owner Dashboard
            </div>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
              {isConnected ? 'Your Assets' : 'Demo Portfolio'}
            </h1>
            <p className="max-w-2xl text-sm text-muted-foreground font-mono">
              {address.slice(0, 10)}...{address.slice(-6)}
              {!isConnected && ' — connect your wallet to see your own portfolio'}
            </p>
          </div>

          {loading && (
            <div className="rounded-xl border border-border bg-card/30 p-8 text-center text-muted-foreground font-mono text-sm animate-pulse">
              Loading portfolio from the backend...
            </div>
          )}

          {error && !loading && (
            <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-6 text-destructive font-mono text-sm">
              Could not load dashboard data: {error}
            </div>
          )}

          {summary && !loading && !error && (
            <>
              {/* Portfolio Overview */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-12 animate-fade-in-up stagger-2">
                <StatCard icon={<Coins className="h-4 w-4" />} label="Lifetime Earned" value={`${summary.lifetimeEarnedCspr.toFixed(4)} CSPR`} />
                <StatCard icon={<Wallet className="h-4 w-4" />} label="Active Loans" value={`${summary.activeLoans}`} />
                <StatCard icon={<TrendingUp className="h-4 w-4" />} label="Today" value={`+${summary.todayDeltaCspr.toFixed(4)} CSPR`} accent />
                <StatCard icon={<Leaf className="h-4 w-4" />} label="Carbon Credits" value={`${summary.carbonCreditsEarned} CUC`} />
              </div>

              {/* Asset List */}
              <div className="space-y-4 animate-fade-in-up stagger-3">
                <h2 className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                  My Assets ({summary.assets.length})
                </h2>

                {summary.assets.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border bg-card/20 p-10 text-center">
                    <p className="text-muted-foreground mb-4">No assets registered to this address yet.</p>
                    <Link href="/onboard" className="inline-block rounded-lg border border-primary bg-primary/10 px-5 py-2.5 font-mono text-xs text-primary hover:bg-primary hover:text-primary-foreground transition-colors">
                      + Register Asset
                    </Link>
                  </div>
                ) : (
                  summary.assets.map((asset) => {
                    const badge = STATUS_BADGE[asset.status] ?? STATUS_BADGE.Idle;
                    return (
                      <div key={asset.assetId} className="rounded-xl border border-border bg-card/30 p-5 glass hover-lift">
                        <div className="flex items-center justify-between flex-wrap gap-3">
                          <div>
                            <div className="font-bold text-base">
                              {asset.make ? `${asset.make} ${asset.modelEst ?? ''}` : asset.assetType}
                            </div>
                            <div className="font-mono text-[11px] mt-1" style={{ color: badge.color }}>{badge.label}</div>
                          </div>
                          <div className="flex items-center gap-6 font-mono text-xs text-muted-foreground">
                            <div>Condition: <span className="text-foreground font-bold">{asset.conditionScore}/100</span></div>
                            <div>Value: <span className="text-foreground font-bold">${asset.valuationUsd.toLocaleString()}</span></div>
                            {asset.loan && (
                              <div>Loan: <span className="text-foreground font-bold">{asset.loan.status}</span></div>
                            )}
                          </div>
                        </div>
                        {asset.status === 'Maintenance' && (
                          <div className="mt-3 flex items-center gap-2 text-orange-400 text-xs font-mono">
                            <Wrench className="h-3.5 w-3.5" /> Maintenance in progress —
                            <Link href="/maintenance" className="underline">view details</Link>
                          </div>
                        )}
                        {asset.rental?.status === 'Active' && (
                          <div className="mt-3">
                            <Link href={`/rental/${asset.assetId}/live`} className="text-primary text-xs font-mono underline">
                              View live streaming income →
                            </Link>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              <div className="mt-10 text-center">
                <Link href="/onboard" className="inline-block rounded-lg border border-primary bg-primary/10 px-6 py-3 font-mono text-xs text-primary hover:bg-primary hover:text-primary-foreground transition-colors">
                  + Register Asset
                </Link>
              </div>
            </>
          )}
        </div>

        <Footer />
      </div>
    </main>
  );
}

function StatCard({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-card/40 p-5 glass">
      <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
        {icon} {label}
      </div>
      <div className={`font-mono text-xl font-bold ${accent ? 'text-[#4ADE80]' : 'text-primary'}`}>{value}</div>
    </div>
  );
}
